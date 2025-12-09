'use strict';

// Uygulama durumu
const durum = {
    kullanici: null,
    aktifVaka: null,
    vakalar: [],
    istatistikler: {},
    aramaKelime: '',
    aktifDurum: ''
};

// DOM Elementleri
const elemanlar = {
    // Sayfalar
    girisSayfasi: document.getElementById('giris-sayfasi'),
    anaSayfa: document.getElementById('ana-sayfa'),
    
    // Giriş
    girisFormu: document.getElementById('giris-formu'),
    kullaniciAdi: document.getElementById('kullanici-adi'),
    sifre: document.getElementById('sifre'),
    
    // Ana Sayfa
    hosgeldinMesaji: document.getElementById('hosgeldin-mesaji'),
    cikisButon: document.getElementById('cikis-buton'),
    
    // Menü
    menuButonlar: document.querySelectorAll('.menu-buton'),
    
    // İstatistikler
    toplamVaka: document.getElementById('toplam-vaka'),
    beklemedeVaka: document.getElementById('beklemede-vaka'),
    sigortadaVaka: document.getElementById('sigortada-vaka'),
    tahkimdeVaka: document.getElementById('tahkimde-vaka'),
    icradaVaka: document.getElementById('icrada-vaka'),
    ustasiVaka: document.getElementById('ustasi-vaka'),
    bittiVaka: document.getElementById('bitti-vaka'),
    
    // Arama
    aramaInput: document.getElementById('arama-input'),
    aramaButon: document.getElementById('arama-buton'),
    durumFiltreler: document.querySelectorAll('.durum-filtre'),
    
    // Liste
    vakaListesi: document.getElementById('vaka-listesi'),
    
    // Detay
    vakaDetay: document.getElementById('vaka-detay'),
    vakaDetayIcerik: document.getElementById('vaka-detay-icerik'),
    geriButon: document.getElementById('geri-buton'),
    
    // Yeni Vaka
    yeniVakaSayfa: document.getElementById('yeni-vaka'),
    yeniVakaFormu: document.getElementById('yeni-vaka-formu'),
    iptalButon: document.getElementById('iptal-buton'),
    
    // Modal
    dosyaYukleModal: document.getElementById('dosya-yukle-modal'),
    modalKapat: document.getElementById('modal-kapat'),
    dosyaYukleFormu: document.getElementById('dosya-yukle-formu'),
    dosyaInput: document.getElementById('dosya-input'),
    dosyaSurukleAlani: document.getElementById('dosya-surukle-alani'),
    seciliDosya: document.getElementById('secili-dosya'),
    dosyaIptal: document.getElementById('dosya-iptal'),
    
    // Admin
    adminModal: document.getElementById('admin-modal'),
    adminFormu: document.getElementById('admin-formu')
};

// API Fonksiyonları
const api = {
    async istek(yol, ayarlar = {}) {
        const varsayilanAyarlar = {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        };

        try {
            const cevap = await fetch(`/api${yol}`, {
                ...varsayilanAyarlar,
                ...ayarlar
            });

            if (!cevap.ok) {
                const hata = await cevap.json();
                throw new Error(hata.error || `HTTP ${cevap.status}`);
            }

            return await cevap.json();
        } catch (hata) {
            console.error('API Hatası:', hata);
            throw hata;
        }
    },

    async giris(kullaniciAdi, sifre) {
        return this.istek('/login', {
            method: 'POST',
            body: JSON.stringify({ username: kullaniciAdi, password: sifre })
        });
    },

    async cikis() {
        return this.istek('/logout', { method: 'POST' });
    },

    async sessionKontrol() {
        return this.istek('/session');
    },

    async adminKontrol() {
        return this.istek('/admin-check');
    },

    async adminOlustur(kullaniciAdi, sifre, isim) {
        return this.istek('/create-admin', {
            method: 'POST',
            body: JSON.stringify({ 
                username: kullaniciAdi, 
                password: sifre, 
                fullname: isim 
            })
        });
    },

    async istatistikleriGetir() {
        return this.istek('/istatistikler');
    },

    async vakalariGetir(arama = '', durum = '') {
        let yol = `/vakalar`;
        const parametreler = [];
        
        if (arama) parametreler.push(`arama=${encodeURIComponent(arama)}`);
        if (durum) parametreler.push(`durum=${encodeURIComponent(durum)}`);
        
        if (parametreler.length > 0) {
            yol += `?${parametreler.join('&')}`;
        }
        
        return this.istek(yol);
    },

    async vakaEkle(vakaData) {
        return this.istek('/vaka-ekle', {
            method: 'POST',
            body: JSON.stringify(vakaData)
        });
    },

    async vakaDetayGetir(id) {
        return this.istek(`/vaka/${id}`);
    },

    async vakaGuncelle(id, guncelleme) {
        return this.istek(`/vaka/${id}`, {
            method: 'PUT',
            body: JSON.stringify(guncelleme)
        });
    },

    async dosyaYukle(vakaId, dosya, belgeTuru) {
        const formData = new FormData();
        formData.append('dosya', dosya);
        formData.append('belge_turu', belgeTuru);

        const cevap = await fetch(`/api/dosya-yukle/${vakaId}`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!cevap.ok) {
            const hata = await cevap.json();
            throw new Error(hata.error);
        }

        return cevap.json();
    },

    async dosyaSil(id) {
        return this.istek(`/dosya-sil/${id}`, { method: 'DELETE' });
    }
};

// Yardımcı Fonksiyonlar
const yardimci = {
    formatTarih(tarihString) {
        if (!tarihString) return '';
        const tarih = new Date(tarihString);
        return tarih.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    formatPlaka(plaka) {
        if (!plaka) return '';
        return plaka.toUpperCase().replace(/(\d{2})([A-Z]{1,3})(\d{2,4})/, '$1 $2 $3');
    },

    durumRenk(durum) {
        const renkler = {
            'BEKLEMEDE': 'durum-beklemede',
            'SIGORTADA': 'durum-sigortada',
            'TAHKIMDE': 'durum-tahkimde',
            'ICRADA': 'durum-icrada',
            'USTASI': 'durum-ustasi',
            'TAMAMLANDI': 'durum-tamamlandi'
        };
        return renkler[durum] || 'durum-beklemede';
    },

    durumMetin(durum) {
        const metinler = {
            'BEKLEMEDE': 'Bekleyen',
            'SIGORTADA': 'Sigortada',
            'TAHKIMDE': 'Tahkimde',
            'ICRADA': 'İcrada',
            'USTASI': 'Ustası',
            'TAMAMLANDI': 'Tamamlandı'
        };
        return metinler[durum] || durum;
    },

    dosyaIkon(dosyaAdi) {
        if (dosyaAdi.endsWith('.pdf')) return 'file-pdf';
        if (dosyaAdi.endsWith('.doc') || dosyaAdi.endsWith('.docx')) return 'file-word';
        if (dosyaAdi.endsWith('.jpg') || dosyaAdi.endsWith('.jpeg') || dosyaAdi.endsWith('.png')) return 'file-image';
        return 'file';
    }
};

// Uygulama Fonksiyonları
const uygulama = {
    // Başlangıç
    async baslat() {
        this.eventleriBagla();
        await this.sessionKontrol();
        await this.adminKontrol();
    },

    // Event bağlama
    eventleriBagla() {
        // Giriş
        elemanlar.girisFormu.addEventListener('submit', (e) => {
            e.preventDefault();
            this.girisYap();
        });

        // Çıkış
        elemanlar.cikisButon.addEventListener('click', () => {
            this.cikisYap();
        });

        // Menü butonları
        elemanlar.menuButonlar.forEach(buton => {
            buton.addEventListener('click', (e) => {
                this.sayfaDegistir(e.currentTarget.dataset.sayfa);
            });
        });

        // Arama
        elemanlar.aramaButon.addEventListener('click', () => {
            this.vakalariListele();
        });

        elemanlar.aramaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.vakalariListele();
        });

        // Durum filtreleri
        elemanlar.durumFiltreler.forEach(filtre => {
            filtre.addEventListener('click', (e) => {
                this.durumFiltrele(e.currentTarget.dataset.durum);
            });
        });

        // Geri butonu
        elemanlar.geriButon.addEventListener('click', () => {
            this.anaSayfayaDon();
        });

        // İptal butonu
        elemanlar.iptalButon.addEventListener('click', () => {
            this.anaSayfayaDon();
        });

        // Yeni vaka formu
        elemanlar.yeniVakaFormu.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.yeniVakaEkle();
        });

        // Modal
        elemanlar.modalKapat.addEventListener('click', () => {
            this.modalGizle();
        });

        elemanlar.dosyaIptal.addEventListener('click', () => {
            this.modalGizle();
        });

        // Dosya yükleme formu
        elemanlar.dosyaYukleFormu.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.dosyaYukle();
        });

        // Dosya seçimi
        elemanlar.dosyaInput.addEventListener('change', (e) => {
            this.dosyaSecildi(e.target.files[0]);
        });

        // Sürükle bırak
        elemanlar.dosyaSurukleAlani.addEventListener('dragover', (e) => {
            e.preventDefault();
            elemanlar.dosyaSurukleAlani.style.borderColor = '#3498db';
            elemanlar.dosyaSurukleAlani.style.background = '#f8f9fa';
        });

        elemanlar.dosyaSurukleAlani.addEventListener('dragleave', () => {
            elemanlar.dosyaSurukleAlani.style.borderColor = '#ddd';
            elemanlar.dosyaSurukleAlani.style.background = 'white';
        });

        elemanlar.dosyaSurukleAlani.addEventListener('drop', (e) => {
            e.preventDefault();
            elemanlar.dosyaSurukleAlani.style.borderColor = '#ddd';
            elemanlar.dosyaSurukleAlani.style.background = 'white';
            
            if (e.dataTransfer.files.length > 0) {
                this.dosyaSecildi(e.dataTransfer.files[0]);
                elemanlar.dosyaInput.files = e.dataTransfer.files;
            }
        });

        elemanlar.dosyaSurukleAlani.addEventListener('click', () => {
            elemanlar.dosyaInput.click();
        });

        // Admin formu
        elemanlar.adminFormu.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.adminOlustur();
        });
    },

    // Session kontrolü
    async sessionKontrol() {
        try {
            const session = await api.sessionKontrol();
            
            if (session.authenticated) {
                durum.kullanici = session.user;
                this.anaSayfaGoster();
                await this.istatistikleriYukle();
                await this.vakalariListele();
            } else {
                this.girisSayfasiGoster();
            }
        } catch (hata) {
            console.error('Session kontrol hatası:', hata);
            this.girisSayfasiGoster();
        }
    },

    // Admin kontrolü
    async adminKontrol() {
        try {
            const kontrol = await api.adminKontrol();
            
            if (!kontrol.adminExists) {
                elemanlar.adminModal.classList.remove('gizli');
            } else {
                elemanlar.adminModal.classList.add('gizli');
            }
        } catch (hata) {
            console.error('Admin kontrol hatası:', hata);
        }
    },

    // Giriş yap
    async girisYap() {
        const kullaniciAdi = elemanlar.kullaniciAdi.value;
        const sifre = elemanlar.sifre.value;

        try {
            const sonuc = await api.giris(kullaniciAdi, sifre);
            
            if (sonuc.success) {
                durum.kullanici = sonuc.user;
                this.anaSayfaGoster();
                await this.istatistikleriYukle();
                await this.vakalariListele();
            } else {
                alert('Giriş başarısız: ' + sonuc.error);
            }
        } catch (hata) {
            alert('Giriş hatası: ' + hata.message);
        }
    },

    // Çıkış yap
    async cikisYap() {
        try {
            await api.cikis();
            durum.kullanici = null;
            this.girisSayfasiGoster();
        } catch (hata) {
            console.error('Çıkış hatası:', hata);
        }
    },

    // Admin oluştur
    async adminOlustur() {
        const kullaniciAdi = document.getElementById('admin-adi').value;
        const sifre = document.getElementById('admin-sifre').value;
        const isim = document.getElementById('admin-isim').value;

        try {
            await api.adminOlustur(kullaniciAdi, sifre, isim);
            elemanlar.adminModal.classList.add('gizli');
            alert('Admin kullanıcı başarıyla oluşturuldu!');
        } catch (hata) {
            alert('Admin oluşturma hatası: ' + hata.message);
        }
    },

    // Sayfa gösterme
    girisSayfasiGoster() {
        elemanlar.girisSayfasi.classList.remove('gizli');
        elemanlar.anaSayfa.classList.add('gizli');
    },

    anaSayfaGoster() {
        elemanlar.girisSayfasi.classList.add('gizli');
        elemanlar.anaSayfa.classList.remove('gizli');
        
        // Hoş geldin mesajı
        if (durum.kullanici) {
            elemanlar.hosgeldinMesaji.innerHTML = `
                <i class="fas fa-user-circle"></i>
                <span>Hoş geldiniz, ${durum.kullanici.fullname}</span>
            `;
        }
    },

    sayfaDegistir(sayfaAdi) {
        // Menü butonlarını güncelle
        elemanlar.menuButonlar.forEach(buton => {
            buton.classList.remove('aktif');
        });
        
        const aktifButon = document.querySelector(`[data-sayfa="${sayfaAdi}"]`);
        if (aktifButon) {
            aktifButon.classList.add('aktif');
        }
        
        // Sayfaları gizle
        document.querySelectorAll('.icerik-sayfa').forEach(sayfa => {
            sayfa.classList.add('gizli');
        });
        
        // İstenen sayfayı göster
        document.getElementById(sayfaAdi)?.classList.remove('gizli');
        
        // Dashboard'da istatistikleri yenile
        if (sayfaAdi === 'dashboard') {
            this.istatistikleriYukle();
        }
    },

    anaSayfayaDon() {
        this.sayfaDegistir('dashboard');
        this.vakalariListele();
    },

    // İstatistikler
    async istatistikleriYukle() {
        try {
            const istatistikler = await api.istatistikleriGetir();
            durum.istatistikler = istatistikler;
            this.istatistikleriGoster();
        } catch (hata) {
            console.error('İstatistik yükleme hatası:', hata);
        }
    },

    istatistikleriGoster() {
        const ist = durum.istatistikler;
        
        elemanlar.toplamVaka.textContent = ist.toplam || '0';
        elemanlar.beklemedeVaka.textContent = ist.beklemede || '0';
        elemanlar.sigortadaVaka.textContent = ist.devam || '0'; // Örnek eşleme
        elemanlar.tahkimdeVaka.textContent = '0'; // Bu alanı veritabanına eklemelisiniz
        elemanlar.icradaVaka.textContent = '0'; // Bu alanı veritabanına eklemelisiniz
        elemanlar.ustasiVaka.textContent = '0'; // Bu alanı veritabanına eklemelisiniz
        elemanlar.bittiVaka.textContent = ist.tamam || '0';
    },

    // Vaka listeleme
    async vakalariListele() {
        try {
            elemanlar.vakaListesi.innerHTML = `
                <div class="yukleniyor">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Vakalar yükleniyor...</p>
                </div>
            `;
            
            const vakalar = await api.vakalariGetir(durum.aramaKelime, durum.aktifDurum);
            durum.vakalar = vakalar;
            this.vakalariGoster();
        } catch (hata) {
            console.error('Vaka listeleme hatası:', hata);
            elemanlar.vakaListesi.innerHTML = `
                <div class="yukleniyor">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Vakalar yüklenirken hata oluştu</p>
                </div>
            `;
        }
    },

    vakalariGoster() {
        if (durum.vakalar.length === 0) {
            elemanlar.vakaListesi.innerHTML = `
                <div class="yukleniyor">
                    <i class="fas fa-folder-open"></i>
                    <p>Henüz vaka bulunmuyor</p>
                    <p><small>Yeni vaka eklemek için "Evrak Yükle" butonuna tıklayın</small></p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        durum.vakalar.forEach(vaka => {
            html += `
                <div class="vaka-karti" data-id="${vaka.id}">
                    <div class="vaka-baslik">
                        <span class="plaka-etiket">${yardimci.formatPlaka(vaka.plaka)}</span>
                        <span class="vaka-tarih">${yardimci.formatTarih(vaka.created_at)}</span>
                    </div>
                    
                    <div class="vaka-icerik">
                        <h4>${vaka.arac_sahibi}</h4>
                        <p class="vaka-bilgi"><strong>Dosya No:</strong> ${vaka.dosya_no}</p>
                        <p class="vaka-bilgi"><strong>Sigorta:</strong> ${vaka.sigorta_sirketi || 'Belirtilmemiş'}</p>
                        ${vaka.kaza_tarihi ? 
                            `<p class="vaka-bilgi"><strong>Kaza Tarihi:</strong> ${yardimci.formatTarih(vaka.kaza_tarihi)}</p>` : 
                            ''
                        }
                    </div>
                    
                    <div class="vaka-alt">
                        <span class="vaka-durum ${yardimci.durumRenk(vaka.durum)}">
                            ${yardimci.durumMetin(vaka.durum)}
                        </span>
                        
                        <div class="vaka-aksiyonlar">
                            <button class="aksiyon-buton" onclick="uygulama.vakaDetayGoster(${vaka.id})" title="Detaylar">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="aksiyon-buton" onclick="uygulama.dosyaYukleModalGoster(${vaka.id})" title="Dosya Yükle">
                                <i class="fas fa-upload"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        elemanlar.vakaListesi.innerHTML = html;
    },

    // Arama ve filtreleme
    durumFiltrele(yeniDurum) {
        // Filtre butonlarını güncelle
        elemanlar.durumFiltreler.forEach(filtre => {
            filtre.classList.remove('aktif');
        });
        
        const aktifFiltre = document.querySelector(`[data-durum="${yeniDurum}"]`);
        if (aktifFiltre) {
            aktifFiltre.classList.add('aktif');
        }
        
        // Durumu güncelle ve listele
        durum.aktifDurum = yeniDurum;
        this.vakalariListele();
    },

    // Yeni vaka ekleme
    async yeniVakaEkle() {
        const vakaData = {
            dosya_no: document.getElementById('dosya-no').value,
            plaka: document.getElementById('plaka').value,
            arac_sahibi: document.getElementById('arac-sahibi').value,
            telefon: document.getElementById('telefon').value,
            email: document.getElementById('email').value,
            kaza_tarihi: document.getElementById('kaza-tarihi').value,
            sigorta_sirketi: document.getElementById('sigorta-sirketi').value,
            notlar: document.getElementById('notlar').value
        };
        
        try {
            await api.vakaEkle(vakaData);
            alert('✅ Vaka başarıyla eklendi!');
            
            // Formu temizle
            elemanlar.yeniVakaFormu.reset();
            
            // Ana sayfaya dön
            this.anaSayfayaDon();
            
            // İstatistikleri ve listeyi yenile
            await this.istatistikleriYukle();
            await this.vakalariListele();
        } catch (hata) {
            alert('❌ Vaka ekleme hatası: ' + hata.message);
        }
    },

    // Vaka detayı
    async vakaDetayGoster(id) {
        try {
            const vaka = await api.vakaDetayGetir(id);
            durum.aktifVaka = vaka;
            this.vakaDetayGosterEkran(vaka);
        } catch (hata) {
            console.error('Vaka detay hatası:', hata);
            alert('Vaka detayı yüklenemedi: ' + hata.message);
        }
    },

    vakaDetayGosterEkran(vaka) {
        // Dashboard'ı gizle, detayı göster
        document.getElementById('dashboard').classList.add('gizli');
        elemanlar.vakaDetay.classList.remove('gizli');
        
        let belgelerHtml = '';
        
        if (vaka.belgeler && vaka.belgeler.length > 0) {
            belgelerHtml = `
                <div class="belgeler-bolum">
                    <h3><i class="fas fa-folder"></i> Yüklenen Belgeler</h3>
                    <div class="dosya-listesi">
                        ${vaka.belgeler.map(belge => `
                            <div class="dosya-oge">
                                <div class="dosya-ikon">
                                    <i class="fas fa-${yardimci.dosyaIkon(belge.dosya_adi)}"></i>
                                </div>
                                <div class="dosya-bilgi">
                                    <div class="dosya-adi">${belge.orijinal_adi}</div>
                                    <div class="dosya-turu">
                                        ${belge.belge_turu} • ${yardimci.formatTarih(belge.yukleme_tarihi)}
                                    </div>
                                </div>
                                <button class="aksiyon-buton" onclick="uygulama.dosyaIndir('${belge.dosya_adi}')" title="İndir">
                                    <i class="fas fa-download"></i>
                                </button>
                                <button class="aksiyon-buton" onclick="uygulama.dosyaSil(${belge.id})" title="Sil">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            belgelerHtml = `
                <div class="belgeler-bolum">
                    <h3><i class="fas fa-folder"></i> Yüklenen Belgeler</h3>
                    <p>Henüz belge yüklenmemiş</p>
                </div>
            `;
        }
        
        elemanlar.vakaDetayIcerik.innerHTML = `
            <div class="detay-baslik">
                <h2><i class="fas fa-car"></i> ${vaka.plaka} - ${vaka.arac_sahibi}</h2>
                <span class="vaka-durum ${yardimci.durumRenk(vaka.durum)}">
                    ${yardimci.durumMetin(vaka.durum)}
                </span>
            </div>
            
            <div class="detay-grid">
                <div class="detay-kutu">
                    <h4><i class="fas fa-info-circle"></i> Temel Bilgiler</h4>
                    <div class="detay-ozellik">
                        <strong>Dosya No:</strong> ${vaka.dosya_no}
                    </div>
                    <div class="detay-ozellik">
                        <strong>Plaka:</strong> ${vaka.plaka}
                    </div>
                    <div class="detay-ozellik">
                        <strong>Telefon:</strong> ${vaka.telefon || 'Belirtilmemiş'}
                    </div>
                    <div class="detay-ozellik">
                        <strong>E-posta:</strong> ${vaka.email || 'Belirtilmemiş'}
                    </div>
                    <div class="detay-ozellik">
                        <strong>Kaza Tarihi:</strong> ${vaka.kaza_tarihi ? yardimci.formatTarih(vaka.kaza_tarihi) : 'Belirtilmemiş'}
                    </div>
                </div>
                
                <div class="detay-kutu">
                    <h4><i class="fas fa-shield-alt"></i> Sigorta Bilgileri</h4>
                    <div class="detay-ozellik">
                        <strong>Şirket:</strong> ${vaka.sigorta_sirketi || 'Belirtilmemiş'}
                    </div>
                    <div class="detay-ozellik">
                        <strong>Oluşturulma:</strong> ${yardimci.formatTarih(vaka.created_at)}
                    </div>
                    <div class="detay-ozellik">
                        <strong>Oluşturan:</strong> ${vaka.olusturan || 'Belirtilmemiş'}
                    </div>
                </div>
            </div>
            
            ${vaka.notlar ? `
                <div class="detay-kutu">
                    <h4><i class="fas fa-sticky-note"></i> Notlar</h4>
                    <p>${vaka.notlar}</p>
                </div>
            ` : ''}
            
            ${belgelerHtml}
            
            <div class="form-aksiyonlar">
                <button class="buton buton-ana" onclick="uygulama.dosyaYukleModalGoster(${vaka.id})">
                    <i class="fas fa-upload"></i> Yeni Dosya Yükle
                </button>
            </div>
        `;
    },

    // Dosya yükleme modalı
    dosyaYukleModalGoster(vakaId) {
        elemanlar.dosyaYukleModal.classList.remove('gizli');
        document.getElementById('modal-vaka-id').value = vakaId;
        
        // Formu temizle
        elemanlar.dosyaYukleFormu.reset();
        elemanlar.seciliDosya.classList.add('gizli');
        elemanlar.seciliDosya.innerHTML = '';
    },

    modalGizle() {
        elemanlar.dosyaYukleModal.classList.add('gizli');
    },

    dosyaSecildi(dosya) {
        if (dosya) {
            elemanlar.seciliDosya.classList.remove('gizli');
            elemanlar.seciliDosya.innerHTML = `
                <div style="padding: 10px; background: #e9ecef; border-radius: var(--kenar-yuvarlak);">
                    <i class="fas fa-file"></i> ${dosya.name} (${(dosya.size / 1024 / 1024).toFixed(2)} MB)
                </div>
            `;
        }
    },

    async dosyaYukle() {
        const vakaId = document.getElementById('modal-vaka-id').value;
        const belgeTuru = document.getElementById('belge-turu').value;
        const dosya = elemanlar.dosyaInput.files[0];
        
        if (!dosya) {
            alert('Lütfen bir dosya seçin');
            return;
        }
        
        if (!belgeTuru) {
            alert('Lütfen belge türünü seçin');
            return;
        }
        
        try {
            await api.dosyaYukle(vakaId, dosya, belgeTuru);
            alert('✅ Dosya başarıyla yüklendi!');
            
            // Modalı kapat
            this.modalGizle();
            
            // Vaka detayını yenile
            if (durum.aktifVaka && durum.aktifVaka.id == vakaId) {
                await this.vakaDetayGoster(vakaId);
            }
        } catch (hata) {
            alert('❌ Dosya yükleme hatası: ' + hata.message);
        }
    },

    dosyaIndir(dosyaAdi) {
        window.open(`/uploads/${dosyaAdi}`, '_blank');
    },

    async dosyaSil(dosyaId) {
        if (!confirm('Bu dosyayı silmek istediğinize emin misiniz?')) {
            return;
        }
        
        try {
            await api.dosyaSil(dosyaId);
            alert('✅ Dosya başarıyla silindi!');
            
            // Vaka detayını yenile
            if (durum.aktifVaka) {
                await this.vakaDetayGoster(durum.aktifVaka.id);
            }
        } catch (hata) {
            alert('❌ Dosya silme hatası: ' + hata.message);
        }
    }
};

// Global fonksiyonlar
window.uygulama = uygulama;

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    uygulama.baslat();
});