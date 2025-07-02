// recuperar-senha.js

document.addEventListener("DOMContentLoaded", function() {
    const recuperarSenhaForm = document.getElementById("recuperarSenhaForm");
    const emailInput = document.getElementById("emailRecuperacao");
    const feedbackRecuperacaoDiv = document.getElementById("feedbackRecuperacao");

    // URL base do seu backend Flask
    // No deploy, esta URL será o domínio do seu backend no Render
    const BACKEND_BASE_URL = window.location.origin;

    recuperarSenhaForm.addEventListener("submit", async function(event) {
        event.preventDefault(); // Prevenir o comportamento padrão de submissão do formulário

        const email = emailInput.value;

        if (!email) {
            displayFeedback("Por favor, insira o seu e-mail.", "error");
            return;
        }

        displayFeedback("A enviar pedido de recuperação...", "info");

        try {
            // Enviar o e-mail para a rota de recuperação no backend
            const response = await fetch(`${BACKEND_BASE_URL}/api/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email })
            });

            const data = await response.json(); // Analisar a resposta JSON do backend

            if (response.ok) {
                // Se a resposta for bem-sucedida (status 200), exibir mensagem de sucesso
                displayFeedback(data.message || "Link de recuperação enviado com sucesso! Verifique o seu e-mail.", "success");
                recuperarSenhaForm.reset(); // Limpar o formulário
            } else {
                // Se houver um erro, exibir a mensagem de erro do backend
                displayFeedback(data.message || "Ocorreu um erro na recuperação de palavra-passe.", "error");
            }
        } catch (error) {
            // Capturar erros de rede ou outros erros inesperados
            console.error("Erro na recuperação de palavra-passe:", error);
            displayFeedback("Erro de conexão. Por favor, tente novamente mais tarde.", "error");
        }
    });

    // Função para exibir mensagens de feedback ao utilizador
    function displayFeedback(message, type) {
        feedbackRecuperacaoDiv.textContent = message; // Definir o texto da mensagem
        feedbackRecuperacaoDiv.className = `feedback-message ${type}`; // Adicionar classe para estilização (success, error, info)
        feedbackRecuperacaoDiv.style.display = 'block'; // Tornar a mensagem visível

        // Opcional: Esconder a mensagem após alguns segundos (por exemplo, 5 segundos)
        setTimeout(() => {
            feedbackRecuperacaoDiv.style.display = 'none';
            feedbackRecuperacaoDiv.textContent = '';
        }, 5000);
    }
});
