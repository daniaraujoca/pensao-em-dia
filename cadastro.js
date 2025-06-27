// Importa as funções específicas do Firebase Auth para cadastro e atualização de perfil
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function () {
    const cadastroForm = document.getElementById("cadastroForm");

    // Obtém a instância de autenticação globalmente
    const auth = window.auth;

    if (cadastroForm) {
        cadastroForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const nome = document.getElementById("cadastroNome").value.trim();
            const sobrenome = document.getElementById("cadastroSobrenome").value.trim();
            const email = document.getElementById("cadastroEmail").value.trim().toLowerCase();
            const senha = document.getElementById("cadastroSenha").value;
            const confirmarSenha = document.getElementById("cadastroConfirmarSenha").value;

            if (!nome || !sobrenome || !email || !senha || !confirmarSenha) {
                alert("Preencha todos os campos.");
                return;
            }

            if (senha !== confirmarSenha) {
                alert("As senhas não coincidem.");
                return;
            }

            // Usa a função importada para criar o usuário
            createUserWithEmailAndPassword(auth, email, senha) // Note: auth é o primeiro argumento
                .then((userCredential) => {
                    const user = userCredential.user;

                    // Usa a função importada para atualizar o perfil do usuário
                    return updateProfile(user, { // Note: user é o primeiro argumento
                        displayName: `${nome} ${sobrenome}`
                    })
                    .then(() => {
                        localStorage.setItem("usuarioLogadoEmail", user.email);
                        localStorage.setItem("usuarioLogadoNome", user.displayName);
                        
                        alert("Cadastro realizado com sucesso! Faça login.");
                        window.location.href = "./index.html"; // Caminho corrigido
                    });
                })
                .catch((error) => {
                    let errorMessage = "Erro ao cadastrar. Tente novamente.";

                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage = "Este e-mail já está cadastrado.";
                            break;
                        case 'auth/invalid-email':
                            errorMessage = "O formato do e-mail é inválido.";
                            break;
                        case 'auth/weak-password':
                            errorMessage = "A senha deve ter no mínimo 6 caracteres.";
                            break;
                        default:
                            console.error("Erro de cadastro Firebase:", error.code, error.message);
                            errorMessage = "Ocorreu um erro inesperado. Tente novamente.";
                    }
                    alert(errorMessage);
                });
        });
    }
});
