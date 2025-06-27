// common.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Suas credenciais do Firebase - PREENCHIDAS
const firebaseConfig = {
    apiKey: "AIzaSyADrEtzjmdX5A2yq_S5Hp0QzojAgWlClU4",
    authDomain: "pensaoemdiaapp.firebaseapp.com",
    projectId: "pensaoemdiaapp",
    storageBucket: "pensaoemdiaapp.firebasestorage.app",
    messagingSenderId: "322478168070",
    appId: "1:322478168070:web:494318199ac307c7868b87",
    measurementId: "G-WZ5ZGMWJJH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", function() {
    const nomeUsuarioLogado = document.getElementById("nomeUsuarioLogado");
    const logoutBtn = document.getElementById("logoutBtn");

    onAuthStateChanged(auth, (user) => {
        const currentPath = window.location.pathname;

        if (user) {
            if (nomeUsuarioLogado) {
                nomeUsuarioLogado.textContent = `Bem-vindo(a), ${user.email}`;
            }
            if (currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('/cadastro.html')) {
                window.location.href = "gestao.html";
            }
        } else {
            if (nomeUsuarioLogado) {
                nomeUsuarioLogado.textContent = "";
            }
            if (!currentPath.endsWith('/index.html') && !currentPath.endsWith('/cadastro.html')) {
                window.location.href = "index.html";
            }
            localStorage.removeItem("usuarioLogadoEmail");
            localStorage.removeItem("filhosPorUsuario");
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                localStorage.removeItem("usuarioLogadoEmail");
                localStorage.removeItem("filhosPorUsuario");
                window.location.href = "index.html";
            }).catch((error) => {
                console.error("Erro ao fazer logout:", error);
                alert("Erro ao fazer logout. Tente novamente.");
            });
        });
    }
});
