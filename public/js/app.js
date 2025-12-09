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

    formatTarihSaat(tarihString) {
        if (!tarihString) return '';
        const tarih = new Date(tarihString);
        return tarih.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
    },

    dosyaIkon(dosyaAdi) {
        if (dosyaAdi.endsWith('.pdf')) return 'file-pdf';
        if (dosyaAdi.endsWith('.doc') || dosyaAdi.endsWith('.docx')) return 'file-word';
        if (dosyaAdi.endsWith('.jpg') || dosyaAdi.endsWith('.jpeg') || dosyaAdi.endsWith('.png')) return 'file-image';
        return 'file';
    },

    teleformat(numara) {
        if (!numara) return '';
        return numara.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
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
        elemanlar.cikisBtn.addEventListener('click', () => {
            this.cikisYap();
        });

        // Navigasyon butonları
        elemanlar.navBtnlar.forEach(buton => {
            buton.addEventListener('click', (e) => {
                if (e.currentTarget.id === 'cikis-btn') return;
                this.navigasyonDegistir(e.currentTarget.dataset.page);
            });
        });

        // FAB butonu
        elemanlar.yeniDosyaBtn.addEventListener('click', () => {
            this.yeniVakaModalAc();
        });

        // Arama
        elemanlar.aramaBtn.addEventListener('click', () => {
            this.vakalariListele();
        });

        elemanlar.aramaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.vakalariListele();
        });

        // Filtreler
        elemanlar.durumFiltre.addEventListener('change', () => {
            durum.aktifDurum = elemanlar.durumFiltre.value;
            durum.sayfaNumarasi = 1;
            this.vakalariListele();
        });

        elemanlar.siralaFiltre.addEventListener('change', () => {
            durum.siralama = elemanlar.siralaFiltre.value;
            durum.sayfaNumarasi = 1;
            this.vakalariListele();
        });

        elemanlar.sayfaBoyutuSelect.addEventListener('change', () => {
            durum.sayfaBoyutu = parseInt(elemanlar.sayfaBoyutuSelect.value);
            durum.sayfaNumarasi = 1;
            this.vakalariListele();
        });

        // Sayfalama
        elemanlar.ilkSayfa.addEventListener('click', () => {
            durum.sayfaNumarasi = 1;
            this.vakalariListele();
        });

        elemanlar.oncekiSayfa.addEventListener('click', () => {
            if (durum.sayfaNumarasi > 1) {
                durum.sayfaNumarasi--;
                this.vakalariListele();
            }
        });

        elemanlar.sonrakiSayfa.addEventListener('click', () => {
            if (durum.sayfaNumarasi < durum.toplamSayfa) {
                durum.sayfaNumarasi++;
                this.vakalariListele();
            }
        });

        elemanlar.sonSayfa.addEventListener('click', () => {
            durum.sayfaNumarasi = durum.toplamSayfa;
            this.vakalariListele();
        });

        // Modal kapatma
        elemanlar.modalKapat.addEventListener('click', () => {
            this.modalGizle(elemanlar.vakaDetayModal);
        });

        elemanlar.yeniVakaIptal.addEventListener('click', () => {
            this.modalGizle(elemanlar.yeniVakaModal);
        });

        elemanlar.dosyaModalKapat.addEventListener('click', () => {
            this.modalGizle(elemanlar.dosyaYukleModal);
        });

        elemanlar.formIptal.addEventListener('click', () => {
            this.modalGizle(elemanlar.yeniVakaModal);
        });

        elemanlar.dosyaIptal.addEventListener('click', () => {
            this.modalGizle(elemanlar.dosyaYukleModal);
        });

        // Yeni vaka formu
        elemanlar.yeniVakaFormu.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.yeniVakaEkle();
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
            elemanlar.dosyaSurukleAlani.style.borderColor = '#e0e0e0';
            elemanlar.dosyaSurukleAlani.style.background = 'white';
        });

        elemanlar.dosyaSurukleAlani.addEventListener('drop', (e) => {
            e.preventDefault();
            elemanlar.dosyaSurukleAlani.style.borderColor = '#e0e0e0';
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

        // Modal dışına tıklama
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.modalGizle(e.target);
            }
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
                this.hataGoster('Giriş başarısız: ' + sonuc.error);
            }
        } catch (hata) {
            this.hataGoster('Giriş hatası: ' + hata.message);
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
            this.modalGizle(elemanlar.adminModal);
            this.bilgiGoster('Admin kullanıcı başarıyla oluşturuldu!');
        } catch (hata) {
            this.hataGoster('Admin oluşturma hatası: ' + hata.message);
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
        
        if (durum.kullanici) {
            elemanlar.kullaniciIsim.textContent = durum.kullanici.fullname;
        }
    },

    navigasyonDegistir(sayfa) {
        // Navigasyon butonlarını güncelle
        elemanlar.navBtnlar.forEach(btn => {
            btn.classList.remove('active');
        });
        
        const aktifBtn = document.querySelector(`[data-page="${sayfa}"]`);
        if (aktifBtn) {
            aktifBtn.classList.add('active');
        }
        
        if (sayfa === 'dashboard') {
            // Dashboard zaten açık
        } else if (sayfa === 'yeni-vaka') {
            this.yeniVakaModalAc();
        }
    },

    modalGoster(modal) {
        modal.classList.remove('gizli');
        document.body.style.overflow = 'hidden';
    },

    modalGizle(modal) {
        modal.classList.add('gizli');
        document.body.style.overflow = 'auto';
        
        // Formları temizle
        if (modal === elemanlar.yeniVakaModal) {
            elemanlar.yeniVakaFormu.reset();
        } else if (modal === elemanlar.dosyaYukleModal) {
            elemanlar.dosyaYukleFormu.reset();
            elemanlar.seciliDosya.classList.add('gizli');
            elemanlar.seciliDosya.innerHTML = '';
        }
    },

    yeniVakaModalAc() {
        this.modalGoster(elemanlar.yeniVakaModal);
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
        elemanlar.bekleyenVaka.textContent = ist.beklemede || '0';
        elemanlar.sigortadaVaka.textContent = ist.devam || '0';
        elemanlar.tahkimdeVaka.textContent = '0';
        elemanlar.icradaVaka.textContent = '0';
        elemanlar.ustasiVaka.textContent = '0';
        elemanlar.bittiVaka.textContent = ist.tamam || '0';
    },

    // Vaka listeleme
    async vakalariListele() {
        try {
            // Loading göster
            elemanlar.vakaTabloBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-row">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Vakalar yükleniyor...</span>
                    </td>
                </tr>
            `;
            
            // Arama kelimesini güncelle
            durum.aramaKelime = elemanlar.aramaInput.value;
            
            const sonuc = await api.vakalariSayfaliGetir(
                durum.aramaKelime, 
                durum.aktifDurum, 
                durum.sayfaNumarasi, 
                durum.sayfaBoyutu, 
                durum.siralama
            );
            
            durum.vakalar = sonuc.vakalar;
            durum.toplamKayit = sonuc.toplamKayit;
            durum.toplamSayfa = sonuc.toplamSayfa;
            
            this.vakalariTablodaGoster();
            this.sayfalamaKontrolleriniGuncelle();
        } catch (hata) {
            console.error('Vaka listeleme hatası:', hata);
            elemanlar.vakaTabloBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-row">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Vakalar yüklenirken hata oluştu</span>
                    </td>
                </tr>
            `;
        }
    },

    vakalariTablodaGoster() {
        const tbody = elemanlar.vakaTabloBody;
        
        if (durum.vakalar.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-row">
                        <i class="fas fa-folder-open"></i>
                        <span>Henüz vaka bulunmuyor</span>
                        <p style="margin-top: 10px; font-size: 12px;">Yeni vaka eklemek için "+ Dosya Aç" butonuna tıklayın</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        
        durum.vakalar.forEach(vaka => {
            // Usta bilgisi - veritabanında yoksa "Atanmadı" göster
            const ustaBilgisi = vaka.usta || 'Atanmadı';
            
            html += `
                <tr>
                    <td>${yardimci.formatTarih(vaka.created_at)}</td>
                    <td><strong>${yardimci.formatPlaka(vaka.plaka)}</strong></td>
                    <td>
                        <div>${vaka.arac_sahibi}</div>
                        <small style="color: #7f8c8d; font-size: 11px;">${vaka.tc_kimlik || ''}</small>
                    </td>
                    <td>${vaka.dosya_no}</td>
                    <td>${vaka.sigorta_sirketi || '-'}</td>
                    <td>${ustaBilgisi}</td>
                    <td>${vaka.kaza_tarihi ? yardimci.formatTarih(vaka.kaza_tarihi) : '-'}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn" onclick="uygulama.vakaDetayGoster(${vaka.id})" title="Detaylar">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn" onclick="uygulama.dosyaYukleModalAc(${vaka.id})" title="Dosya Yükle">
                                <i class="fas fa-upload"></i>
                            </button>
                            <button class="action-btn" onclick="uygulama.vakaDuzenle(${vaka.id})" title="Düzenle">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    },

    // Sayfalama kontrolleri
    sayfalamaKontrolleriniGuncelle() {
        // Sayfa bilgisi
        elemanlar.sayfaBilgi.textContent = 
            `Toplam ${durum.toplamKayit} kayıt - Sayfa ${durum.sayfaNumarasi}/${durum.toplamSayfa}`;
        
        // Buton durumları
        elemanlar.ilkSayfa.disabled = durum.sayfaNumarasi === 1;
        elemanlar.oncekiSayfa.disabled = durum.sayfaNumarasi === 1;
        elemanlar.sonrakiSayfa.disabled = durum.sayfaNumarasi === durum.toplamSayfa;
        elemanlar.sonSayfa.disabled = durum.sayfaNumarasi === durum.toplamSayfa;
        
        // Sayfa numaraları
        let sayfaHtml = '';
        const maxGoster = 5;
        
        let baslangic = Math.max(1, durum.sayfaNumarasi - Math.floor(maxGoster / 2));
        let bitis = Math.min(durum.toplamSayfa, baslangic + maxGoster - 1);
        
        // Ayarlamalar
        if (bitis - baslangic + 1 < maxGoster) {
            baslangic = Math.max(1, bitis - maxGoster + 1);
        }
        
        for (let i = baslangic; i <= bitis; i++) {
            sayfaHtml += `
                <button class="pagination-btn ${i === durum.sayfaNumarasi ? 'active' : ''}" 
                        onclick="uygulama.sayfayaGit(${i})">
                    ${i}
                </button>
            `;
        }
        
        elemanlar.sayfaNumaralari.innerHTML = sayfaHtml;
    },

    sayfayaGit(sayfa) {
        durum.sayfaNumarasi = sayfa;
        this.vakalariListele();
    },

    // Yeni vaka ekleme
    async yeniVakaEkle() {
        const vakaData = {
            dosya_no: document.getElementById('dosya-no').value,
            plaka: document.getElementById('plaka').value,
            arac_sahibi: document.getElementById('arac-sahibi').value,
            tc_kimlik: document.getElementById('tc-kimlik').value,
            telefon: document.getElementById('telefon').value,
            email: document.getElementById('email').value,
            kaza_tarihi: document.getElementById('kaza-tarihi').value,
            sigorta_sirketi: document.getElementById('sigorta-sirketi').value,
            notlar: document.getElementById('notlar').value
        };
        
        try {
            await api.vakaEkle(vakaData);
            this.bilgiGoster('✅ Vaka başarıyla eklendi!');
            
            // Modalı kapat
            this.modalGizle(elemanlar.yeniVakaModal);
            
            // İstatistikleri ve listeyi yenile
            await this.istatistikleriYukle();
            await this.vakalariListele();
        } catch (hata) {
            this.hataGoster('❌ Vaka ekleme hatası: ' + hata.message);
        }
    },

    // Vaka detayı
    async vakaDetayGoster(id) {
        try {
            const vaka = await api.vakaDetayGetir(id);
            durum.aktifVaka = vaka;
            this.vakaDetayModalGoster(vaka);
        } catch (hata) {
            console.error('Vaka detay hatası:', hata);
            this.hataGoster('Vaka detayı yüklenemedi: ' + hata.message);
        }
    },

    vakaDetayModalGoster(vaka) {
        let belgelerHtml = '';
        
        if (vaka.belgeler && vaka.belgeler.length > 0) {
            belgelerHtml = `
                <div class="belgeler-section">
                    <h4><i class="fas fa-folder"></i> Yüklenen Belgeler</h4>
                    <div class="dosya-listesi">
                        ${vaka.belgeler.map(belge => `
                            <div class="dosya-oge">
                                <div class="dosya-ikon">
                                    <i class="fas fa-${yardimci.dosyaIkon(belge.dosya_adi)}"></i>
                                </div>
                                <div class="dosya-bilgi">
                                    <div class="dosya-adi">${belge.orijinal_adi}</div>
                                    <div class="dosya-turu">
                                        ${belge.belge_turu} • ${yardimci.formatTarihSaat(belge.yukleme_tarihi)}
                                    </div>
                                </div>
                                <div class="dosya-aksiyonlar">
                                    <button class="action-btn" onclick="uygulama.dosyaIndir('${belge.dosya_adi}')" title="İndir">
                                        <i class="fas fa-download"></i>
                                    </button>
                                    <button class="action-btn" onclick="uygulama.dosyaSil(${belge.id})" title="Sil">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            belgelerHtml = `
                <div class="belgeler-section">
                    <h4><i class="fas fa-folder"></i> Yüklenen Belgeler</h4>
                    <p style="color: #7f8c8d; text-align: center; padding: 20px;">Henüz belge yüklenmemiş</p>
                </div>
            `;
        }
        
        elemanlar.vakaDetayIcerik.innerHTML = `
            <div class="vaka-detay-header">
                <div class="vaka-plaka">
                    <h4>${yardimci.formatPlaka(vaka.plaka)}</h4>
                    <span class="status-badge ${yardimci.durumRenk(vaka.durum)}">
                        ${yardimci.durumMetin(vaka.durum)}
                    </span>
                </div>
                <div class="vaka-muvekkil">
                    <h3>${vaka.arac_sahibi}</h3>
                    <p>${vaka.tc_kimlik || ''}</p>
                </div>
            </div>
            
            <div class="vaka-detay-grid">
                <div class="detail-card">
                    <h5><i class="fas fa-info-circle"></i> Temel Bilgiler</h5>
                    <div class="detail-item">
                        <strong>Dosya No:</strong> ${vaka.dosya_no}
                    </div>
                    <div class="detail-item">
                        <strong>Telefon:</strong> ${vaka.telefon ? yardimci.teleformat(vaka.telefon) : 'Belirtilmemiş'}
                    </div>
                    <div class="detail-item">
                        <strong>E-posta:</strong> ${vaka.email || 'Belirtilmemiş'}
                    </div>
                    <div class="detail-item">
                        <strong>Kaza Tarihi:</strong> ${vaka.kaza_tarihi ? yardimci.formatTarih(vaka.kaza_tarihi) : 'Belirtilmemiş'}
                    </div>
                    <div class="detail-item">
                        <strong>Oluşturulma:</strong> ${yardimci.formatTarihSaat(vaka.created_at)}
                    </div>
                </div>
                
                <div class="detail-card">
                    <h5><i class="fas fa-shield-alt"></i> Sigorta Bilgileri</h5>
                    <div class="detail-item">
                        <strong>Şirket:</strong> ${vaka.sigorta_sirketi || 'Belirtilmemiş'}
                    </div>
                    <div class="detail-item">
                        <strong>Usta:</strong> ${vaka.usta || 'Atanmadı'}
                    </div>
                    <div class="detail-item">
                        <strong>Ajans:</strong> ${vaka.ajans || 'Belirtilmemiş'}
                    </div>
                    <div class="detail-item">
                        <strong>Oluşturan:</strong> ${vaka.olusturan || 'Belirtilmemiş'}
                    </div>
                </div>
            </div>
            
            ${vaka.notlar ? `
                <div class="detail-card">
                    <h5><i class="fas fa-sticky-note"></i> Notlar</h5>
                    <p style="white-space: pre-wrap;">${vaka.notlar}</p>
                </div>
            ` : ''}
            
            ${belgelerHtml}
            
            <div class="vaka-aksiyonlar">
                <button class="btn btn-primary" onclick="uygulama.dosyaYukleModalAc(${vaka.id})">
                    <i class="fas fa-upload"></i> Yeni Dosya Yükle
                </button>
                <button class="btn btn-secondary" onclick="uygulama.vakaDuzenle(${vaka.id})">
                    <i class="fas fa-edit"></i> Düzenle
                </button>
            </div>
        `;
        
        this.modalGoster(elemanlar.vakaDetayModal);
    },

    // Dosya yükleme modalı
    dosyaYukleModalAc(vakaId) {
        elemanlar.modalVakaId.value = vakaId;
        this.modalGoster(elemanlar.dosyaYukleModal);
    },

    dosyaSecildi(dosya) {
        if (dosya) {
            elemanlar.seciliDosya.classList.remove('gizli');
            elemanlar.seciliDosya.innerHTML = `
                <div style="padding: 12px; background: #e9ecef; border-radius: 8px; margin: 15px 0;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-file" style="color: #3498db;"></i>
                        <div>
                            <div style="font-weight: 600;">${dosya.name}</div>
                            <div style="font-size: 12px; color: #7f8c8d;">
                                ${(dosya.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    async dosyaYukle() {
        const vakaId = elemanlar.modalVakaId.value;
        const belgeTuru = elemanlar.belgeTuru.value;
        const dosya = elemanlar.dosyaInput.files[0];
        
        if (!dosya) {
            this.hataGoster('Lütfen bir dosya seçin');
            return;
        }
        
        if (!belgeTuru) {
            this.hataGoster('Lütfen belge türünü seçin');
            return;
        }
        
        try {
            await api.dosyaYukle(vakaId, dosya, belgeTuru);
            this.bilgiGoster('✅ Dosya başarıyla yüklendi!');
            
            // Modalı kapat
            this.modalGizle(elemanlar.dosyaYukleModal);
            
            // Vaka detayını yenile
            if (durum.aktifVaka && durum.aktifVaka.id == vakaId) {
                await this.vakaDetayGoster(vakaId);
            }
            
            // Listeyi yenile
            await this.vakalariListele();
        } catch (hata) {
            this.hataGoster('❌ Dosya yükleme hatası: ' + hata.message);
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
            this.bilgiGoster('✅ Dosya başarıyla silindi!');
            
            // Vaka detayını yenile
            if (durum.aktifVaka) {
                await this.vakaDetayGoster(durum.aktifVaka.id);
            }
        } catch (hata) {
            this.hataGoster('❌ Dosya silme hatası: ' + hata.message);
        }
    },

    // Vaka düzenle (şimdilik basit)
    vakaDuzenle(vakaId) {
        this.bilgiGoster('Vaka düzenleme özelliği yakında eklenecek!');
        // Burayı daha sonra geliştirebiliriz
    },

    // Mesaj gösterim fonksiyonları
    bilgiGoster(mesaj) {
        alert(mesaj);
    },

    hataGoster(mesaj) {
        alert(mesaj);
    }
};

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', () => {
    uygulama.baslat();
});

// Global fonksiyonlar
window.uygulama = uygulama;