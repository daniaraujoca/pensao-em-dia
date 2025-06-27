// Importa a função específica para login com e-mail e senha do Firebase Auth
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const feedbackMessage = document.getElementById("feedbackMessage"); 

    // Obtém a instância de autenticação globalmente (definida no index.html)
    const auth = window.auth;

    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const email = document.getElementById("email").value.trim().toLowerCase();
            const password = document.getElementById("password").value; 

            feedbackMessage.style.display = "none";
            feedbackMessage.classList.remove("success", "error");

            // Usa a função importada para fazer o login
            signInWithEmailAndPassword(auth, email, password) // Note: auth é o primeiro argumento
                .then((userCredential) => {
                    const user = userCredential.user;
                    localStorage.setItem("usuarioLogadoEmail", user.email);
                    localStorage.setItem("usuarioLogadoNome", user.displayName || user.email.split('@')[0]);

                    feedbackMessage.textContent = "Login realizado com sucesso!";
                    feedbackMessage.classList.add("success");
                    feedbackMessage.style.display = "block";

                    setTimeout(() => {
                        window.location.href = "./gestao.html"; // Caminho corrigido
                    }, 1000);

                })
                .catch((error) => {
                    let errorMessage = "Erro ao fazer login. Verifique seu e-mail e senha.";

                    switch (error.code) {
                        case 'auth/user-not-found':
                            errorMessage = "Nenhum usuário encontrado com este e-mail.";
                            break;
                        case 'auth/wrong-password':
                            errorMessage = "Senha incorreta.";
                            break;
                        case 'auth/invalid-email':
                            errorMessage = "O formato do e-mail é inválido.";
                            break;
                        case 'auth/too-many-requests':
                            errorMessage = "Muitas tentativas de login. Tente novamente mais tarde.";
                            break;
                        default:
                            console.error("Erro de login Firebase:", error.code, error.message);
                            errorMessage = "Ocorreu um erro inesperado. Tente novamente.";
                    }
                    feedbackMessage.textContent = errorMessage;
                    feedbackMessage.classList.add("error");
                    feedbackMessage.style.display = "block";
                });
        });
    }
});
