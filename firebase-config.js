import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

// Dán cấu hình Web App lấy từ Firebase Console vào đây.
export const firebaseConfig = {
  apiKey: "AIzaSyCed6iTfJ7cJc7rCWH8LajkgYClfiHuIrI",
  authDomain: "hogiadinh-tankhanh.firebaseapp.com",
  projectId: "hogiadinh-tankhanh",
  storageBucket: "hogiadinh-tankhanh.firebasestorage.app",
  messagingSenderId: "965103117228",
  appId: "1:965103117228:web:059cd98d2d03974f709009",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
