import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Sua configuração do Firebase SDK.
// ATENÇÃO: Substitua 'null' pelos seus próprios valores do console do Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyADrEtzjmdX5A2yq_S5Hp0QzojAgWlClU4",
  authDomain: "pensaoemdiaapp.firebaseapp.com",
  projectId: "pensaoemdiaapp",
  storageBucket: "pensaoemdiaapp.firebasestorage.app",
  messagingSenderId: "322478168070",
  appId: "1:322478168070:web:494318199ac307c7868b87",
  measurementId: "G-WZ5ZGMWJJH"
};
// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Obtém e expõe as instâncias de autenticação e Firestore globalmente
const auth = getAuth(app);
const db = getFirestore(app);

window.auth = auth;
window.db = db;
window.firebaseApp = app; // Expor o app também pode ser útil para outras funções Firebase

// Lógica para exibição do nome do usuário e controle de acesso a páginas
document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogadoNomeSpan = document.getElementById('usuarioLogadoNome');
    const logoutBtn = document.getElementById('logoutBtn');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuário está logado
            if (usuarioLogadoNomeSpan) {
                usuarioLogadoNomeSpan.textContent = user.displayName || user.email;
            }
            if (logoutBtn) {
                logoutBtn.style.display = 'block';
            }
        } else {
            // Usuário não está logado
            // Redireciona para a página de login se não estiver em uma página de acesso público
            const path = window.location.pathname;
            const publicPages = [
                '/index.html',
                '/', // Para a raiz do site
                '/cadastro.html',
                '/recuperar-senha.html'
            ];

            if (!publicPages.includes(path) && !publicPages.includes(path.replace('.html', ''))) { // Verifica com e sem .html
                window.location.href = 'index.html';
            }

            if (usuarioLogadoNomeSpan) {
                usuarioLogadoNomeSpan.textContent = ''; // Limpa o nome se não logado
            }
            if (logoutBtn) {
                logoutBtn.style.display = 'none'; // Esconde o botão se não logado
            }
        }
    });

    // Lógica para o botão de logout (centralizada aqui)
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut()
                .then(() => {
                    localStorage.removeItem("usuarioLogadoEmail");
                    localStorage.removeItem("usuarioLogadoNome");
                    // Redireciona para a página de login após o logout
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    console.error("Erro ao fazer logout:", error);
                    alert("Erro ao fazer logout. Tente novamente."); // Alerta simples em caso de erro no logout
                });
        });
    }
});


// Função auxiliar para obter o UID do usuário logado de forma confiável
// Outros scripts podem importar e usar esta função.
export function obterUsuarioLogadoId() {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Para de ouvir as mudanças após a primeira resposta
            if (user) {
                resolve(user.uid);
            } else {
                resolve(null);
            }
        }, reject);
    });
}
