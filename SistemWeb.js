// 1. IMPORT FIREBASE AUTHENTICATION
import { auth, googleProvider, db, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc } from "./firebase-config.js";
let currentUserUID = null;
let currentUserEmail = null;

const BOBOT_OUTDEGREE = 0.3;
const BOBOT_TENGGAT = 0.7;

let daftarTugasUser = JSON.parse(localStorage.getItem("dataTugas")) || [];

window.onload = function () {
    cetakDaftarTugas();
    muatDraftInput();
};

function perhitunganUrgensi(tenggat) {
    let waktuSekarang = new Date();
    let selisihWaktu = tenggat - waktuSekarang;
    let sisaHari = Math.ceil(selisihWaktu / (1000 * 60 * 60 * 24));
    if (sisaHari < 0) sisaHari = 0;
    return (1 / (sisaHari + 1)) * 5;
}

function bersihkanForm() {
    document.getElementById("inputNamaTugas").value = "";
    document.getElementById("inputTenggat").value = "";

    let semuaInputSub = document.getElementsByClassName("input-sub-tugas");
    while (semuaInputSub.length > 1) {
        semuaInputSub[semuaInputSub.length - 1].remove();
    }

    semuaInputSub[0].value = "";
    semuaInputSub[0].placeholder = "Sub-tugas 1...";

    hapusDraftInput();
}

// ==========================================
// LOGIKA TOMBOL TAMBAH SUB-TUGAS DINAMIS
// ==========================================

// Tombol untuk panel input utama
document.getElementById("btnTambahSub").addEventListener("click", function() {
    const wadah = document.getElementById("wadahSubTugas");
    const jumlahSaatIni = wadah.getElementsByClassName("input-sub-tugas").length;
    
    let inputBaru = document.createElement("input");
    inputBaru.type = "text";
    inputBaru.className = "input-sub-tugas form-control";
    inputBaru.placeholder = "Sub-tugas " + (jumlahSaatIni + 1) + "...";
    wadah.appendChild(inputBaru);
    inputBaru.focus();
    simpanDraftInput();
});

// Tombol untuk jendela modal edit
document.getElementById("btnTambahEditSub").addEventListener("click", function() {
    const wadah = document.getElementById("wadahEditSubTugas");
    const jumlahSaatIni = wadah.getElementsByClassName("edit-sub-tugas").length;
    
    let inputBaru = document.createElement("input");
    inputBaru.type = "text";
    inputBaru.className = "edit-sub-tugas form-control";
    inputBaru.placeholder = "Sub-tugas " + (jumlahSaatIni + 1) + "...";
    wadah.appendChild(inputBaru);
    inputBaru.focus();
});

document.getElementById("tombolKosongkan").addEventListener("click", function () {
    if (confirm("Kosongkan semua inputan yang sedang diketik?")) {
        bersihkanForm();
    }
});

const tombolSimpan = document.getElementById("tombolSimpan");
tombolSimpan.addEventListener("click", function () {
    let nama = document.getElementById("inputNamaTugas").value.trim();
    let tenggatRaw = document.getElementById("inputTenggat").value;

    if (!nama || !tenggatRaw) {
        alert("Nama dan Tenggat wajib diisi!");
        return;
    }

    let semuaInputSub = document.getElementsByClassName("input-sub-tugas");
    let subTugas = [];
    for (let input of semuaInputSub) {
        if (input.value.trim() !== "") subTugas.push({ nama: input.value, isSelesai: false });
    }

    let skorUrgensi = perhitunganUrgensi(new Date(tenggatRaw));
    let skorAkhir = (BOBOT_OUTDEGREE * subTugas.length) + (BOBOT_TENGGAT * skorUrgensi);

    daftarTugasUser.push({
        nama,
        tenggat: tenggatRaw,
        subTugas,
        skor: skorAkhir.toFixed(2)
    });

    simpanDataTugas();
    bersihkanForm();
});


function simpanDraftInput() {
    let subValues = Array.from(document.getElementsByClassName("input-sub-tugas")).map(i => i.value);
    let draft = {
        nama: document.getElementById("inputNamaTugas").value,
        tenggat: document.getElementById("inputTenggat").value,
        subs: subValues
    };
    localStorage.setItem("draftInput", JSON.stringify(draft));
}

function muatDraftInput() {
    let draft = JSON.parse(localStorage.getItem("draftInput"));
    if (draft) {
        document.getElementById("inputNamaTugas").value = draft.nama;
        document.getElementById("inputTenggat").value = draft.tenggat;

        const wadah = document.getElementById("wadahSubTugas");
        wadah.innerHTML = "";
        draft.subs.forEach((val, index) => {
            let input = document.createElement("input");
            input.type = "text";
            input.className = "input-sub-tugas form-control";
            input.value = val;
            input.placeholder = "Sub-tugas " + (index + 1) + "...";
            wadah.appendChild(input);
        });
    }
}

function hapusDraftInput() {
    localStorage.removeItem("draftInput");
}

document.addEventListener("input", function (e) {
    if (e.target.id === "inputNamaTugas" || e.target.id === "inputTenggat" || e.target.classList.contains("input-sub-tugas")) {
        simpanDraftInput();
    }
});

function toggleSubTugas(indeksTugas, indeksSub) {
    daftarTugasUser[indeksTugas].subTugas[indeksSub].isSelesai = !daftarTugasUser[indeksTugas].subTugas[indeksSub].isSelesai;

    if (daftarTugasUser[indeksTugas].subTugas[indeksSub].isSelesai === false) {
        for (let k = indeksSub + 1; k < daftarTugasUser[indeksTugas].subTugas.length; k++) {
            daftarTugasUser[indeksTugas].subTugas[k].isSelesai = false;
        }
    }

    simpanDataTugas();
}


function hapusTugas(indeksTugas) {
    let konfirmasi = confirm(`Apakah Anda yakin ingin menghapus tugas "${daftarTugasUser[indeksTugas].nama}"?`);
    if (konfirmasi) {
        daftarTugasUser.splice(indeksTugas, 1);
        simpanDataTugas();
    }
}


function cetakDaftarTugas() {
    const wadah = document.getElementById("wadahDaftarTugas");
    wadah.innerHTML = "";

    daftarTugasUser.forEach((tugas, i) => {
        let div = document.createElement("div");
        div.style = "border: 1px solid #ccc; padding: 15px; border-radius: 8px; background: white; margin-bottom: 15px;";

        let listSubTugasHTML = tugas.subTugas.map((sub, j) => {
            let isTerbuka = (j === 0) || (tugas.subTugas[j - 1].isSelesai === true);
            let gayaTeks = sub.isSelesai ? 'text-decoration: line-through; color: #aaa;' : (isTerbuka ? 'color: #000;' : 'color: #ccc;');
            let atributCheckbox = sub.isSelesai ? 'checked' : '';
            let atributKunci = isTerbuka ? '' : 'disabled';

            return `
                <li style="${gayaTeks} margin-bottom: 8px;">
                    <input type="checkbox" onchange="toggleSubTugas(${i}, ${j})" ${atributCheckbox} ${atributKunci}> 
                    ${sub.nama}
                </li>`;
        }).join('');

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <strong style="font-size: 18px; color: #333;">#${i + 1} - ${tugas.nama}</strong> <br>
                    <div style="margin-top: 5px; font-size: 13px;">
                        <span style="background: #ffeeba; color: #856404; padding: 3px 8px; border-radius: 12px; font-weight: bold; margin-right: 8px;">Skor: ${tugas.skor}</span>
                        <span style="color: #666;">🗓️ ${tugas.tenggat.replace('T', ' ')}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="bukaModalEdit(${i})" style="background-color: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">Edit</button>
                    <button onclick="hapusTugas(${i})" style="background-color: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">Hapus</button>
                </div>
            </div>
            <ul style="list-style-type: none; padding-left: 5px; margin-top: 18px; font-size: 15px;">
                ${listSubTugasHTML}
            </ul>
        `;

        wadah.appendChild(div);
    });
}

let indeksTugasAktif = null;

const opsiReminder = document.getElementById("opsiReminder");
const editManualReminder = document.getElementById("editManualReminder");

opsiReminder.addEventListener("change", function () {
    if (opsiReminder.value === "manual") {
        editManualReminder.style.display = "block";
    } else {
        editManualReminder.style.display = "none";
    }
});

function bukaModalEdit(indeks) {
    indeksTugasAktif = indeks;
    let tugas = daftarTugasUser[indeks];

    document.getElementById("editNamaTugas").value = tugas.nama;
    document.getElementById("editTenggat").value = tugas.tenggat;

    wadahEditSubTugas.innerHTML = "";
    tugas.subTugas.forEach((sub, index) => {
        let input = document.createElement("input");
        input.type = "text";
        input.className = "edit-sub-tugas form-control";
        input.value = sub.nama;
        input.placeholder = "Sub-tugas " + (index + 1) + "...";
        wadahEditSubTugas.appendChild(input);
    });
    
    opsiReminder.value = tugas.jenisPengingat || "none";
    if (opsiReminder.value === "manual") {
        editManualReminder.style.display = "block";
        editManualReminder.value = tugas.waktuPengingatManual || "";
    } else {
        editManualReminder.style.display = "none";
        editManualReminder.value = "";
    }

    document.getElementById("modalOverlay").style.display = "block";
    document.getElementById("modalEdit").style.display = "block";
}

function tutupModal() {
    document.getElementById("modalOverlay").style.display = "none";
    document.getElementById("modalEdit").style.display = "none";
    indeksTugasAktif = null;
}
document.getElementById("btnBatalEdit").addEventListener("click", tutupModal);

document.getElementById("btnSimpanEdit").addEventListener("click", function () {
    let namaBaru = document.getElementById("editNamaTugas").value.trim();
    let tenggatBaru = document.getElementById("editTenggat").value;

    if (!namaBaru || !tenggatBaru) {
        alert("Nama dan Tenggat tidak boleh kosong!");
        return;
    }

    if (opsiReminder.value === "manual") {
        if (!editManualReminder.value) {
            alert("Silakan masukkan waktu alarm manual!");
            return;
        }

        let waktuTenggat = new Date(tenggatBaru).getTime();
        let waktuAlarm = new Date(editManualReminder.value).getTime();

        if (waktuAlarm >= waktuTenggat) {
            alert("GAGAL: Waktu pengingat (alarm) harus dipasang LEBIH AWAL dari waktu tenggat!");
            return;
        }
    }

    let semuaEditSub = document.getElementsByClassName("edit-sub-tugas");
    let subTugasBaru = [];
    let oldSubTugas = daftarTugasUser[indeksTugasAktif].subTugas;

    for (let i = 0; i < semuaEditSub.length; i++) {
        let val = semuaEditSub[i].value.trim();
        if (val !== "") {
            let statusSelesai = (oldSubTugas[i] && oldSubTugas[i].nama === val) ? oldSubTugas[i].isSelesai : false;
            subTugasBaru.push({ nama: val, isSelesai: statusSelesai });
        }
    }

    daftarTugasUser[indeksTugasAktif].nama = namaBaru;
    daftarTugasUser[indeksTugasAktif].tenggat = tenggatBaru;
    daftarTugasUser[indeksTugasAktif].subTugas = subTugasBaru;
    daftarTugasUser[indeksTugasAktif].jenisPengingat = opsiReminder.value;
    daftarTugasUser[indeksTugasAktif].waktuPengingatManual = editManualReminder.value;

    let skorUrgensiBaru = perhitunganUrgensi(new Date(tenggatBaru));
    daftarTugasUser[indeksTugasAktif].skor = ((BOBOT_OUTDEGREE * subTugasBaru.length) + (BOBOT_TENGGAT * skorUrgensiBaru)).toFixed(2);

    simpanDataTugas();
    tutupModal();
});

// ==========================================
// MESIN CLOUD FIRESTORE (DATABASE)
// ==========================================

// Fungsi untuk menyimpan data ke Cloud
async function simpanDataTugas() {
    // 1. Urutkan berdasarkan skor tertinggi
    daftarTugasUser.sort((a, b) => b.skor - a.skor);
    
    // 2. Simpan ke penyimpanan lokal browser (sebagai cadangan)
    localStorage.setItem("dataTugas", JSON.stringify(daftarTugasUser));
    
    // 3. Tembakkan ke Cloud Firestore JIKA pengguna sudah Login
    if (currentUserUID) {
        try {
            // Menyiapkan dokumen dengan nama file berupa UID pengguna
            const docRef = doc(db, "tugasPengguna", currentUserUID);
            // Menyimpan seluruh array tugas ke dalam database
            await setDoc(docRef, { 
                email: currentUserEmail,
                daftarTugas: daftarTugasUser 
            });
            console.log("Sukses: Data tersimpan di Cloud Database!");
        } catch (error) {
            console.error("Gagal menyimpan ke Cloud:", error);
        }
    }
    
    // 4. Cetak ulang ke layar
    cetakDaftarTugas();
}

// Fungsi untuk menarik data dari Cloud saat pertama kali Login
async function muatDataDariCloud(uid) {
    try {
        const docRef = doc(db, "tugasPengguna", uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            // Jika ada data di server, timpa data lokal dengan data server
            daftarTugasUser = docSnap.data().daftarTugas || [];
            console.log("Sukses: Data berhasil ditarik dari Cloud!");
        } else {
            // Jika pengguna baru, kosongkan
            daftarTugasUser = []; 
        }
        
        simpanDataTugas(); // Update layar
    } catch (error) {
        console.error("Gagal menarik data dari Cloud:", error);
    }
}

// ==========================================
// FIX SCOPE UNTUK JAVASCRIPT MODULE
// ==========================================
// Karena file ini sekarang adalah "Module", fungsi tidak lagi bersifat global.
// Kita harus mendaftarkannya ke objek 'window' agar bisa dipanggil oleh tombol di HTML (onclick)
window.hapusTugas = hapusTugas;
window.toggleSubTugas = toggleSubTugas;
window.bukaModalEdit = bukaModalEdit;
window.tutupModal = tutupModal;

// ==========================================
// LOGIKA OTENTIKASI GOOGLE (LOGIN & LOGOUT)
// ==========================================
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const userInfo = document.getElementById("userInfo");

// Fungsi ketika tombol Login diklik
btnLogin.addEventListener("click", () => {
    signInWithPopup(auth, googleProvider)
        .then((result) => {
            console.log("Berhasil masuk sebagai:", result.user.displayName);
        })
        .catch((error) => {
            console.error("Gagal login:", error);
            alert("Terjadi kesalahan saat login!");
        });
});

// Fungsi ketika tombol Logout diklik
btnLogout.addEventListener("click", () => {
    signOut(auth).then(() => {
        console.log("Berhasil keluar.");
    });
});

// Pemantau Status Login (Berjalan otomatis saat halaman direfresh)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // --- JIKA LOGIN ---
        btnLogin.style.display = "none";
        userInfo.style.display = "flex";
        document.getElementById("userName").textContent = user.displayName;
        document.getElementById("userFoto").src = user.photoURL;
        
        // Simpan UID dan tarik data miliknya dari server
        currentUserUID = user.uid;
        currentUserEmail = user.email;
        await muatDataDariCloud(currentUserUID);
        
    } else {
        // --- JIKA LOGOUT / BELUM LOGIN ---
        btnLogin.style.display = "block";
        userInfo.style.display = "none";
        
        // Hapus UID dan bersihkan layar dari tugas orang lain
        currentUserUID = null;
        daftarTugasUser = [];
        cetakDaftarTugas();
    }
});