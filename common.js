// common.js

document.addEventListener("DOMContentLoaded", () => {
    // Exibe o nome do usuário logado no cabeçalho
    const nomeUsuario = localStorage.getItem("usuarioLogadoNome");
    
    // CORREÇÃO: Usando o ID 'nomeUsuarioLogado' para corresponder ao HTML
    const nomeUsuarioLogadoSpan = document.getElementById("nomeUsuarioLogado"); 
    
    if (nomeUsuario && nomeUsuarioLogadoSpan) {
        nomeUsuarioLogadoSpan.textContent = `Olá, ${nomeUsuario}!`;
    } else if (nomeUsuarioLogadoSpan) {
        // Se não houver nome, esconde o elemento
        nomeUsuarioLogadoSpan.style.display = 'none'; 
    }

    // Lógica de logout
    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('usuarioLogadoEmail');
            localStorage.removeItem('usuarioLogadoNome');
            window.location.href = 'index.html'; // Redireciona para a página de login
        });
    }

    // Define a classe 'ativa' para a aba da página atual na navegação
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.abas-navegacao .aba').forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('ativa');
        } else {
            link.classList.remove('ativa');
        }
    });

    // Redirecionamento de segurança para páginas pós-login
    const usuarioLogadoEmail = localStorage.getItem("usuarioLogadoEmail");
    // 'cadastro.html' é provavelmente sua página de registro de usuário (inicial)
    if (!usuarioLogadoEmail && currentPage !== 'index.html' && currentPage !== 'cadastro.html') {
        alert("Você precisa estar logado para acessar esta página.");
        window.location.href = "index.html"; // Redireciona para o login
        return; // Importante para parar a execução do script da página atual
    }
});