const Bobot_Kesulitan = 0.4;
const Bobot_Tenggat = 0.4;
const Bobot_Outdegree = 0.2;

console.log("=== Daftar Tugas ===");
let DaftarTugas = [
    {
        idTugas: "Tugas A",
        namaTugas: "Bahasa Inggris",
        Keterangan: "Mengerjakan Tugas Pertemuan 3",
        SkorKesulitan: 2,
        Tenggat: new Date("2026-04-20T20:00:00"),
        SkorPrioritas: 0,
        subTugas: [
            { idSubTugas: "Tugas A.1", namaSubTugas: "Membaca Materi", StatusSubTugas: false, Prasyarat: [] },
            { idSubTugas: "Tugas A.2", namaSubTugas: "Membuat Resume", StatusSubTugas: false, Prasyarat: ["Tugas A.1"] },
            { idSubTugas: "Tugas A.3", namaSubTugas: "Mengerjakan Kuis 1", StatusSubTugas: false, Prasyarat: ["Tugas A.2"] }
        ]
    },
    {
        idTugas: "Tugas B",
        namaTugas: "Kalkulus",
        Keterangan: "Mengerjakan Latihan Soal",
        SkorKesulitan: 5,
        Tenggat: new Date("2026-04-18T15:00:00"),
        SkorPrioritas: 0,
        subTugas: [
            { idSubTugas: "Tugas B.1", namaSubTugas: "Membaca Materi", StatusSubTugas: false, Prasyarat: [] }
        ]
    }
];

console.log("=== Total Tugas:", DaftarTugas.length, "===");

function PerhitunganUrgensi(Tenggat) {
    let waktuSekarang = new Date();
    let selisihWaktu = Tenggat - waktuSekarang;
    let sisaWaktu = Math.ceil(selisihWaktu / (1000 * 60 * 60 * 24));

    if (sisaWaktu <= 1) {
        return 5;
    } else if (sisaWaktu <= 3) {
        return 4;
    } else if (sisaWaktu <= 5) {
        return 3;
    } else if (sisaWaktu <= 7) {
        return 2;
    } else {
        return 1;
    }
}

console.log("=== Perhitungan Skor Urgensi ===");
console.log("Skor Urgensi Tugas Inggris:", PerhitunganUrgensi(DaftarTugas[0].Tenggat));
console.log("Skor Urgensi Tugas Kalkulus:", PerhitunganUrgensi(DaftarTugas[1].Tenggat));