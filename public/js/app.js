'use strict';

// Uygulama durumu
const durum = {
    kullanici: null,
    aktifVaka: null,
    vakalar: [],
    istatistikler: {},
    sayfaNumarasi: 1,
    sayfaBoyutu: 25,
    toplamKayit: 0,
    toplamSayfa: 1,
    siralama: 'created_at DESC',
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
    
    // Header
    kullaniciIsim: document.getElementById('kullanici-isim'),
    cikisBtn: document.getElementById('cikis-btn'),
    
    // Navigasyon
    navBtnlar: document.querySelectorAll('.nav-btn'),
    
    // İstatistikler
    toplamVaka: document.getElementById('toplam-vaka'),
    bekleyenVaka: document.getElementById('bekleyen-vaka'),
    sigortadaVaka: document.getElementById('sigortada-vaka'),
    tahkimdeVaka: document.getElementById('tahkimde-vaka'),
    icradaVaka: document.getElementById('icrada-vaka'),
    ustasiVaka: document.getElementById('ustasi-vaka'),
    bittiVaka: document.getElementById('bitti-vaka'),
    
    // Arama ve Filtreleme
    aramaInput: document.getElementById('arama-input'),
    aramaBtn: document.getElementById('arama-btn'),
    durumFiltre: document.getElementById('durum-filtre'),
    siralaFiltre: document.getElementById('sirala-filtre'),
    sayfaBoyutuSelect: document.getElementById('sayfa-boyutu'),
    
    // Tablo
    vakaTabloBody: document.getElementById('vaka-tablo-body'),
    
    // Sayfalama
    ilkSayfa: document.getElementById('ilk-sayfa'),
    oncekiSayfa: document.getElementById('onceki-sayfa'),
    sonrakiSayfa: document.getElementById('sonraki-sayfa'),
    sonSayfa: document.getElementById('son-sayfa'),
    sayfaNumaralari: document.getElementById('sayfa-numaralari'),
    sayfaBilgi: document.getElementById('sayfa-bilgi'),
    
    // FAB Butonu
    yeniDosyaBtn: document.getElementById('yeni-dosya-btn'),
    
    // Modallar
    vakaDetayModal: document.getElementById('vaka-detay-modal'),
    yeniVakaModal: document.getElementById('yeni-vaka-modal'),
    dosyaYukleModal: document.getElementById('dosya-yukle-modal'),
    adminModal: document.getElementById('admin-modal'),
    
    // Admin formu
    adminFormu: document.getElementById('admin-formu')
};

// API Fonksiyonları
const api = {
    async istek(yol, ayarlar = {}) {
        try {
            const cevap = await fetch(`/api${yol}`, {
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
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

    async vakalariSayfaliGetir(arama = '', durumFiltre = '', sayfa = 1, sayfaBoyutu = 25, siralama = 'created_at DESC') {
        let yol = `/vakalar?sayfa=${sayfa}&sayfaBoyutu=${sayfaBoyutu}&siralama=${encodeURIComponent(siralama)}`;
        
        if (arama) yol += `&arama=${encodeURIComponent(arama)}`;
        if (durumFiltre) yol += `&durum=${encodeURIComponent(durumFiltre)}`;
        
        return this.istek(yol);
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
        // Giriş formu
        if (elemanlar.girisFormu) {
            elemanlar.girisFormu.addEventListener('submit', (e) => {
                e.preventDefault();
                this.girisYap();
            });
        }

        // Çıkış butonu
        if (elemanlar.cikisBtn) {
            elemanlar.cikisBtn.addEventListener('click', () => {
                this.cikisYap();
            });
        }

        // Admin formu - BASİT VE ETKİLİ
        if (elemanlar.adminFormu) {
            elemanlar.adminFormu.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.adminOlusturBasit();
            });
        }
    },

    // Session kontrolü
    async sessionKontrol() {
        try {
            const session = await api.sessionKontrol();
            
            if (session.authenticated) {
                durum.kullanici = session.user;
                this.anaSayfaGoster();
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
                console.log('👤 Admin YOK, modal gösteriliyor');
                if (elemanlar.adminModal) {
                    elemanlar.adminModal.classList.remove('gizli');
                }
            } else {
                console.log('👤 Admin VAR, modal gizleniyor');
                if (elemanlar.adminModal) {
                    elemanlar.adminModal.classList.add('gizli');
                }
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

    // Admin oluştur - BASİT VERSİYON (KESİN ÇÖZÜM)
    async adminOlusturBasit() {
        const kullaniciAdi = document.getElementById('admin-adi').value;
        const sifre = document.getElementById('admin-sifre').value;
        const isim = document.getElementById('admin-isim').value;

        if (!kullaniciAdi || !sifre || !isim) {
            alert('Lütfen tüm alanları doldurun!');
            return;
        }

        try {
            const sonuc = await api.adminOlustur(kullaniciAdi, sifre, isim);
            
            if (sonuc.success) {
                // 1. Modalı kapat
                if (elemanlar.adminModal) {
                    elemanlar.adminModal.classList.add('gizli');
                }
                
                // 2. Sayfayı YENİLE
                setTimeout(() => {
                    window.location.href = '/';
                }, 100);
                
            } else {
                alert('Hata: ' + sonuc.error);
            }
        } catch (hata) {
            alert('Hata: ' + hata.message);
        }
    },

    // Sayfa gösterme
    girisSayfasiGoster() {
        if (elemanlar.girisSayfasi) elemanlar.girisSayfasi.classList.remove('gizli');
        if (elemanlar.anaSayfa) elemanlar.anaSayfa.classList.add('gizli');
    },

    anaSayfaGoster() {
        if (elemanlar.girisSayfasi) elemanlar.girisSayfasi.classList.add('gizli');
        if (elemanlar.anaSayfa) elemanlar.anaSayfa.classList.remove('gizli');
        
        if (durum.kullanici && elemanlar.kullaniciIsim) {
            elemanlar.kullaniciIsim.textContent = durum.kullanici.fullname;
        }
    }
};

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    uygulama.baslat();
});

// Global fonksiyonlar
window.uygulama = uygulama;