const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();


// server.js'nin en başına (diğer require'ların altına) ekleyin:
console.log('📁 Mevcut dosyalar:', fs.readdirSync(__dirname));
console.log('📊 Database.db var mı?', fs.existsSync('./database.db'));

// Veritabanı bağlantısından sonra bu kodu ekleyin:
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Veritabanı bağlantı hatası:', err);
    } else {
        console.log('✅ Veritabanı bağlantısı başarılı');
        
        // Users tablosundaki kayıtları kontrol et
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
            if (err) {
                console.error('Users tablosu hatası:', err);
            } else {
                console.log(`👥 Users tablosunda ${row.count} kayıt var`);
                console.log('🔍 Admin kontrolü:', row.count > 0 ? 'Admin VAR' : 'Admin YOK');
            }
        });
    }
});
// Express uygulaması oluştur
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware'ler
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 saat
        secure: false // HTTPS için true yapın
    }
}));

// Veritabanı bağlantısı
// const db = new sqlite3.Database('./database.db', (err) => {
//     if (err) {
//         console.error('Veritabanı bağlantı hatası:', err);
//     } else {
//         console.log('✅ Veritabanı bağlantısı başarılı');
//         createTables();
//     }
// });

// Veritabanı tablolarını oluştur
function createTables() {
    db.serialize(() => {
        // Kullanıcılar tablosu
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            fullname TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Vakalar tablosu
        db.run(`CREATE TABLE IF NOT EXISTS cases (
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
        )`);

        // Belgeler tablosu
        db.run(`CREATE TABLE IF NOT EXISTS belgeler (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id INTEGER NOT NULL,
            belge_turu TEXT NOT NULL,
            dosya_adi TEXT NOT NULL,
            orijinal_adi TEXT NOT NULL,
            yukleyen INTEGER,
            yukleme_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(case_id) REFERENCES cases(id),
            FOREIGN KEY(yukleyen) REFERENCES users(id)
        )`);

        console.log('✅ Tablolar oluşturuldu');
    });
}

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
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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

// Kimlik doğrulama middleware'i
function authRequired(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Giriş yapmalısınız' });
    }
    next();
}

// API ROTALARI

// 1. Giriş yap
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
            }
            
            const sifreDogru = await bcrypt.compare(password, user.password);
            if (!sifreDogru) {
                return res.status(401).json({ error: 'Hatalı şifre' });
            }
            
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.fullname = user.fullname;
            
            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    fullname: user.fullname
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// 2. Çıkış yap
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 3. Session kontrolü
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

// 4. Admin kontrolü
app.get('/api/admin-check', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ adminExists: row.count > 0 });
    });
});

// 5. Admin oluştur
app.post('/api/create-admin', async (req, res) => {
    const { username, password, fullname } = req.body;
    
    try {
        // Önce bu kullanıcı adı var mı kontrol et
        db.get('SELECT id FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (user) {
                return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
            }
            
            // Şifreyi hash'le
            const sifreliParola = await bcrypt.hash(password, 10);
            
            // Kullanıcıyı ekle
            db.run('INSERT INTO users (username, password, fullname) VALUES (?, ?, ?)',
                [username, sifreliParola, fullname],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    console.log('✅ Yeni admin oluşturuldu:', username);
                    res.json({ 
                        success: true, 
                        id: this.lastID,
                        message: 'Admin başarıyla oluşturuldu'
                    });
                }
            );
        });
    } catch (error) {
        console.error('Admin oluşturma hatası:', error);
        res.status(500).json({ error: 'Admin oluşturma hatası' });
    }
});

// 6. İstatistikler
app.get('/api/istatistikler', authRequired, (req, res) => {
    const sorgular = {
        toplam: 'SELECT COUNT(*) as sayi FROM cases',
        beklemede: 'SELECT COUNT(*) as sayi FROM cases WHERE durum = "BEKLEMEDE"',
        devam: 'SELECT COUNT(*) as sayi FROM cases WHERE durum = "DEVAM"',
        tamam: 'SELECT COUNT(*) as sayi FROM cases WHERE durum = "TAMAMLANDI"',
        dosya: 'SELECT COUNT(*) as sayi FROM belgeler'
    };

    const sonuclar = {};
    let tamamlanan = 0;

    db.get(sorgular.toplam, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        sonuclar.toplam = row.sayi;
        tamamlanan++;
        if (tamamlanan === 5) res.json(sonuclar);
    });

    db.get(sorgular.beklemede, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        sonuclar.beklemede = row.sayi;
        tamamlanan++;
        if (tamamlanan === 5) res.json(sonuclar);
    });

    db.get(sorgular.devam, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        sonuclar.devam = row.sayi;
        tamamlanan++;
        if (tamamlanan === 5) res.json(sonuclar);
    });

    db.get(sorgular.tamam, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        sonuclar.tamam = row.sayi;
        tamamlanan++;
        if (tamamlanan === 5) res.json(sonuclar);
    });

    db.get(sorgular.dosya, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        sonuclar.dosya = row.sayi;
        tamamlanan++;
        if (tamamlanan === 5) res.json(sonuclar);
    });
});

// 7. Tüm vakaları getir
// server.js'de bulun ve değiştirin:
app.get('/api/vakalar', authRequired, (req, res) => {
    const arama = req.query.arama || '';
    const durumFiltre = req.query.durum || '';
    const sayfa = parseInt(req.query.sayfa) || 1;
    const sayfaBoyutu = parseInt(req.query.sayfaBoyutu) || 25;
    const siralama = req.query.siralama || 'created_at DESC';
    
    const offset = (sayfa - 1) * sayfaBoyutu;
    
    // WHERE koşulları
    let whereKosullari = 'WHERE 1=1';
    const parametreler = [];
    
    if (arama) {
        whereKosullari += ` AND (c.plaka LIKE ? OR c.arac_sahibi LIKE ? OR c.dosya_no LIKE ?)`;
        const aramaTerim = `%${arama}%`;
        parametreler.push(aramaTerim, aramaTerim, aramaTerim);
    }
    
    if (durumFiltre) {
        whereKosullari += ` AND c.durum = ?`;
        parametreler.push(durumFiltre);
    }
    
    // Toplam kayıt sayısı
    const saymaSorgusu = `
        SELECT COUNT(*) as toplam 
        FROM cases c 
        ${whereKosullari}
    `;
    
    // Vakalar sorgusu
    const vakalarSorgusu = `
        SELECT c.*, u.fullname as olusturan,
               (SELECT COUNT(*) FROM belgeler WHERE case_id = c.id) as belge_sayisi
        FROM cases c
        LEFT JOIN users u ON c.created_by = u.id
        ${whereKosullari}
        ORDER BY ${siralamaGuvenli(siralama)}
        LIMIT ? OFFSET ?
    `;
    
    function siralamaGuvenli(siralama) {
        const allowedColumns = ['created_at', 'plaka', 'arac_sahibi', 'durum'];
        const allowedDirections = ['ASC', 'DESC'];
        
        const parts = siralama.split(' ');
        const column = parts[0];
        const direction = parts[1] || 'ASC';
        
        if (!allowedColumns.includes(column) || !allowedDirections.includes(direction.toUpperCase())) {
            return 'created_at DESC';
        }
        
        return `${column} ${direction}`;
    }
    
    db.get(saymaSorgusu, parametreler, (err, sayim) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const toplamKayit = sayim.toplam;
        const toplamSayfa = Math.ceil(toplamKayit / sayfaBoyutu);
        
        const vakaParametreler = [...parametreler, sayfaBoyutu, offset];
        
        db.all(vakalarSorgusu, vakaParametreler, (err, vakalar) => {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({
                vakalar,
                toplamKayit,
                toplamSayfa,
                suankiSayfa: sayfa,
                sayfaBoyutu
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
    
    db.run(`INSERT INTO cases 
        (dosya_no, plaka, arac_sahibi, telefon, email, kaza_tarihi, sigorta_sirketi, notlar, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [dosya_no, plaka, arac_sahibi, telefon, email, kaza_tarihi, sigorta_sirketi, notlar, req.session.userId],
        function(err) {
            if (err) {
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
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ ...vaka, belgeler });
                }
            );
        }
    );
});

// 10. Vaka güncelle
app.put('/api/vaka/:id', authRequired, (req, res) => {
    const vakaId = req.params.id;
    const { durum, notlar } = req.body;
    
    db.run('UPDATE cases SET durum = ?, notlar = ? WHERE id = ?',
        [durum, notlar, vakaId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// 11. Dosya yükle
app.post('/api/dosya-yukle/:caseId', authRequired, upload.single('dosya'), (req, res) => {
    const caseId = req.params.caseId;
    const { belge_turu } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ error: 'Dosya seçilmedi' });
    }
    
    db.run(`INSERT INTO belgeler (case_id, belge_turu, dosya_adi, orijinal_adi, yukleyen)
            VALUES (?, ?, ?, ?, ?)`,
            [caseId, belge_turu, req.file.filename, req.file.originalname, req.session.userId],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, dosya: req.file.filename });
            }
    );
});

// 12. Dosya sil
app.delete('/api/dosya-sil/:id', authRequired, (req, res) => {
    const dosyaId = req.params.id;
    
    db.get('SELECT dosya_adi FROM belgeler WHERE id = ?', [dosyaId], (err, belge) => {
        if (err || !belge) {
            return res.status(404).json({ error: 'Dosya bulunamadı' });
        }
        
        // Dosyayı fiziksel olarak sil
        const dosyaYolu = path.join(__dirname, 'public/uploads', belge.dosya_adi);
        fs.unlink(dosyaYolu, (unlinkErr) => {
            if (unlinkErr) console.error('Dosya silinemedi:', unlinkErr);
            
            // Veritabanından sil
            db.run('DELETE FROM belgeler WHERE id = ?', [dosyaId], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
        });
    });
});

// 13. Kullanıcıları listele
app.get('/api/kullanicilar', authRequired, (req, res) => {
    db.all('SELECT id, username, fullname, created_at FROM users ORDER BY created_at DESC',
        (err, kullanicilar) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(kullanicilar);
        }
    );
});

// Tüm istekleri index.html'e yönlendir (SPA için)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
    console.log(`🌐 Site: ${process.env.SITE_URL || `http://localhost:${PORT}`}`);
});

// server.js'ye ekleyin (diğer API rotalarının yanına)
app.post('/api/reset-admin', async (req, res) => {
    const { username, newPassword } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        db.run('UPDATE users SET password = ? WHERE username = ?',
            [hashedPassword, username],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
                }
                
                res.json({ success: true, message: 'Şifre sıfırlandı' });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Şifre sıfırlama hatası' });
    }
});