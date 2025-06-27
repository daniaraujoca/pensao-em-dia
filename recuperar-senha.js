import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function() {
    const recuperarSenhaForm = document.getElementById("recuperarSenhaForm");
    const feedbackRecuperacao = document.getElementById("feedbackRecuperacao");

    // Acessa window.auth que é definido no HTML
    const auth = window.auth;

    if (recuperarSenhaForm) {
        recuperarSenhaForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            feedbackRecuperacao.style.display = "none";
            feedbackRecuperacao.classList.remove("success", "error");

            const email = document.getElementById("recuperarEmail").value;

            try {
                await sendPasswordResetEmail(auth, email);
                feedbackRecuperacao.textContent = "Um link de recuperação de senha foi enviado para o seu email. Verifique sua caixa de entrada (e spam).";
                feedbackRecuperacao.classList.add("success");
                feedbackRecuperacao.style.display = "block";
            } catch (error) {
                let errorMessage = "Erro ao enviar link de recuperação. Verifique o email digitado.";
                if (error.code === 'auth/user-not-found') {
                    errorMessage = "Usuário não encontrado com este email.";
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = "Formato de email inválido.";
                }
                console.error("Erro de recuperação de senha:", error);
                feedbackRecuperacao.textContent = errorMessage;
                feedbackRecuperacao.classList.add("error");
                feedbackRecuperacao.style.display = "block";
            }
        });
    }
});
