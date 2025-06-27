// cadastro.js
import { auth, db } from "./common.js"; // Importa 'auth' e 'db' de common.js
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function() {
    const cadastroForm = document.getElementById("cadastroForm");
    const cadastroNomeInput = document.getElementById("cadastroNome"); // Novo campo de nome
    const cadastroEmailInput = document.getElementById("cadastroEmail");
    const cadastroPasswordInput = document.getElementById("cadastroPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const feedbackCadastro = document.getElementById("feedbackCadastro");

    if (cadastroForm) {
        cadastroForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            feedbackCadastro.textContent = ""; // Limpa a mensagem
            feedbackCadastro.classList.remove("success", "error");
            feedbackCadastro.style.display = "none";

            const nome = cadastroNomeInput.value.trim(); // Pega o nome e remove espaços extras
            const email = cadastroEmailInput.value;
            const password = cadastroPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (nome === "") {
                feedbackCadastro.textContent = "Por favor, insira seu nome completo.";
                feedbackCadastro.classList.add("error");
                feedbackCadastro.style.display = "block";
                return;
            }

            if (password !== confirmPassword) {
                feedbackCadastro.textContent = "As senhas não coincidem.";
                feedbackCadastro.classList.add("error");
                feedbackCadastro.style.display = "block";
                return;
            }

            try {
                // 1. Cria o usuário no Firebase Authentication
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // 2. Salva o perfil do usuário no Firestore
                // Criar um documento na coleção 'users' com o UID do usuário como ID do documento
                // E dentro desse documento, criar uma subcoleção 'profile' com um documento 'data'
                const userProfileRef = doc(db, "users", user.uid, "profile", "data");
                await setDoc(userProfileRef, {
                    nome: nome,
                    email: email,
                    createdAt: new Date() // Opcional: registrar a data de criação
                });

                feedbackCadastro.textContent = "Cadastro bem-sucedido! Redirecionando...";
                feedbackCadastro.classList.add("success");
                feedbackCadastro.style.display = "block";
                
                // O redirecionamento é tratado pelo common.js via onAuthStateChanged
                // Não é necessário setTimeout aqui
                // window.location.href = "./index.html"; // Comentado
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
