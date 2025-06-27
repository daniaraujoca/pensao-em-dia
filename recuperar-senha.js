// Importa a função específica do Firebase Auth para envio de e-mail de redefinição de senha
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function () {
    const recuperarSenhaForm = document.getElementById("recuperarSenhaForm");
    const feedbackRecuperacao = document.getElementById("feedbackRecuperacao");

    // Obtém a instância de autenticação globalmente
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

            // Usa a função importada para enviar o e-mail de redefinição
            sendPasswordResetEmail(auth, emailRecuperacao) // Note: auth é o primeiro argumento
                .then(() => {
                    feedbackRecuperacao.textContent = "Se o e-mail estiver cadastrado, um link para redefinir sua senha foi enviado para ele.";
                    feedbackRecuperacao.classList.add("success");
                    feedbackRecuperacao.style.display = "block";
                    recuperarSenhaForm.reset();
                })
                .catch((error) => {
                    console.error("Erro ao enviar e-mail de redefinição Firebase:", error.code, error.message);
                    
                    feedbackRecuperacao.textContent = "Se o e-mail estiver cadastrado, um link para redefinir sua senha foi enviado para ele.";
                    feedbackRecuperacao.classList.add("success");
                    feedbackRecuperacao.style.display = "block";
                });
        });
    }
});
