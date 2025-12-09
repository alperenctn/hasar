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
    
    // Modal kapatma butonları
    modalKapat: document.getElementById('modal-kapat'),
    yeniVakaIptal: document.getElementById('yeni-vaka-iptal'),
    dosyaModalKapat: document.getElementById('dosya-modal-kapat'),
    
    // Formlar
    yeniVakaFormu: document.getElementById('yeni-vaka-formu'),
    formIptal: document.getElementById('form-iptal'),
    dosyaYukleFormu: document.getElementById('dosya-yukle-formu'),
    dosyaIptal: document.getElementById('dosya-iptal'),
    
    // Dosya yükleme
    dosyaInput: document.getElementById('dosya-input'),
    dosyaSurukleAlani: document.getElementById('dosya-surukle-alani'),
    seciliDosya: document.getElementById('secili-dosya'),
    modalVakaId: document.getElementById('modal-vaka-id'),
    belgeTuru: document.getElementById('belge-turu'),
    
    // Admin
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

    async vakalariSayfaliGetir(arama = '', durumFiltre = '', sayfa = 1, sayfaBoyutu = 25, siralama = 'created_at DESC') {
        let yol = `/vakalar?sayfa=${sayfa}&sayfaBoyutu=${sayfaBoyutu}&siralama=${encodeURIComponent(siralama)}`;
        
        if (arama) yol += `&arama=${encodeURIComponent(arama)}`;
        if (durumFiltre) yol += `&durum=${encodeURIComponent(durumFiltre)}`;
        
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
            'BEKLEMEDE': 'status-pending',
            'SIGORTADA': 'status-insurance',
            'TAHKIMDE': 'status-arbitration',
            'ICRADA': 'status-execution',
            'USTASI': 'status-master',
            'TAMAMLANDI': 'status-completed'
        };
        return renkler[durum] || 'status-pending';
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

    // Event bağlama - DÜZELTİLMİŞ HALİ
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

        // Admin formu - DÜZELTİLDİ: direkt fonksiyon çağır
        if (elemanlar.adminFormu) {
            elemanlar.adminFormu.addEventListener('submit', (e) => {
                e.preventDefault();
                this.adminOlustur();
            });
        }

        // Arama
        if (elemanlar.aramaBtn) {
            elemanlar.aramaBtn.addEventListener('click', () => {
                this.vakalariListele();
            });
        }

        if (elemanlar.aramaInput) {
            elemanlar.aramaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.vakalariListele();
            });
        }

        // Filtreler
        if (elemanlar.durumFiltre) {
            elemanlar.durumFiltre.addEventListener('change', () => {
                durum.aktifDurum = elemanlar.durumFiltre.value;
                durum.sayfaNumarasi = 1;
                this.vakalariListele();
            });
        }

        if (elemanlar.siralaFiltre) {
            elemanlar.siralaFiltre.addEventListener('change', () => {
                durum.siralama = elemanlar.siralaFiltre.value;
                durum.sayfaNumarasi = 1;
                this.vakalariListele();
            });
        }

        if (elemanlar.sayfaBoyutuSelect) {
            elemanlar.sayfaBoyutuSelect.addEventListener('change', () => {
                durum.sayfaBoyutu = parseInt(elemanlar.sayfaBoyutuSelect.value);
                durum.sayfaNumarasi = 1;
                this.vakalariListele();
            });
        }

        // FAB butonu
        if (elemanlar.yeniDosyaBtn) {
            elemanlar.yeniDosyaBtn.addEventListener('click', () => {
                this.yeniVakaModalAc();
            });
        }

        // Diğer eventler...
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

    // Admin oluştur - DÜZELTİLMİŞ HALİ
    async adminOlustur() {
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
                alert('✅ Admin başarıyla oluşturuldu! Sayfa yenileniyor...');
                
                // Modalı kapat
                elemanlar.adminModal.classList.add('gizli');
                
                // Sayfayı yenile
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                alert('❌ Hata: ' + (sonuc.error || 'Bilinmeyen hata'));
            }
        } catch (hata) {
            console.error('Admin oluşturma hatası:', hata);
            alert('❌ Admin oluşturma hatası: ' + hata.message);
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
    },

    // Diğer fonksiyonlar kısa versiyon
    async istatistikleriYukle() {
        try {
            const istatistikler = await api.istatistikleriGetir();
            durum.istatistikler = istatistikler;
            
            if (elemanlar.toplamVaka) elemanlar.toplamVaka.textContent = istatistikler.toplam || '0';
            if (elemanlar.bekleyenVaka) elemanlar.bekleyenVaka.textContent = istatistikler.beklemede || '0';
            if (elemanlar.sigortadaVaka) elemanlar.sigortadaVaka.textContent = istatistikler.devam || '0';
            if (elemanlar.bittiVaka) elemanlar.bittiVaka.textContent = istatistikler.tamam || '0';
            
            // Diğer istatistikler varsayılan 0
            if (elemanlar.tahkimdeVaka) elemanlar.tahkimdeVaka.textContent = '0';
            if (elemanlar.icradaVaka) elemanlar.icradaVaka.textContent = '0';
            if (elemanlar.ustasiVaka) elemanlar.ustasiVaka.textContent = '0';
            
        } catch (hata) {
            console.error('İstatistik yükleme hatası:', hata);
        }
    },

    async vakalariListele() {
        try {
            if (elemanlar.vakaTabloBody) {
                elemanlar.vakaTabloBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="loading-row">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Vakalar yükleniyor...</span>
                        </td>
                    </tr>
                `;
            }
            
            const sonuc = await api.vakalariSayfaliGetir(
                elemanlar.aramaInput ? elemanlar.aramaInput.value : '',
                durum.aktifDurum,
                durum.sayfaNumarasi,
                durum.sayfaBoyutu,
                durum.siralama
            );
            
            durum.vakalar = sonuc.vakalar || [];
            durum.toplamKayit = sonuc.toplamKayit || 0;
            durum.toplamSayfa = sonuc.toplamSayfa || 1;
            
            this.vakalariTablodaGoster();
            this.sayfalamaKontrolleriniGuncelle();
            
        } catch (hata) {
            console.error('Vaka listeleme hatası:', hata);
            if (elemanlar.vakaTabloBody) {
                elemanlar.vakaTabloBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="loading-row">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Vakalar yüklenirken hata oluştu</span>
                        </td>
                    </tr>
                `;
            }
        }
    },

    vakalariTablodaGoster() {
        if (!elemanlar.vakaTabloBody) return;
        
        const tbody = elemanlar.vakaTabloBody;
        
        if (durum.vakalar.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-row">
                        <i class="fas fa-folder-open"></i>
                        <span>Henüz vaka bulunmuyor</span>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        
        durum.vakalar.forEach(vaka => {
            html += `
                <tr>
                    <td>${yardimci.formatTarih(vaka.created_at)}</td>
                    <td><strong>${yardimci.formatPlaka(vaka.plaka)}</strong></td>
                    <td>${vaka.arac_sahibi}</td>
                    <td>${vaka.dosya_no}</td>
                    <td>${vaka.sigorta_sirketi || '-'}</td>
                    <td>${vaka.usta || 'Atanmadı'}</td>
                    <td>${vaka.kaza_tarihi ? yardimci.formatTarih(vaka.kaza_tarihi) : '-'}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn" onclick="uygulama.vakaDetayGoster(${vaka.id})" title="Detaylar">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn" onclick="uygulama.dosyaYukleModalAc(${vaka.id})" title="Dosya Yükle">
                                <i class="fas fa-upload"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    },

    sayfalamaKontrolleriniGuncelle() {
        if (!elemanlar.sayfaBilgi) return;
        
        elemanlar.sayfaBilgi.textContent = 
            `Toplam ${durum.toplamKayit} kayıt - Sayfa ${durum.sayfaNumarasi}/${durum.toplamSayfa}`;
        
        // Butonları güncelle
        if (elemanlar.ilkSayfa) elemanlar.ilkSayfa.disabled = durum.sayfaNumarasi === 1;
        if (elemanlar.oncekiSayfa) elemanlar.oncekiSayfa.disabled = durum.sayfaNumarasi === 1;
        if (elemanlar.sonrakiSayfa) elemanlar.sonrakiSayfa.disabled = durum.sayfaNumarasi === durum.toplamSayfa;
        if (elemanlar.sonSayfa) elemanlar.sonSayfa.disabled = durum.sayfaNumarasi === durum.toplamSayfa;
        
        // Sayfa numaraları
        if (elemanlar.sayfaNumaralari) {
            let sayfaHtml = '';
            for (let i = 1; i <= durum.toplamSayfa; i++) {
                if (i <= 5) { // Sadece ilk 5 sayfayı göster
                    sayfaHtml += `
                        <button class="pagination-btn ${i === durum.sayfaNumarasi ? 'active' : ''}" 
                                onclick="uygulama.sayfayaGit(${i})">
                            ${i}
                        </button>
                    `;
                }
            }
            elemanlar.sayfaNumaralari.innerHTML = sayfaHtml;
        }
    },

    sayfayaGit(sayfa) {
        durum.sayfaNumarasi = sayfa;
        this.vakalariListele();
    },

    yeniVakaModalAc() {
        if (elemanlar.yeniVakaModal) {
            elemanlar.yeniVakaModal.classList.remove('gizli');
        }
    },

    vakaDetayGoster(id) {
        alert('Vaka detayı: ' + id + ' - Bu özellik henüz tamamlanmadı');
    },

    dosyaYukleModalAc(id) {
        if (elemanlar.dosyaYukleModal) {
            elemanlar.modalVakaId.value = id;
            elemanlar.dosyaYukleModal.classList.remove('gizli');
        }
    }
};

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    uygulama.baslat();
});

// Global fonksiyonlar
window.uygulama = uygulama;