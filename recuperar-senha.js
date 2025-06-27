document.addEventListener("DOMContentLoaded", function () {
    const recuperarSenhaForm = document.getElementById("recuperarSenhaForm");
    const feedbackRecuperacao = document.getElementById("feedbackRecuperacao");

    if (recuperarSenhaForm) {
        recuperarSenhaForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const emailRecuperacao = document.getElementById("emailRecuperacao").value.trim().toLowerCase();
            const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

            const usuarioEncontrado = usuarios.find(u => u.email === emailRecuperacao);

            feedbackRecuperacao.style.display = "block";
            feedbackRecuperacao.classList.remove("success", "error");

            if (usuarioEncontrado) {
                // Simulação de envio de e-mail de recuperação
                // Em um ambiente real, você enviaria um e-mail com um link único aqui.
                // Como estamos usando localStorage, apenas indicamos que "foi enviado".
                feedbackRecuperacao.textContent = "Se o e-mail estiver cadastrado, um link de recuperação foi enviado.";
                feedbackRecuperacao.classList.add("success");
                recuperarSenhaForm.reset(); // Limpa o formulário
                // O ideal seria direcionar o usuário para uma página de "Verifique seu e-mail"
            } else {
                feedbackRecuperacao.textContent = "Se o e-mail estiver cadastrado, um link de recuperação foi enviado.";
                feedbackRecuperacao.classList.add("success"); // Mantemos a mesma mensagem por segurança
            }

            setTimeout(() => {
                feedbackRecuperacao.style.display = "none";
            }, 5000);
        });
    }
});
