// common.js - Versão sem Firebase, adaptada para backend Flask

document.addEventListener("DOMContentLoaded", function () {
    const nomeUsuarioLogadoSpan = document.getElementById("nomeUsuarioLogado");
    const logoutButton = document.getElementById("logoutBtn");
    const currentPage = window.location.pathname.split('/').pop(); // Obtém o nome do arquivo da página atual

    // --- Lógica de Verificação de Login ---
    const usuarioLogadoEmail = localStorage.getItem("usuarioLogadoEmail");
    const usuarioLogadoNome = localStorage.getItem("usuarioLogadoNome");

    if (nomeUsuarioLogadoSpan) {
        if (usuarioLogadoNome) {
            nomeUsuarioLogadoSpan.textContent = `Bem-vindo(a), ${usuarioLogadoNome}!`;
            nomeUsuarioLogadoSpan.style.display = 'inline'; // Mostra o nome
        } else if (usuarioLogadoEmail) {
            // Caso o nome não esteja no localStorage, usa o email
            nomeUsuarioLogadoSpan.textContent = `Bem-vindo(a), ${usuarioLogadoEmail}!`;
            nomeUsuarioLogadoSpan.style.display = 'inline';
        } else {
            nomeUsuarioLogadoSpan.style.display = 'none';
        }

        // Redireciona para o login se não estiver logado e não estiver nas páginas permitidas
        if (!usuarioLogadoEmail &&
            currentPage !== 'index.html' &&
            currentPage !== 'cadastro.html' &&
            currentPage !== 'recuperar-senha.html' &&
            currentPage !== '' // Lida com o caso da URL raiz (ex: http://127.0.0.1:5000/)
        ) {
            alert("Você precisa estar logado para acessar esta página.");
            window.location.href = "./index.html";
        }
    }

    // --- Lógica de Logout ---
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => { // Adicionado 'async'
            try {
                const response = await fetch('/api/logout', { // Chama o endpoint de logout no Flask
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    // Limpa o localStorage após o logout bem-sucedido no backend
                    localStorage.removeItem('usuarioLogadoEmail');
                    localStorage.removeItem('usuarioLogadoNome');
                    alert("Você foi desconectado(a) com sucesso!");
                    window.location.href = './index.html'; // Redireciona para a página de login
                } else {
                    const errorData = await response.json();
                    console.error("Erro ao fazer logout no backend:", errorData.message);
                    alert(`Ocorreu um erro ao sair: ${errorData.message || 'Tente novamente.'}`);
                }
            } catch (error) {
                console.error("Erro de rede ao fazer logout:", error);
                alert("Não foi possível conectar ao servidor para fazer logout. Verifique sua conexão.");
            }
        });
    }

    // --- Marca a aba ativa (se houver navegação no cabeçalho) ---
    document.querySelectorAll('.abas-navegacao .aba').forEach(link => {
        // Normaliza o href para comparar com currentPage
        const linkHref = link.getAttribute('href').split('/').pop();
        if (linkHref === currentPage) {
            link.classList.add('ativa');
        } else {
            link.classList.remove('ativa');
        }
    });
});