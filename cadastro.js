import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function() {
    const cadastroForm = document.getElementById("cadastroForm");
    const feedbackCadastro = document.getElementById("feedbackCadastro");

    // Acessa window.auth que é definido no HTML
    const auth = window.auth;

    if (cadastroForm) {
        cadastroForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            feedbackCadastro.style.display = "none";
            feedbackCadastro.classList.remove("success", "error");

            const email = document.getElementById("cadastroEmail").value;
            const password = document.getElementById("cadastroPassword").value;
            const confirmPassword = document.getElementById("confirmPassword").value;

            if (password !== confirmPassword) {
                feedbackCadastro.textContent = "As senhas não coincidem.";
                feedbackCadastro.classList.add("error");
                feedbackCadastro.style.display = "block";
                return;
            }

            try {
                await createUserWithEmailAndPassword(auth, email, password);
                feedbackCadastro.textContent = "Cadastro bem-sucedido! Redirecionando para o login...";
                feedbackCadastro.classList.add("success");
                feedbackCadastro.style.display = "block";
                setTimeout(() => {
                    window.location.href = "./index.html"; 
                }, 1500); 
            } catch (error) {
                let errorMessage = "Erro no cadastro. Tente novamente.";
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = "Este email já está em uso.";
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = "Formato de email inválido.";
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = "A senha é muito fraca (mínimo de 6 caracteres).";
                }
                console.error("Erro de cadastro:", error);
                feedbackCadastro.textContent = errorMessage;
                feedbackCadastro.classList.add("error");
                feedbackCadastro.style.display = "block";
            }
        });
    }
});
