// 1. Mengimpor fungsi inti menggunakan versi 12.14.0 (Sesuai web Firebase Anda)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";

// 2. Mengimpor modul Otentikasi dan Firestore dari versi yang sama (12.14.0)
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// 3. Konfigurasi asli milik Anda (Tidak ada yang diubah)
const firebaseConfig = {
  apiKey: "AIzaSyB5zjfS-LkiTtqx4AWDE4Llfuz9HnEPURA",
  authDomain: "prioritas-tugas-dan-reminder.firebaseapp.com",
  projectId: "prioritas-tugas-dan-reminder",
  storageBucket: "prioritas-tugas-dan-reminder.firebasestorage.app",
  messagingSenderId: "731266880799",
  appId: "1:731266880799:web:1454d8bd6c7bc21f6dcc2a"
};

// 4. Menyalakan mesin Firebase
const app = initializeApp(firebaseConfig);

// 5. Menyiapkan layanan Auth dan Database
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

// 6. BAGIAN PALING PENTING: Mengekspor mesin agar bisa dipakai di SistemWeb.js
export { 
  auth, 
  googleProvider, 
  db, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  setDoc, 
  getDoc 
};