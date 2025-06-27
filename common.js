// Importa a função signOut do Firebase Auth para o botão de logout
import { signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // Certifica-se de que o objeto 'auth' do Firebase está disponível globalmente.
    const auth = window.auth;

    // Monitora o estado de autenticação para exibir o nome do usuário
    auth.onAuthStateChanged(user => {
        const nomeUsuarioLogadoSpan = document.getElementById("nomeUsuarioLogado");
        if (user && nomeUsuarioLogadoSpan) {
            // Se o displayName estiver definido, use-o; caso contrário, use o email
            nomeUsuarioLogadoSpan.textContent = `Olá, ${user.displayName || user.email.split('@')[0]}!`;
            nomeUsuarioLogadoSpan.style.display = 'inline';
        } else if (nomeUsuarioLogadoSpan) {
            nomeUsuarioLogadoSpan.style.display = 'none';
        }

        // Redireciona se não estiver logado e tentar acessar páginas restritas
        const currentPage = window.location.pathname.split('/').pop();
        const publicPages = ['index.html', 'cadastro.html', 'recuperar-senha.html'];
        
        if (!user && !publicPages.includes(currentPage)) {
            alert("Você precisa estar logado para acessar esta página.");
            window.location.href = "./index.html";
        }
    });

    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            signOut(auth).then(() => { 
                // localStorage.removeItem('usuarioLogadoEmail'); // Não é estritamente necessário remover manualmente após Firebase signOut
                // localStorage.removeItem('usuarioLogadoNome'); // Não é estritamente necessário remover manualmente após Firebase signOut
                window.location.href = './index.html'; 
            }).catch((error) => {
                console.error("Erro ao fazer logout:", error);
                alert("Ocorreu um erro ao sair. Tente novamente.");
            });
        });
    }

    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.abas-navegacao .aba').forEach(link => {
        if (link.getAttribute('href') === `./${currentPage}`) { 
            link.classList.add('ativa');
        } else {
            link.classList.remove('ativa');
        }
    });

    // Removi a verificação de localStorage.getItem("usuarioLogadoEmail") aqui
    // e movi para auth.onAuthStateChanged, que é a forma correta com Firebase.
});
