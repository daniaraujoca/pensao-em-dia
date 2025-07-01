// redefinir-senha.js

document.addEventListener("DOMContentLoaded", function() {
    // Obter referências aos elementos do DOM
    const redefinirSenhaForm = document.getElementById("redefinirSenhaForm");
    const novaSenhaInput = document.getElementById("novaSenha");
    const confirmarSenhaInput = document.getElementById("confirmarSenha");
    const feedbackRedefinicaoDiv = document.getElementById("feedbackRedefinicao");

    // URL base do seu backend Flask
    const BACKEND_BASE_URL = "http://127.0.0.1:5000"; // <<--- CORREÇÃO AQUI: Aponta para o Flask

    // Função para extrair o token da URL
    function getTokenFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        console.log("Token lido da URL:", token); // <<--- MENSAGEM DE DEBUG AQUI
        return token;
    }

    const token = getTokenFromUrl();

    // Se não houver token na URL, redirecionar ou exibir uma mensagem de erro
    if (!token) {
        displayFeedback("Token de redefinição de palavra-passe em falta ou inválido.", "error");
        // Opcional: redirecionar para a página de solicitação de recuperação após um tempo
        setTimeout(() => {
            window.location.href = 'recuperar-senha.html';
        }, 3000); 
        return; // Parar a execução do script
    }

    // Adicionar um ouvinte de evento para a submissão do formulário
    redefinirSenhaForm.addEventListener("submit", async function(event) {
        event.preventDefault(); // Prevenir o comportamento padrão de submissão do formulário

        const novaSenha = novaSenhaInput.value;
        const confirmarSenha = confirmarSenhaInput.value;

        // Validar se as palavras-passe não estão vazias
        if (!novaSenha || !confirmarSenha) {
            displayFeedback("Por favor, preencha ambos os campos de palavra-passe.", "error");
            return;
        }

        // Validar se as palavras-passe coincidem
        if (novaSenha !== confirmarSenha) {
            displayFeedback("As palavras-passe não coincidem. Por favor, tente novamente.", "error");
            return;
        }

        // Validar o comprimento da palavra-passe (exemplo: mínimo de 6 caracteres)
        if (novaSenha.length < 6) {
            displayFeedback("A nova palavra-passe deve ter pelo menos 6 caracteres.", "error");
            return;
        }

        // Exibir uma mensagem de carregamento
        displayFeedback("A redefinir a sua palavra-passe...", "info");

        try {
            // Enviar o token e a nova palavra-passe para a rota de redefinição no backend
            const response = await fetch(`${BACKEND_BASE_URL}/api/reset-password`, { // <<--- CORREÇÃO AQUI
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: token,
                    new_password: novaSenha,
                    confirm_password: confirmarSenha // Enviar para o backend para validação dupla
                })
            });

            const data = await response.json(); // Analisar a resposta JSON do backend

            if (response.ok) {
                // Se a resposta for bem-sucedida (status 200), exibir mensagem de sucesso
                displayFeedback(data.message || "Palavra-passe redefinida com sucesso! Redirecionando para o login...", "success");
                redefinirSenhaForm.reset(); // Limpar o formulário
                // Redirecionar para a página de login após um pequeno atraso
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            } else {
                // Se houver um erro, exibir a mensagem de erro do backend
                displayFeedback(data.message || "Ocorreu um erro ao redefinir a palavra-passe.", "error");
            }
        } catch (error) {
            // Capturar erros de rede ou outros erros inesperados
            console.error("Erro na redefinição de palavra-passe:", error);
            displayFeedback("Erro de conexão. Por favor, tente novamente mais tarde.", "error");
        }
    });

    // Função para exibir mensagens de feedback ao utilizador
    function displayFeedback(message, type) {
        feedbackRedefinicaoDiv.textContent = message; // Definir o texto da mensagem
        feedbackRedefinicaoDiv.className = `feedback-message ${type}`; // Adicionar classe para estilização (success, error, info)
        feedbackRedefinicaoDiv.style.display = 'block'; // Tornar a mensagem visível

        // Opcional: Esconder a mensagem após alguns segundos (por exemplo, 5 segundos)
        // Para mensagens de sucesso com redirecionamento, pode não ser necessário esconder
        if (type !== 'success') {
            setTimeout(() => {
                feedbackRedefinicaoDiv.style.display = 'none';
                feedbackRedefinicaoDiv.textContent = '';
            }, 5000); 
        }
    }
});
