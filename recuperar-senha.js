document.addEventListener("DOMContentLoaded", function () {
    const recuperarSenhaForm = document.getElementById("recuperarSenhaForm");
    const feedbackRecuperacao = document.getElementById("feedbackRecuperacao");

    // Certifica-se de que o objeto 'auth' do Firebase está disponível globalmente.
    const auth = window.auth;

    if (recuperarSenhaForm) {
        recuperarSenhaForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const emailRecuperacao = document.getElementById("emailRecuperacao").value.trim().toLowerCase();

            feedbackRecuperacao.style.display = "none";
            feedbackRecuperacao.classList.remove("success", "error");

            if (!emailRecuperacao) {
                feedbackRecuperacao.textContent = "Por favor, digite seu e-mail.";
                feedbackRecuperacao.classList.add("error");
                feedbackRecuperacao.style.display = "block";
                return;
            }

            // Envia o e-mail de redefinição de senha usando o Firebase
            auth.sendPasswordResetEmail(emailRecuperacao)
                .then(() => {
                    // E-mail de redefinição enviado com sucesso.
                    // A mensagem é genérica por segurança (para não informar se o e-mail existe ou não).
                    feedbackRecuperacao.textContent = "Se o e-mail estiver cadastrado, um link para redefinir sua senha foi enviado para ele.";
                    feedbackRecuperacao.classList.add("success");
                    feedbackRecuperacao.style.display = "block";
                    recuperarSenhaForm.reset();
                })
                .catch((error) => {
                    // Ocorreu um erro. A mensagem para o usuário pode ser a mesma por segurança.
                    // Para depuração, você pode logar o erro.
                    console.error("Erro ao enviar e-mail de redefinição Firebase:", error.code, error.message);
                    
                    feedbackRecuperacao.textContent = "Se o e-mail estiver cadastrado, um link para redefinir sua senha foi enviado para ele.";
                    feedbackRecuperacao.classList.add("success"); // Mantemos a classe de sucesso por segurança
                    feedbackRecuperacao.style.display = "block";
                });
        });
    }
});
