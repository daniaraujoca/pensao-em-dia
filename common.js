// common.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Suas credenciais do Firebase
const firebaseConfig = {
    apiKey: "SEU_API_KEY_AQUI", // SUBSTITUA PELA SUA API KEY REAL
    authDomain: "pensaoemdiaapp.firebaseapp.com",
    projectId: "pensaoemdiaapp",
    storageBucket: "pensaoemdiaapp.firebasestorage.app",
    messagingSenderId: "322478168070",
    appId: "1:322478168070:web:494318199ac307c7868b87",
    measurementId: "G-WZ5ZGMWJJH"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Obtém as instâncias de Auth e Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// Adiciona o listener para o estado de autenticação
document.addEventListener("DOMContentLoaded", function() {
    const nomeUsuarioLogado = document.getElementById("nomeUsuarioLogado");
    const logoutBtn = document.getElementById("logoutBtn");

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuário está logado
            if (nomeUsuarioLogado) { // Verifica se o elemento existe (não existirá nas páginas de login/cadastro)
                nomeUsuarioLogado.textContent = `Bem-vindo(a), ${user.email}`;
            }

            // Redireciona para gestao.html se estiver em login/cadastro
            const currentPath = window.location.pathname;
            if (currentPath === '/' || currentPath.includes('index.html') || currentPath.includes('cadastro.html')) {
                window.location.href = "gestao.html";
            }
        } else {
            // Usuário não está logado
            if (nomeUsuarioLogado) {
                nomeUsuarioLogado.textContent = "";
            }

            // Redireciona para index.html se não estiver em login/cadastro
            const currentPath = window.location.pathname;
            if (!currentPath.includes('index.html') && !currentPath.includes('cadastro.html')) {
                window.location.href = "index.html";
            }
            // Limpa dados locais se houver algum vestígio de sessão anterior
            localStorage.removeItem("usuarioLogadoEmail");
            localStorage.removeItem("filhosPorUsuario");
        }
    });

    // Listener para o botão de logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                // Limpar localStorage relacionado ao usuário ao deslogar
                localStorage.removeItem("usuarioLogadoEmail");
                localStorage.removeItem("filhosPorUsuario"); // Remover os dados locais antigos ao deslogar
                window.location.href = "index.html"; // Redireciona para a página de login
            }).catch((error) => {
                console.error("Erro ao fazer logout:", error);
                alert("Erro ao fazer logout. Tente novamente.");
            });
        });
    }
});
