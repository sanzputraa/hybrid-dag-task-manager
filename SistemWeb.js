// ==========================================
// 1. IMPORT FIREBASE & INISIALISASI VARIABEL
// ==========================================
import { auth, googleProvider, db, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc } from "./firebase-config.js";

let currentUserUID = null;
let currentUserEmail = null;
let daftarTugasUser = JSON.parse(localStorage.getItem("dataTugas")) || [];

const BOBOT_OUTDEGREE = 0.3;
const BOBOT_TENGGAT = 0.7;

// Variabel untuk fitur Search, Sort, dan Stateful Modal
let keywordCari = "";
let modeSort = "urgensiTinggi";
let indeksAktif = null; // Menyimpan indeks tugas yang sedang dibuka di Modal

// Dijalankan pertama kali saat web dimuat
window.onload = function () {
    cetakDaftarTugas();
    mulaiJamRealTime();
};

// ==========================================
// 2. SISTEM JAM & SAPAAN REAL-TIME
// ==========================================
function mulaiJamRealTime() {
    setInterval(() => {
        const now = new Date();
        const jam = now.getHours();
        
        let sapaan = "Selamat Malam";
        if (jam >= 5 && jam < 12) sapaan = "Selamat Pagi";
        else if (jam >= 12 && jam < 15) sapaan = "Selamat Siang";
        else if (jam >= 15 && jam < 18) sapaan = "Selamat Sore";
        
        // Gabungkan sapaan dengan nama depan
        let nama = window.namaPanggilanUser ? ", " + window.namaPanggilanUser : ",";
        document.getElementById("teksSapaan").textContent = sapaan + nama;

        const opsiTanggal = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const tanggalFormatted = now.toLocaleDateString('id-ID', opsiTanggal);
        const waktuFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        document.getElementById("teksTanggalWaktu").textContent = `${tanggalFormatted} • ${waktuFormatted} WIB`;
    }, 1000);
}

// ==========================================
// 3. LOGIKA ALGORITMA (URGENSI & FILTERING)
// ==========================================
function perhitunganUrgensi(tenggat) {
    let waktuSekarang = new Date();
    let selisihWaktu = tenggat - waktuSekarang;
    let sisaHari = Math.ceil(selisihWaktu / (1000 * 60 * 60 * 24));
    if (sisaHari < 0) sisaHari = 0;
    return (1 / (sisaHari + 1)) * 5;
}

// Fungsi mengubah "2026-06-16T15:00" menjadi "16 Juni 2026, 15.00"
function formatTanggalManusia(tenggatRaw) {
    if (!tenggatRaw) return "-";
    let dateObj = new Date(tenggatRaw);
    return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ", " + dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// Listener untuk Kolom Search
document.getElementById("inputSearch").addEventListener("input", (e) => {
    keywordCari = e.target.value.toLowerCase();
    cetakDaftarTugas();
});

// Listener untuk Dropdown Sort
document.getElementById("inputSort").addEventListener("change", (e) => {
    modeSort = e.target.value;
    cetakDaftarTugas();
});

// ==========================================
// 4. RENDER KARTU TUGAS (DASHBOARD UTAMA)
// ==========================================
function cetakDaftarTugas() {
    const wadah = document.getElementById("wadahDaftarTugas");
    wadah.innerHTML = "";

    // 1. Gandakan array agar sorting tidak merusak urutan asli, dan sisipkan indeks aslinya
    let tugasDitampilkan = daftarTugasUser.map((tugas, index) => ({ ...tugas, indeksAsli: index }));

    // 2. Filter berdasarkan teks pencarian
    if (keywordCari) {
        tugasDitampilkan = tugasDitampilkan.filter(t => t.nama.toLowerCase().includes(keywordCari));
    }

    // 3. Pengurutan (Sorting)
    if (modeSort === "urgensiTinggi") tugasDitampilkan.sort((a, b) => b.skor - a.skor);
    else if (modeSort === "urgensiRendah") tugasDitampilkan.sort((a, b) => a.skor - b.skor);
    else if (modeSort === "abjadAZ") tugasDitampilkan.sort((a, b) => a.nama.localeCompare(b.nama));
    else if (modeSort === "abjadZA") tugasDitampilkan.sort((a, b) => b.nama.localeCompare(a.nama));

    // 4. Proses pencetakan kartu tugas minimalis
    tugasDitampilkan.forEach((tugas) => {
        let jmlSelesai = tugas.subTugas.filter(s => s.isSelesai).length;
        let totalSub = tugas.subTugas.length;
        let persentase = totalSub === 0 ? 0 : Math.round((jmlSelesai / totalSub) * 100);

        let div = document.createElement("div");
        div.className = "task-card";
        // Saat kartu diklik, buka detail berdasarkan indeks aslinya
        div.onclick = () => bukaModalDetail(tugas.indeksAsli); 

        div.innerHTML = `
            <div class="task-info">
                <h3>${tugas.nama}</h3>
                <div style="font-size: 12px; color: var(--text-muted); display: flex; gap: 15px; margin-top: 8px;">
                    <span>🗓️ ${formatTanggalManusia(tugas.tenggat)}</span>
                    <span>📋 ${jmlSelesai}/${totalSub} Sub-tugas Selesai</span>
                    <span style="color: var(--uin-gold); font-weight: bold;">🔥 Skor: ${tugas.skor}</span>
                </div>
            </div>
            <div class="progress-circle" style="background: conic-gradient(var(--uin-green) ${persentase}%, #e9ecef 0);">
                <span>${persentase}%</span>
            </div>
        `;
        wadah.appendChild(div);
    });
}

// ==========================================
// 5. STATEFUL MODAL (DETAIL, EDIT, TAMBAH)
// ==========================================

// Buka Modal Mode Baca (Klik Kartu)
function bukaModalDetail(indeks) {
    indeksAktif = indeks;
    let tugas = daftarTugasUser[indeks];

    // Tampilkan Mode Baca, Sembunyikan Form Edit
    document.getElementById("modeBaca").style.display = "block";
    document.getElementById("modeEdit").style.display = "none";
    document.getElementById("btnTitikTiga").style.display = "block"; // Munculkan titik tiga

    document.getElementById("bacaNamaTugas").textContent = tugas.nama;
    document.getElementById("bacaTenggat").textContent = formatTanggalManusia(tugas.tenggat);

    // Render Sub-tugas Checkbox
    let wadahSub = document.getElementById("wadahBacaSubTugas");
    wadahSub.innerHTML = "";
    
    tugas.subTugas.forEach((sub, j) => {
        let isTerbuka = (j === 0) || (tugas.subTugas[j - 1].isSelesai === true);
        let checked = sub.isSelesai ? "checked" : "";
        let disabled = isTerbuka ? "" : "disabled";
        let warna = sub.isSelesai ? "color: #aaa; text-decoration: line-through;" : (isTerbuka ? "color: var(--carbon-black);" : "color: #ccc;");

        wadahSub.innerHTML += `
            <label style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-light); ${warna} cursor: ${isTerbuka ? 'pointer' : 'not-allowed'}; font-size: 14px;">
                <input type="checkbox" onchange="toggleSubTugasDiModal(${indeks}, ${j})" ${checked} ${disabled} style="margin-right: 12px; width: 16px; height: 16px;">
                ${sub.nama}
            </label>
        `;
    });

    document.getElementById("modalOverlay").style.display = "block";
    document.getElementById("modalTugas").style.display = "block";
    document.getElementById("dropdownMenu").classList.remove("show"); // Tutup menu jika terbuka
}

// Logika Centang Sub-Tugas di dalam Modal
window.toggleSubTugasDiModal = function(indeksTugas, indeksSub) {
    let tugas = daftarTugasUser[indeksTugas];
    tugas.subTugas[indeksSub].isSelesai = !tugas.subTugas[indeksSub].isSelesai;
    
    // Jika sebuah sub-tugas dibatalkan, batalkan juga semua sub-tugas di bawahnya
    if (!tugas.subTugas[indeksSub].isSelesai) {
        for (let k = indeksSub + 1; k < tugas.subTugas.length; k++) {
            tugas.subTugas[k].isSelesai = false;
        }
    }
    
    simpanDataTugas();
    bukaModalDetail(indeksTugas); // Refresh visual modal
};

// Buka Modal Mode Tambah Tugas Baru (Klik Tombol Biru Kiri)
document.getElementById("btnBukaModalTambah").onclick = () => {
    indeksAktif = null; // Menandakan ini data baru, bukan edit
    document.getElementById("inputNamaTugas").value = "";
    document.getElementById("inputTenggat").value = "";
    
    // Siapkan 1 kolom input sub-tugas kosong
    document.getElementById("wadahSubTugas").innerHTML = `
        <div style="display: flex; gap: 8px;">
            <input type="text" class="input-sub-tugas form-control" placeholder="Sub-tugas 1..." style="margin-bottom:0;">
            <button type="button" class="btn-icon" style="background-color: #ffebee; color: #dc3545; border-radius: 8px;" onclick="hapusInputSubTugas(this)">✕</button>
        </div>`;
    
    document.getElementById("modeBaca").style.display = "none";
    document.getElementById("modeEdit").style.display = "block";
    document.getElementById("btnTitikTiga").style.display = "none"; // Sembunyikan titik tiga

    document.getElementById("modalOverlay").style.display = "block";
    document.getElementById("modalTugas").style.display = "block";
};

// ==========================================
// 6. MENU TITIK TIGA (DROPDOWN)
// ==========================================
document.getElementById("btnTitikTiga").onclick = () => {
    document.getElementById("dropdownMenu").classList.toggle("show");
};

// Opsi A: EDIT
document.getElementById("menuEdit").onclick = (e) => {
    e.preventDefault();
    document.getElementById("dropdownMenu").classList.remove("show");
    document.getElementById("btnTitikTiga").style.display = "none";
    
    // Tukar Wujud
    document.getElementById("modeBaca").style.display = "none";
    document.getElementById("modeEdit").style.display = "block";

    let tugas = daftarTugasUser[indeksAktif];
    document.getElementById("inputNamaTugas").value = tugas.nama;
    document.getElementById("inputTenggat").value = tugas.tenggat;

    // Susun ulang input sub-tugas
    let wadah = document.getElementById("wadahSubTugas");
    wadah.innerHTML = "";
    tugas.subTugas.forEach((sub, idx) => {
        wadah.innerHTML += `
            <div style="display: flex; gap: 8px;">
                <input type="text" class="input-sub-tugas form-control" value="${sub.nama}" placeholder="Sub-tugas ${idx + 1}..." style="margin-bottom:0;">
                <button type="button" class="btn-icon" style="background-color: #ffebee; color: #dc3545; border-radius: 8px;" onclick="hapusInputSubTugas(this)">✕</button>
            </div>`;
    });
};

// Fungsi untuk mengurutkan ulang placeholder sub-tugas
function perbaruiNomorSubTugas() {
    let semuaInput = document.querySelectorAll("#wadahSubTugas .input-sub-tugas");
    semuaInput.forEach((input, index) => {
        input.placeholder = `Sub-tugas ${index + 1}...`;
    });
}

// Fungsi global untuk menghapus baris sub-tugas
window.hapusInputSubTugas = function(elemenTombol) {
    elemenTombol.parentElement.remove();
    perbaruiNomorSubTugas(); // Urutkan ulang setelah dihapus
};

// Menambah Sub-Tugas Dinamis di Form Edit/Tambah
document.getElementById("btnTambahSub").onclick = () => {
    let wadah = document.getElementById("wadahSubTugas");
    let div = document.createElement("div");
    div.style.display = "flex"; div.style.gap = "8px";
    div.innerHTML = `
        <input type="text" class="input-sub-tugas form-control" style="margin-bottom:0;">
        <button type="button" class="btn-icon" style="background-color: #ffebee; color: #dc3545; border-radius: 8px;" onclick="hapusInputSubTugas(this)">✕</button>
    `;
    wadah.appendChild(div);
    perbaruiNomorSubTugas(); // Otomatis beri nomor yang benar setelah ditambahkan
};

// Opsi B: HAPUS
document.getElementById("menuHapus").onclick = (e) => {
    e.preventDefault();
    document.getElementById("dropdownMenu").classList.remove("show");
    let nama = daftarTugasUser[indeksAktif].nama;
    
    if (confirm(`Peringatan: Apakah Anda yakin ingin menghapus tugas "${nama}" beserta seluruh progressnya?`)) {
        daftarTugasUser.splice(indeksAktif, 1);
        simpanDataTugas();
        tutupSemuaModal();
    }
};

// Opsi C: REMINDER (Buka Modal Mini)
document.getElementById("menuReminder").onclick = (e) => {
    e.preventDefault();
    document.getElementById("dropdownMenu").classList.remove("show");
    document.getElementById("modalReminder").style.display = "block"; // Muncul menimpa modal utama
    
    let tugas = daftarTugasUser[indeksAktif];
    document.getElementById("opsiReminder").value = tugas.jenisPengingat || "none";
    document.getElementById("editManualReminder").value = tugas.waktuPengingatManual || "";
    document.getElementById("editManualReminder").style.display = (tugas.jenisPengingat === "manual") ? "block" : "none";
};

// Logika Input Reminder Manual
document.getElementById("opsiReminder").onchange = (e) => {
    document.getElementById("editManualReminder").style.display = (e.target.value === "manual") ? "block" : "none";
};

// Simpan Reminder ke Database
document.getElementById("btnSimpanReminder").onclick = () => {
    if (indeksAktif !== null) {
        daftarTugasUser[indeksAktif].jenisPengingat = document.getElementById("opsiReminder").value;
        daftarTugasUser[indeksAktif].waktuPengingatManual = document.getElementById("editManualReminder").value;
        simpanDataTugas();
        document.getElementById("modalReminder").style.display = "none";
        alert("Pengingat untuk tugas ini berhasil disetel!");
    }
};

// ==========================================
// 7. MENYIMPAN TUGAS (BARU / EDIT)
// ==========================================
document.getElementById("tombolSimpanTugas").onclick = () => {
    let nama = document.getElementById("inputNamaTugas").value.trim();
    let tenggatRaw = document.getElementById("inputTenggat").value;
    
    if (!nama || !tenggatRaw) return alert("Nama Tugas dan Tenggat Waktu wajib diisi!");

    // Mengumpulkan sub-tugas dari input
    let subInputs = document.getElementsByClassName("input-sub-tugas");
    let subTugasBaru = [];
    
    for (let input of subInputs) {
        let val = input.value.trim();
        if (val !== "") {
            let isSelesai = false;
            // Jika ini mode edit, dan nama sub-tugas tidak berubah, pertahankan status centangnya
            if (indeksAktif !== null) {
                let oldSub = daftarTugasUser[indeksAktif].subTugas.find(s => s.nama === val);
                if (oldSub) isSelesai = oldSub.isSelesai;
            }
            subTugasBaru.push({ nama: val, isSelesai });
        }
    }

    let skorUrgensi = perhitunganUrgensi(new Date(tenggatRaw));
    let skorAkhir = ((BOBOT_OUTDEGREE * subTugasBaru.length) + (BOBOT_TENGGAT * skorUrgensi)).toFixed(2);

    if (indeksAktif !== null) {
        // PERBARUI TUGAS LAMA
        daftarTugasUser[indeksAktif].nama = nama;
        daftarTugasUser[indeksAktif].tenggat = tenggatRaw;
        daftarTugasUser[indeksAktif].subTugas = subTugasBaru;
        daftarTugasUser[indeksAktif].skor = skorAkhir;
    } else {
        // BUAT TUGAS BARU
        daftarTugasUser.push({
            nama, 
            tenggat: tenggatRaw, 
            subTugas: subTugasBaru, 
            skor: skorAkhir,
            jenisPengingat: "none", 
            waktuPengingatManual: ""
        });
    }

    simpanDataTugas();
    tutupSemuaModal();
};

// ==========================================
// 8. FUNGSI PENUTUP MODAL GLOBAL
// ==========================================
function tutupSemuaModal() {
    document.getElementById("modalOverlay").style.display = "none";
    document.getElementById("modalTugas").style.display = "none";
    document.getElementById("modalReminder").style.display = "none";
    document.getElementById("dropdownMenu").classList.remove("show");
    indeksAktif = null;
}
document.getElementById("btnTutupModal").onclick = tutupSemuaModal;
document.getElementById("btnTutupReminder").onclick = () => document.getElementById("modalReminder").style.display = "none";

// Klik di luar jendela untuk menutup modal
window.onclick = (e) => {
    if (e.target.id === "modalOverlay") tutupSemuaModal();
};

// ==========================================
// 9. MESIN CLOUD FIRESTORE & OTENTIKASI (TETAP SAMA)
// ==========================================
async function simpanDataTugas() {
    localStorage.setItem("dataTugas", JSON.stringify(daftarTugasUser));
    
    if (currentUserUID) {
        try {
            const docRef = doc(db, "tugasPengguna", currentUserUID);
            await setDoc(docRef, { 
                email: currentUserEmail,
                daftarTugas: daftarTugasUser 
            });
            console.log("Sukses sinkronisasi ke Cloud!");
        } catch (error) {
            console.error("Gagal menyimpan ke Cloud:", error);
        }
    }
    cetakDaftarTugas();
}

async function muatDataDariCloud(uid) {
    try {
        const docRef = doc(db, "tugasPengguna", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            daftarTugasUser = docSnap.data().daftarTugas || [];
            console.log("Data awan berhasil ditarik!");
        } else {
            daftarTugasUser = []; 
        }
        simpanDataTugas(); 
    } catch (error) {
        console.error("Gagal menarik data dari Cloud:", error);
    }
}

const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const userInfo = document.getElementById("userInfo");

btnLogin.addEventListener("click", () => {
    // Meminta prompt select_account agar bisa ganti email
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    signInWithPopup(auth, googleProvider).catch((error) => console.error("Gagal login:", error));
});

btnLogout.addEventListener("click", () => {
    signOut(auth).then(() => console.log("Berhasil keluar."));
});

// ==========================================
// 9. OTENTIKASI & NAMA PANGGILAN
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        btnLogin.style.display = "none";
        userInfo.style.display = "flex";
        
        // Mengambil nama depan saja dari Google Display Name
        let namaLengkap = user.displayName || "Mahasiswa";
        let namaDepan = namaLengkap.split(" ")[0]; 
        
        document.getElementById("userName").textContent = namaLengkap;
        document.getElementById("userEmail").textContent = user.email;
        document.getElementById("userFoto").src = user.photoURL;
        
        // Simpan nama depan ke variabel global sementara untuk sapaan
        window.namaPanggilanUser = namaDepan;
        
        currentUserUID = user.uid;
        currentUserEmail = user.email;
        await muatDataDariCloud(currentUserUID);
    } else {
        btnLogin.style.display = "block";
        userInfo.style.display = "none";
        window.namaPanggilanUser = "";
        currentUserUID = null;
        daftarTugasUser = [];
        cetakDaftarTugas();
    }
});