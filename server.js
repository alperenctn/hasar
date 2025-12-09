const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Express uygulaması oluştur
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware'ler
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'gizli-anahtar-32-karakter',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        secure: false
    }
}));

// Dosya yükleme ayarları
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|jpeg|jpg|png|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Desteklenmeyen dosya türü'));
    }
});

// Veritabanı bağlantısı
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('❌ Veritabanı bağlantı hatası:', err);
    } else {
        console.log('✅ Veritabanı bağlantısı başarılı');
        createTables();
    }
});

// Tabloları oluştur
function createTables() {
    console.log('📋 Tablolar oluşturuluyor...');
    
    const tables = [
        {
            name: 'users',
            sql: `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                fullname TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        },
        {
            name: 'cases',
            sql: `CREATE TABLE IF NOT EXISTS cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dosya_no TEXT UNIQUE NOT NULL,
                plaka TEXT NOT NULL,
                arac_sahibi TEXT NOT NULL,
                telefon TEXT,
                email TEXT,
                kaza_tarihi DATE,
                sigorta_sirketi TEXT,
                durum TEXT DEFAULT 'BEKLEMEDE',
                notlar TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(created_by) REFERENCES users(id)
            )`
        },
        {
            name: 'belgeler',
            sql: `CREATE TABLE IF NOT EXISTS belgeler (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id INTEGER NOT NULL,
                belge_turu TEXT NOT NULL,
                dosya_adi TEXT NOT NULL,
                orijinal_adi TEXT NOT NULL,
                yukleyen INTEGER,
                yukleme_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(case_id) REFERENCES cases(id),
                FOREIGN KEY(yukleyen) REFERENCES users(id)
            )`
        }
    ];

    let completed = 0;
    
    tables.forEach(table => {
        db.run(table.sql, (err) => {
            if (err) {
                console.error(`❌ ${table.name} tablosu hatası:`, err.message);
            } else {
                console.log(`✅ ${table.name} tablosu hazır`);
            }
            completed++;
            
            if (completed === tables.length) {
                console.log('🎉 Tüm tablolar hazır!');
                checkAdminExists();
            }
        });
    });
}

// Admin kontrolü
function checkAdminExists() {
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) {
            console.error('❌ Admin kontrol hatası:', err.message);
        } else {
            console.log(`👥 Users tablosunda ${row.count} kayıt var`);
        }
    });
}

// Kimlik doğrulama middleware'i
function authRequired(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Giriş yapmalısınız' });
    }
    next();
}

// ==================== API ROTALARI ====================

// 1. Admin kontrolü
app.get('/api/admin-check', (req, res) => {
    console.log('🔄 /api/admin-check çağrıldı');
    
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) {
            console.error('❌ DB hatası:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        const exists = row.count > 0;
        console.log(`📊 Admin var mı? ${exists ? 'EVET' : 'HAYIR'}`);
        res.json({ adminExists: exists });
    });
});

// 2. Admin oluştur
app.post('/api/create-admin', async (req, res) => {
    console.log('📝 /api/create-admin çağrıldı');
    
    const { username, password, fullname } = req.body;
    console.log('📦 Gelen veri:', { username, password: '***', fullname });
    
    if (!username || !password || !fullname) {
        console.log('❌ Eksik alanlar');
        return res.status(400).json({ error: 'Tüm alanlar gereklidir' });
    }
    
    try {
        // Kullanıcı adı kontrolü
        db.get('SELECT id FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                console.error('❌ DB sorgu hatası:', err.message);
                return res.status(500).json({ error: err.message });
            }
            
            if (user) {
                console.log('❌ Kullanıcı zaten var:', username);
                return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
            }
            
            console.log('✅ Kullanıcı adı müsait');
            
            try {
                // Şifreyi hash'le
                const hashedPassword = await bcrypt.hash(password, 10);
                console.log('🔐 Şifre hash\'lendi');
                
                // Kullanıcıyı ekle
                db.run('INSERT INTO users (username, password, fullname) VALUES (?, ?, ?)',
                    [username, hashedPassword, fullname],
                    function(err) {
                        if (err) {
                            console.error('❌ DB insert hatası:', err.message);
                            return res.status(500).json({ error: err.message });
                        }
                        
                        console.log(`✅ Admin oluşturuldu: ${username} (ID: ${this.lastID})`);
                        res.json({ 
                            success: true, 
                            id: this.lastID,
                            message: 'Admin başarıyla oluşturuldu'
                        });
                    }
                );
            } catch (hashError) {
                console.error('❌ Hash hatası:', hashError);
                res.status(500).json({ error: 'Şifre hash\'leme hatası' });
            }
        });
    } catch (error) {
        console.error('❌ Genel hata:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// 3. Giriş yap
app.post('/api/login', async (req, res) => {
    console.log('🔑 /api/login çağrıldı');
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir' });
    }
    
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('❌ DB hatası:', err.message);
            return res.status(500).json({ error: 'Sunucu hatası' });
        }
        
        if (!user) {
            console.log('❌ Kullanıcı bulunamadı:', username);
            return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
        }
        
        try {
            const isValid = await bcrypt.compare(password, user.password);
            
            if (!isValid) {
                console.log('❌ Şifre hatalı:', username);
                return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
            }
            
            // Giriş başarılı
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.fullname = user.fullname;
            
            console.log(`✅ Giriş başarılı: ${user.fullname} (${user.username})`);
            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    fullname: user.fullname
                }
            });
            
        } catch (compareError) {
            console.error('❌ Şifre karşılaştırma hatası:', compareError);
            res.status(500).json({ error: 'Sunucu hatası' });
        }
    });
});

// 4. Çıkış yap
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 5. Session kontrolü
app.get('/api/session', (req, res) => {
    if (req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                username: req.session.username,
                fullname: req.session.fullname
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// 6. İstatistikler
app.get('/api/istatistikler', authRequired, (req, res) => {
    const queries = {
        total: 'SELECT COUNT(*) as sayi FROM cases',
        pending: 'SELECT COUNT(*) as sayi FROM cases WHERE durum = "BEKLEMEDE"',
        inProgress: 'SELECT COUNT(*) as sayi FROM cases WHERE durum = "SIGORTADA"',
        completed: 'SELECT COUNT(*) as sayi FROM cases WHERE durum = "TAMAMLANDI"',
        documents: 'SELECT COUNT(*) as sayi FROM belgeler'
    };

    const results = {};
    let completedQueries = 0;
    const totalQueries = Object.keys(queries).length;

    Object.entries(queries).forEach(([key, query]) => {
        db.get(query, (err, row) => {
            if (err) {
                console.error(`❌ ${key} sorgu hatası:`, err.message);
                results[key] = 0;
            } else {
                results[key] = row.sayi;
            }
            
            completedQueries++;
            if (completedQueries === totalQueries) {
                // Diğer istatistikleri de ekle
                results.tahkimde = 0;
                results.icrada = 0;
                results.ustasi = 0;
                res.json(results);
            }
        });
    });
});

// 7. Vakaları getir (sayfalı)
app.get('/api/vakalar', authRequired, (req, res) => {
    const arama = req.query.arama || '';
    const durumFiltre = req.query.durum || '';
    const sayfa = parseInt(req.query.sayfa) || 1;
    const sayfaBoyutu = parseInt(req.query.sayfaBoyutu) || 25;
    const siralama = req.query.siralama || 'created_at DESC';
    
    const offset = (sayfa - 1) * sayfaBoyutu;
    
    // WHERE koşulları
    let whereConditions = 'WHERE 1=1';
    const params = [];
    
    if (arama) {
        whereConditions += ` AND (c.plaka LIKE ? OR c.arac_sahibi LIKE ? OR c.dosya_no LIKE ?)`;
        const searchTerm = `%${arama}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (durumFiltre) {
        whereConditions += ` AND c.durum = ?`;
        params.push(durumFiltre);
    }
    
    // Toplam kayıt
    const countQuery = `SELECT COUNT(*) as total FROM cases c ${whereConditions}`;
    
    // Vakalar sorgusu
    const vakalarQuery = `
        SELECT c.*, u.fullname as olusturan
        FROM cases c
        LEFT JOIN users u ON c.created_by = u.id
        ${whereConditions}
        ORDER BY ${siralama}
        LIMIT ? OFFSET ?
    `;
    
    db.get(countQuery, params, (err, countResult) => {
        if (err) {
            console.error('❌ Count sorgu hatası:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        const totalRecords = countResult.total;
        const totalPages = Math.ceil(totalRecords / sayfaBoyutu);
        
        const vakalarParams = [...params, sayfaBoyutu, offset];
        
        db.all(vakalarQuery, vakalarParams, (err, vakalar) => {
            if (err) {
                console.error('❌ Vakalar sorgu hatası:', err.message);
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                vakalar: vakalar || [],
                toplamKayit: totalRecords,
                toplamSayfa: totalPages,
                suankiSayfa: sayfa,
                sayfaBoyutu: sayfaBoyutu
            });
        });
    });
});

// 8. Yeni vaka ekle
app.post('/api/vaka-ekle', authRequired, (req, res) => {
    const {
        dosya_no,
        plaka,
        arac_sahibi,
        telefon,
        email,
        kaza_tarihi,
        sigorta_sirketi,
        notlar
    } = req.body;
    
    if (!dosya_no || !plaka || !arac_sahibi) {
        return res.status(400).json({ error: 'Dosya no, plaka ve araç sahibi zorunludur' });
    }
    
    db.run(`INSERT INTO cases 
        (dosya_no, plaka, arac_sahibi, telefon, email, kaza_tarihi, sigorta_sirketi, notlar, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [dosya_no, plaka, arac_sahibi, telefon, email, kaza_tarihi, sigorta_sirketi, notlar, req.session.userId],
        function(err) {
            if (err) {
                console.error('❌ Vaka ekleme hatası:', err.message);
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(400).json({ error: 'Bu dosya numarası zaten var' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// 9. Vaka detayı
app.get('/api/vaka/:id', authRequired, (req, res) => {
    const vakaId = req.params.id;
    
    db.get('SELECT c.*, u.fullname as olusturan FROM cases c LEFT JOIN users u ON c.created_by = u.id WHERE c.id = ?',
        [vakaId], (err, vaka) => {
            if (err || !vaka) {
                return res.status(404).json({ error: 'Vaka bulunamadı' });
            }
            
            db.all('SELECT * FROM belgeler WHERE case_id = ? ORDER BY yukleme_tarihi DESC',
                [vakaId], (err, belgeler) => {
                    if (err) {
                        console.error('❌ Belgeler sorgu hatası:', err.message);
                        belgeler = [];
                    }
                    res.json({ ...vaka, belgeler });
                }
            );
        }
    );
});

// 10. Dosya yükle
app.post('/api/dosya-yukle/:caseId', authRequired, upload.single('dosya'), (req, res) => {
    const caseId = req.params.caseId;
    const { belge_turu } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ error: 'Dosya seçilmedi' });
    }
    
    if (!belge_turu) {
        return res.status(400).json({ error: 'Belge türü seçilmedi' });
    }
    
    db.run(`INSERT INTO belgeler (case_id, belge_turu, dosya_adi, orijinal_adi, yukleyen)
            VALUES (?, ?, ?, ?, ?)`,
            [caseId, belge_turu, req.file.filename, req.file.originalname, req.session.userId],
            function(err) {
                if (err) {
                    console.error('❌ Dosya yükleme hatası:', err.message);
                    return res.status(500).json({ error: err.message });
                }
                res.json({ success: true, dosya: req.file.filename });
            }
    );
});

// 11. Tüm istekleri index.html'e yönlendir
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
    console.log(`🌐 Site: ${process.env.SITE_URL || `http://localhost:${PORT}`}`);
});