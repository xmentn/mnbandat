import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const form = document.querySelector("#loginForm");
const message = document.querySelector("#loginMessage");

onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "index.html";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Đang đăng nhập...";
  try {
    await signInWithEmailAndPassword(
      auth,
      document.querySelector("#email").value.trim(),
      document.querySelector("#password").value
    );
  } catch (error) {
    console.error(error);
    message.textContent = "Không đăng nhập được. Kiểm tra email/mật khẩu và thử lại.";
  }
});
