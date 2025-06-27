import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Obtém as instâncias globais de autenticação e Firestore do Firebase.
// Estas instâncias são definidas em common.js e expostas globalmente.
const auth = window.auth;
const db = window.db;

// Elementos do DOM (mantidos, mas a lógica de clique do logoutBtn e usuarioLogadoNomeSpan será gerenciada por common.js)
const usuarioLogadoNomeSpan = document.getElementById('usuarioLogadoNome');
const logoutBtn = document.getElementById('logoutBtn');

const cadastroUsuarioForm = document.getElementById('cadastroUsuarioForm');
const nomeInput = document.getElementById('nome');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const feedbackMessage = document.getElementById('feedbackMessage');

// --- INÍCIO DAS SEÇÕES REMOVIDAS/AJUSTADAS ---

// REMOVIDO: Bloco onAuthStateChanged duplicado.
// A lógica de verificação de autenticação e exibição do nome do usuário
// já é gerenciada centralmente em common.js.
/*
onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioLogadoNomeSpan.textContent = user.displayName || user.email;
        logoutBtn.style.display = 'block';
    } else {
        window.location.href = 'index.html'; // Redireciona se não estiver logado
    }
});
*/

// REMOVIDO: Lógica de logout duplicada.
// O botão de logout será gerenciado pelo common.js.
/*
logoutBtn.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            localStorage.removeItem("usuarioLogadoEmail");
            localStorage.removeItem("usuarioLogadoNome");
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error("Erro ao fazer logout:", error);
            feedbackMessage.textContent = 'Erro ao fazer logout.';
            feedbackMessage.style.backgroundColor = '#f44336';
            feedbackMessage.style.display = 'block';
        });
});
*/

// --- FIM DAS SEÇÕES REMOVIDAS/AJUSTADAS ---


// Lógica de cadastro de usuário (mantida como original, com base na ambiguidade de propósito)
cadastroUsuarioForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o recarregamento da página

    const nome = nomeInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    feedbackMessage.style.display = 'none'; // Esconde mensagens anteriores
    feedbackMessage.textContent = ''; // Limpa o texto da mensagem

    if (password !== confirmPassword) {
        feedbackMessage.textContent = 'As senhas não coincidem.';
        feedbackMessage.style.backgroundColor = '#f44336'; // Vermelho para erro
        feedbackMessage.style.display = 'block';
        return;
    }

    try {
        // 1. Criar o usuário com email e senha
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Atualizar o perfil do usuário com o nome
        await updateProfile(user, {
            displayName: nome
        });

        // 3. Salvar dados adicionais do usuário no Firestore
        await setDoc(doc(db, "users", user.uid), {
            nome: nome,
            email: email,
            // Você pode adicionar outros campos aqui se necessário
        });

        // Armazena informações básicas do usuário no localStorage
        localStorage.setItem("usuarioLogadoEmail", user.email);
        localStorage.setItem("usuarioLogadoNome", nome);

        feedbackMessage.textContent = 'Cadastro realizado com sucesso! Redirecionando...';
        feedbackMessage.style.backgroundColor = '#4CAF50'; // Verde para sucesso
        feedbackMessage.style.display = 'block';

        setTimeout(() => {
            window.location.href = 'gestao.html'; // Redireciona para a página de gestão
        }, 1000); // Redireciona após 1 segundo

    } catch (error) {
        let message = 'Erro desconhecido ao cadastrar. Tente novamente.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                message = 'Este email já está em uso.';
                break;
            case 'auth/invalid-email':
                message = 'Formato de email inválido.';
                break;
            case 'auth/weak-password':
                message = 'A senha deve ter pelo menos 6 caracteres.';
                break;
            case 'auth/operation-not-allowed':
                message = 'Criação de conta por email/senha não está habilitada. Verifique as configurações do Firebase.';
                break;
            default:
                console.error("Erro de cadastro:", error);
                message = `Erro: ${error.message}`;
        }
        feedbackMessage.textContent = message;
        feedbackMessage.style.backgroundColor = '#f44336'; // Vermelho para erro
        feedbackMessage.style.display = 'block';
    }
});
