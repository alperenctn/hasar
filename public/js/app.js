'use strict';

console.log('🚀 app.js yüklendi');

// Temel değişkenler
let currentUser = null;
let vakalar = [];
let currentPage = 1;
let pageSize = 25;
let totalRecords = 0;
let totalPages = 1;

// DOM Elementleri
const elements = {
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
    
    // İstatistikler
    toplamVaka: document.getElementById('toplam-vaka'),
    bekleyenVaka: document.getElementById('bekleyen-vaka'),
    sigortadaVaka: document.getElementById('sigortada-vaka'),
    tahkimdeVaka: document.getElementById('tahkimde-vaka'),
    icradaVaka: document.getElementById('icrada-vaka'),
    ustasiVaka: document.getElementById('ustasi-vaka'),
    bittiVaka: document.getElementById('bitti-vaka'),
    
    // Arama
    aramaInput: document.getElementById('arama-input'),
    aramaBtn: document.getElementById('arama-btn'),
    
    // Tablo
    vakaTabloBody: document.getElementById('vaka-tablo-body'),
    
    // Sayfalama
    sayfaBilgi: document.getElementById('sayfa-bilgi'),
    ilkSayfa: document.getElementById('ilk-sayfa'),
    oncekiSayfa: document.getElementById('onceki-sayfa'),
    sonrakiSayfa: document.getElementById('sonraki-sayfa'),
    sonSayfa: document.getElementById('son-sayfa'),
    sayfaNumaralari: document.getElementById('sayfa-numaralari'),
    
    // Butonlar
    yeniDosyaBtn: document.getElementById('yeni-dosya-btn')
};

// API fonksiyonları
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`/api${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            ...options
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Hatası:', error);
        throw error;
    }
}

// Session kontrolü
async function checkSession() {
    try {
        const session = await apiRequest('/session');
        
        if (session.authenticated) {
            currentUser = session.user;
            showMainPage();
            loadDashboard();
            loadCases();
        } else {
            showLoginPage();
        }
    } catch (error) {
        console.error('Session kontrol hatası:', error);
        showLoginPage();
    }
}

// Giriş yap
async function login() {
    const username = elements.kullaniciAdi.value;
    const password = elements.sifre.value;

    try {
        const result = await apiRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (result.success) {
            currentUser = result.user;
            showMainPage();
            loadDashboard();
            loadCases();
        } else {
            alert('Giriş başarısız: ' + result.error);
        }
    } catch (error) {
        alert('Giriş hatası: ' + error.message);
    }
}

// Çıkış yap
async function logout() {
    try {
        await apiRequest('/logout', { method: 'POST' });
        currentUser = null;
        showLoginPage();
    } catch (error) {
        console.error('Çıkış hatası:', error);
    }
}

// Dashboard yükle
async function loadDashboard() {
    try {
        const stats = await apiRequest('/istatistikler');
        
        if (elements.toplamVaka) elements.toplamVaka.textContent = stats.total || '0';
        if (elements.bekleyenVaka) elements.bekleyenVaka.textContent = stats.pending || '0';
        if (elements.sigortadaVaka) elements.sigortadaVaka.textContent = stats.inProgress || '0';
        if (elements.bittiVaka) elements.bittiVaka.textContent = stats.completed || '0';
        
        // Diğer istatistikler
        if (elements.tahkimdeVaka) elements.tahkimdeVaka.textContent = '0';
        if (elements.icradaVaka) elements.icradaVaka.textContent = '0';
        if (elements.ustasiVaka) elements.ustasiVaka.textContent = '0';
        
    } catch (error) {
        console.error('Dashboard yükleme hatası:', error);
    }
}

// Vakaları yükle
async function loadCases(search = '', page = 1) {
    try {
        elements.vakaTabloBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-row">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Vakalar yükleniyor...</span>
                </td>
            </tr>
        `;
        
        const result = await apiRequest(`/vakalar?arama=${encodeURIComponent(search)}&sayfa=${page}&sayfaBoyutu=${pageSize}`);
        
        vakalar = result.vakalar || [];
        totalRecords = result.toplamKayit || 0;
        totalPages = result.toplamSayfa || 1;
        currentPage = page;
        
        renderCases();
        updatePagination();
        
    } catch (error) {
        console.error('Vaka yükleme hatası:', error);
        elements.vakaTabloBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-row">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Vakalar yüklenirken hata oluştu</span>
                </td>
            </tr>
        `;
    }
}

// Vakaları tabloda göster
function renderCases() {
    if (!elements.vakaTabloBody) return;
    
    if (vakalar.length === 0) {
        elements.vakaTabloBody.innerHTML = `
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
    
    vakalar.forEach(vaka => {
        // Tarih formatlama
        const formatDate = (dateString) => {
            if (!dateString) return '-';
            return new Date(dateString).toLocaleDateString('tr-TR');
        };
        
        // Plaka formatlama
        const formatPlaka = (plaka) => {
            if (!plaka) return '';
            return plaka.toUpperCase().replace(/(\d{2})([A-Z]{1,3})(\d{2,4})/, '$1 $2 $3');
        };
        
        html += `
            <tr>
                <td>${formatDate(vaka.created_at)}</td>
                <td><strong>${formatPlaka(vaka.plaka)}</strong></td>
                <td>${vaka.arac_sahibi}</td>
                <td>${vaka.dosya_no}</td>
                <td>${vaka.sigorta_sirketi || '-'}</td>
                <td>${vaka.usta || 'Atanmadı'}</td>
                <td>${formatDate(vaka.kaza_tarihi)}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn" onclick="showVakaDetail(${vaka.id})" title="Detaylar">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" onclick="uploadFileModal(${vaka.id})" title="Dosya Yükle">
                            <i class="fas fa-upload"></i>
                        </button>
                        <button class="action-btn" onclick="editVaka(${vaka.id})" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    elements.vakaTabloBody.innerHTML = html;
}

// Sayfalama güncelle
function updatePagination() {
    if (!elements.sayfaBilgi) return;
    
    elements.sayfaBilgi.textContent = `Toplam ${totalRecords} kayıt - Sayfa ${currentPage}/${totalPages}`;
    
    // Buton durumları
    if (elements.ilkSayfa) elements.ilkSayfa.disabled = currentPage === 1;
    if (elements.oncekiSayfa) elements.oncekiSayfa.disabled = currentPage === 1;
    if (elements.sonrakiSayfa) elements.sonrakiSayfa.disabled = currentPage === totalPages;
    if (elements.sonSayfa) elements.sonSayfa.disabled = currentPage === totalPages;
    
    // Sayfa numaraları
    if (elements.sayfaNumaralari) {
        let pageHtml = '';
        const maxPages = 5;
        
        let start = Math.max(1, currentPage - Math.floor(maxPages / 2));
        let end = Math.min(totalPages, start + maxPages - 1);
        
        if (end - start + 1 < maxPages) {
            start = Math.max(1, end - maxPages + 1);
        }
        
        for (let i = start; i <= end; i++) {
            pageHtml += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        elements.sayfaNumaralari.innerHTML = pageHtml;
    }
}

// Sayfa değiştir
function goToPage(page) {
    currentPage = page;
    loadCases(elements.aramaInput?.value || '', page);
}

// Vaka detay göster
function showVakaDetail(vakaId) {
    alert(`Vaka detayı: ${vakaId}\nBu özellik henüz tamamlanmadı.`);
}

// Dosya yükleme modalı
function uploadFileModal(vakaId) {
    const modal = document.getElementById('dosya-yukle-modal');
    const vakaIdInput = document.getElementById('modal-vaka-id');
    
    if (modal && vakaIdInput) {
        vakaIdInput.value = vakaId;
        modal.classList.remove('gizli');
    }
}

// VAKA DÜZENLEME FONKSİYONU (YENİ EKLENDİ)
function editVaka(vakaId) {
    console.log('✏️ Vaka düzenle:', vakaId);
    
    // Önce vaka detaylarını getir
    fetch(`/api/vaka/${vakaId}`, {
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) throw new Error('Vaka bulunamadı');
        return response.json();
    })
    .then(vaka => {
        console.log('📋 Vaka verileri:', vaka);
        
        // Formu doldur
        document.getElementById('duzenle-vaka-id').value = vaka.id;
        document.getElementById('duzenle-dosya-no').value = vaka.dosya_no || '';
        document.getElementById('duzenle-plaka').value = vaka.plaka || '';
        document.getElementById('duzenle-arac-sahibi').value = vaka.arac_sahibi || '';
        document.getElementById('duzenle-telefon').value = vaka.telefon || '';
        document.getElementById('duzenle-email').value = vaka.email || '';
        document.getElementById('duzenle-kaza-tarihi').value = vaka.kaza_tarihi || '';
        document.getElementById('duzenle-sigorta-sirketi').value = vaka.sigorta_sirketi || '';
        document.getElementById('duzenle-durum').value = vaka.durum || 'BEKLEMEDE';
        document.getElementById('duzenle-notlar').value = vaka.notlar || '';
        
        // Modalı aç
        document.getElementById('vaka-duzenle-modal').classList.remove('gizli');
    })
    .catch(error => {
        console.error('❌ Vaka detay hatası:', error);
        alert('Vaka bilgileri yüklenemedi');
    });
}

// Vaka düzenleme formunu kaydet
async function saveVakaEdit() {
    const vakaId = document.getElementById('duzenle-vaka-id').value;
    
    const updateData = {
        dosya_no: document.getElementById('duzenle-dosya-no').value,
        plaka: document.getElementById('duzenle-plaka').value,
        arac_sahibi: document.getElementById('duzenle-arac-sahibi').value,
        telefon: document.getElementById('duzenle-telefon').value,
        email: document.getElementById('duzenle-email').value,
        kaza_tarihi: document.getElementById('duzenle-kaza-tarihi').value,
        sigorta_sirketi: document.getElementById('duzenle-sigorta-sirketi').value,
        durum: document.getElementById('duzenle-durum').value,
        notlar: document.getElementById('duzenle-notlar').value
    };
    
    try {
        const response = await fetch(`/api/vaka/${vakaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Vaka başarıyla güncellendi!');
            closeEditModal();
            loadCases(elements.aramaInput?.value || '', currentPage);
        } else {
            alert('❌ Hata: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Güncelleme hatası:', error);
        alert('❌ Güncelleme hatası: ' + error.message);
    }
}

// Düzenleme modalını kapat
function closeEditModal() {
    document.getElementById('vaka-duzenle-modal').classList.add('gizli');
    document.getElementById('vaka-duzenle-formu').reset();
}

// Sayfa gösterme
function showLoginPage() {
    if (elements.girisSayfasi) elements.girisSayfasi.classList.remove('gizli');
    if (elements.anaSayfa) elements.anaSayfa.classList.add('gizli');
}

function showMainPage() {
    if (elements.girisSayfasi) elements.girisSayfasi.classList.add('gizli');
    if (elements.anaSayfa) elements.anaSayfa.classList.remove('gizli');
    
    if (currentUser && elements.kullaniciIsim) {
        elements.kullaniciIsim.textContent = currentUser.fullname;
    }
}

// Event listener'ları kur
function setupEventListeners() {
    // Giriş formu
    if (elements.girisFormu) {
        elements.girisFormu.addEventListener('submit', (e) => {
            e.preventDefault();
            login();
        });
    }
    
    // Çıkış butonu
    if (elements.cikisBtn) {
        elements.cikisBtn.addEventListener('click', () => {
            logout();
        });
    }
    
    // Arama
    if (elements.aramaBtn) {
        elements.aramaBtn.addEventListener('click', () => {
            loadCases(elements.aramaInput.value);
        });
    }
    
    if (elements.aramaInput) {
        elements.aramaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadCases(elements.aramaInput.value);
            }
        });
    }
    
    // Sayfalama
    if (elements.ilkSayfa) {
        elements.ilkSayfa.addEventListener('click', () => {
            goToPage(1);
        });
    }
    
    if (elements.oncekiSayfa) {
        elements.oncekiSayfa.addEventListener('click', () => {
            if (currentPage > 1) goToPage(currentPage - 1);
        });
    }
    
    if (elements.sonrakiSayfa) {
        elements.sonrakiSayfa.addEventListener('click', () => {
            if (currentPage < totalPages) goToPage(currentPage + 1);
        });
    }
    
    if (elements.sonSayfa) {
        elements.sonSayfa.addEventListener('click', () => {
            goToPage(totalPages);
        });
    }
    
    // Yeni dosya butonu
    if (elements.yeniDosyaBtn) {
        elements.yeniDosyaBtn.addEventListener('click', () => {
            document.getElementById('yeni-vaka-modal').classList.remove('gizli');
        });
    }
    
    // Vaka düzenleme formu
    const duzenleForm = document.getElementById('vaka-duzenle-formu');
    if (duzenleForm) {
        duzenleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveVakaEdit();
        });
    }
    
    // Düzenleme modalı kapatma
    document.getElementById('duzenle-modal-kapat')?.addEventListener('click', closeEditModal);
    document.getElementById('duzenle-iptal')?.addEventListener('click', closeEditModal);
}

// Uygulamayı başlat
async function init() {
    console.log('🔧 Uygulama başlatılıyor...');
    setupEventListeners();
    await checkSession();
}

// Global fonksiyonlar
window.goToPage = goToPage;
window.showVakaDetail = showVakaDetail;
window.uploadFileModal = uploadFileModal;
window.editVaka = editVaka;
window.saveVakaEdit = saveVakaEdit;
window.closeEditModal = closeEditModal;

// Sayfa yüklendiğinde başlat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}