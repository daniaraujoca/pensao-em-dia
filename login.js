import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function() {
    const loginForm = document.getElementById("loginForm");
    const feedbackLogin = document.getElementById("feedbackLogin");

    // Acessa window.auth que é definido no HTML
    const auth = window.auth;

    if (loginForm) {
        loginForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            feedbackLogin.style.display = "none";
            feedbackLogin.classList.remove("success", "error");

            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                feedbackLogin.textContent = "Login bem-sucedido! Redirecionando...";
                feedbackLogin.classList.add("success");
                feedbackLogin.style.display = "block";
                setTimeout(() => {
                    window.location.href = "./gestao.html"; 
                }, 1500); 
            } catch (error) {
                let errorMessage = "Erro no login. Verifique suas credenciais.";
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMessage = "Email ou senha inválidos.";
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = "Formato de email inválido.";
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = "Muitas tentativas de login. Tente novamente mais tarde.";
                }
                console.error("Erro de login:", error);
                feedbackLogin.textContent = errorMessage;
                feedbackLogin.classList.add("error");
                feedbackLogin.style.display = "block";
            }
        });
    }
});
