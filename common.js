// common.js
// Importa a função signOut do Firebase Auth para o botão de logout
import { signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // Certifica-se de que o objeto 'auth' do Firebase está disponível globalmente.
    const auth = window.auth;

    const nomeUsuario = localStorage.getItem("usuarioLogadoNome");
    const nomeUsuarioLogadoSpan = document.getElementById("nomeUsuarioLogado");

    if (nomeUsuario && nomeUsuarioLogadoSpan) {
        nomeUsuarioLogadoSpan.textContent = `Olá, ${nomeUsuario}!`;
    } else if (nomeUsuarioLogadoSpan) {
        nomeUsuarioLogadoSpan.style.display = 'none';
    }

    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            // Usa a função importada para fazer o logout do Firebase
            signOut(auth).then(() => { // Note: auth é o primeiro argumento
                localStorage.removeItem('usuarioLogadoEmail');
                localStorage.removeItem('usuarioLogadoNome');
                window.location.href = './index.html'; // Caminho corrigido
            }).catch((error) => {
                console.error("Erro ao fazer logout:", error);
                alert("Ocorreu um erro ao sair. Tente novamente.");
            });
        });
    }

    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.abas-navegacao .aba').forEach(link => {
        if (link.getAttribute('href') === `./${currentPage}`) { // Caminho corrigido
            link.classList.add('ativa');
        } else {
            link.classList.remove('ativa');
        }
    });

    const usuarioLogadoEmail = localStorage.getItem("usuarioLogadoEmail");
    if (!usuarioLogadoEmail && currentPage !== 'index.html' && currentPage !== 'cadastro.html') {
        alert("Você precisa estar logado para acessar esta página.");
        window.location.href = "./index.html"; // Caminho corrigido
        return; 
    }
});
