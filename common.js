// common.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyADrEtzjmdX5A2yq_S5Hp0QzojAgWlClU4", // SEU API KEY
    authDomain: "pensaoemdiaapp.firebaseapp.com",
    projectId: "pensaoemdiaapp",
    storageBucket: "pensaoemdiaapp.firebasestorage.app",
    messagingSenderId: "322478168070",
    appId: "1:322478168070:web:494318199ac307c7868b87",
    measurementId: "G-WZ5ZGMWJJH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // EXPORTAR auth
export const db = getFirestore(app); // EXPORTAR db

// Restante do common.js (código de autenticação, etc.)
document.addEventListener("DOMContentLoaded", function() {
    const nomeUsuarioLogado = document.getElementById("nomeUsuarioLogado");
    const logoutBtn = document.getElementById("logoutBtn");

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuário está logado
            nomeUsuarioLogado.textContent = `Bem-vindo(a), ${user.email}`;
            // Redireciona para gestao.html se estiver em login/cadastro
            if (window.location.pathname === '/' || window.location.pathname.includes('index.html') || window.location.pathname.includes('cadastro.html')) {
                window.location.href = "gestao.html";
            }
        } else {
            // Usuário não está logado
            nomeUsuarioLogado.textContent = "";
            // Redireciona para index.html se não estiver em login/cadastro
            if (!window.location.pathname.includes('index.html') && !window.location.pathname.includes('cadastro.html')) {
                window.location.href = "index.html";
            }
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                // Limpar localStorage relacionado ao usuário
                localStorage.removeItem("usuarioLogadoEmail");
                localStorage.removeItem("filhosPorUsuario"); // Remover os dados locais ao deslogar
                window.location.href = "index.html"; // Redireciona para a página de login
            }).catch((error) => {
                console.error("Erro ao fazer logout:", error);
                alert("Erro ao fazer logout. Tente novamente.");
            });
        });
    }
});
