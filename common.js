import { signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // Acessa window.auth que é definido no HTML
    const auth = window.auth;

    // Garante que o nome do usuário logado seja exibido/ocultado
    auth.onAuthStateChanged(user => {
        const nomeUsuarioLogadoSpan = document.getElementById("nomeUsuarioLogado");
        if (user && nomeUsuarioLogadoSpan) {
            nomeUsuarioLogadoSpan.textContent = `Olá, ${user.displayName || user.email.split('@')[0]}!`;
            nomeUsuarioLogadoSpan.style.display = 'inline';
        } else if (nomeUsuarioLogadoSpan) {
            nomeUsuarioLogadoSpan.style.display = 'none';
        }

        // Redireciona usuários não logados de páginas restritas
        const currentPage = window.location.pathname.split('/').pop();
        const publicPages = ['index.html', 'cadastro.html', 'recuperar-senha.html'];
        
        if (!user && !publicPages.includes(currentPage)) {
            alert("Você precisa estar logado para acessar esta página.");
            window.location.href = "./index.html";
        }
    });

    // Lógica para o botão de Logout
    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            signOut(auth).then(() => { 
                window.location.href = './index.html'; 
            }).catch((error) => {
                console.error("Erro ao fazer logout:", error);
                alert("Ocorreu um erro ao sair. Tente novamente.");
            });
        });
    }

    // Marca a aba de navegação ativa
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.abas-navegacao .aba').forEach(link => {
        if (link.getAttribute('href') === `./${currentPage}`) { 
            link.classList.add('ativa');
        } else {
            link.classList.remove('ativa');
        }
    });
});
