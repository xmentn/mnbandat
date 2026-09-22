import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Cấu hình Firebase của website
const firebaseConfig = {
  apiKey: "AIzaSyAcNBecAJL-UTQIEYKdSsBoPeKi6aTITcA",

  authDomain: "mamnon-tankhanh2.firebaseapp.com",

  projectId: "mamnon-tankhanh2",

  storageBucket: "mamnon-tankhanh2.firebasestorage.app",

  messagingSenderId: "823246745722",

  appId: "1:823246745722:web:ecfca72e7fed4f81c2cbc3",
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Firebase Authentication
const auth = getAuth(app);

// Khởi tạo Cloud Firestore
const db = getFirestore(app);

// Kiểm tra Firebase đã được khởi tạo
console.log("Firebase đã khởi tạo thành công:", app.options.projectId);

// Cho phép các file JavaScript khác sử dụng
export { app, auth, db };
