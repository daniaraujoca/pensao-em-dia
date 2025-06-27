// common.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
// getAnalytics não é estritamente necessário para a funcionalidade de autenticação/firestore aqui,
// mas se você o usa em outras partes do seu app, pode adicioná-lo.
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";

// Suas credenciais do Firebase - PREENCHIDAS COM AS INFORMAÇÕES QUE VOCÊ FORNECEU
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

// Obtém as instâncias de Auth e Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);
// Se você for usar o Analytics em common.js ou em outro módulo que importe common.js, descomente abaixo:
// export const analytics = getAnalytics(app);


// Adiciona o listener para o estado de autenticação após o DOM ser completamente carregado
document.addEventListener("DOMContentLoaded", function() {
    const nomeUsuarioLogado = document.getElementById("nomeUsuarioLogado");
    const logoutBtn = document.getElementById("logoutBtn");

    // Observa mudanças no estado de autenticação
    onAuthStateChanged(auth, (user) => {
        const currentPath = window.location.pathname;

        if (user) {
            // Usuário está logado
            if (nomeUsuarioLogado) {
                // Exibe o email do usuário no cabeçalho, se o elemento existir
                nomeUsuarioLogado.textContent = `Bem-vindo(a), ${user.email}`;
            }

            // Se o usuário estiver logado e tentar acessar a página de login ou cadastro,
            // redireciona-o para a página de gestão.
            // Verifica os caminhos completos para evitar problemas com subdiretórios ou nomes de arquivo exatos.
            if (currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('/cadastro.html')) {
                window.location.href = "gestao.html";
            }
        } else {
            // Usuário NÃO está logado
            if (nomeUsuarioLogado) {
                // Limpa o texto do nome do usuário no cabeçalho
                nomeUsuarioLogado.textContent = "";
            }

            // Se o usuário não está logado e tentar acessar uma página que exige autenticação,
            // redireciona-o para a página de login.
            // (Verifica se NÃO É a página de login nem a de cadastro para evitar loops de redirecionamento)
            if (!currentPath.endsWith('/index.html') && !currentPath.endsWith('/cadastro.html')) {
                window.location.href = "index.html";
            }
            
            // Limpa dados antigos do localStorage para garantir que não haja conflitos
            // com a nova lógica baseada em Firestore, caso ainda existam.
            localStorage.removeItem("usuarioLogadoEmail");
            localStorage.removeItem("filhosPorUsuario");
        }
    });

    // Adiciona o event listener para o botão de logout, se ele existir na página
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                // Sucesso no logout: limpa dados locais e redireciona
                localStorage.removeItem("usuarioLogadoEmail");
                localStorage.removeItem("filhosPorUsuario");
                window.location.href = "index.html";
            }).catch((error) => {
                // Erro no logout
                console.error("Erro ao fazer logout:", error);
                alert("Erro ao fazer logout. Tente novamente.");
            });
        });
    }
});
