// login.js
import { auth } from "./common.js"; // Importa 'auth' de common.js
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const feedbackLogin = document.getElementById("feedbackLogin");

    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const email = emailInput.value;
            const password = passwordInput.value;

            try {
                // Tenta fazer login com email e senha usando Firebase Auth
                await signInWithEmailAndPassword(auth, email, password);
                
                // Se o login for bem-sucedido, feedbackLogin será limpo
                feedbackLogin.textContent = ""; 
                feedbackLogin.classList.remove("error", "success");

                // REDIRECIONAR PARA A PÁGINA DE GESTÃO/DASHBOARD APÓS O LOGIN BEM-SUCEDIDO
                window.location.href = "gestao.html"; // OU "dashboard.html" se você tiver uma

            } catch (error) {
                // Trata erros de login
                let errorMessage = "Erro ao fazer login. Verifique seu email e senha.";
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMessage = "Email ou senha incorretos.";
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = "Formato de email inválido.";
                } else if (error.code === 'auth/user-disabled') {
                    errorMessage = "Sua conta foi desativada.";
                }
                
                feedbackLogin.textContent = errorMessage;
                feedbackLogin.classList.add("error");
                feedbackLogin.classList.remove("success");
                console.error("Erro de login:", error);
            }
        });
    }
});
