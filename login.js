import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Obtém a instância global de autenticação do Firebase.
// Esta instância é definida em common.js.
const auth = window.auth;

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const feedbackMessage = document.getElementById('feedbackMessage');

// Configura a persistência da sessão do usuário para ser local (mantém login após fechar o navegador)
auth.setPersistence(browserLocalPersistence);

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o recarregamento da página

    const email = emailInput.value;
    const password = passwordInput.value;

    feedbackMessage.style.display = 'none'; // Esconde mensagens anteriores
    feedbackMessage.textContent = ''; // Limpa o texto da mensagem

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Armazena informações básicas do usuário no localStorage
        localStorage.setItem("usuarioLogadoEmail", user.email);
        // O displayName pode ser null se não foi definido no cadastro.
        // Se precisar do nome, ele deveria ser salvo no Firestore no momento do cadastro.
        // Por enquanto, usaremos um valor padrão ou buscaremos de outro lugar se necessário.
        localStorage.setItem("usuarioLogadoNome", user.displayName || user.email); 

        feedbackMessage.textContent = 'Login bem-sucedido! Redirecionando...';
        feedbackMessage.style.backgroundColor = '#4CAF50'; // Verde para sucesso
        feedbackMessage.style.display = 'block';

        setTimeout(() => {
            window.location.href = 'gestao.html'; // Redireciona para a página de gestão
        }, 1000); // Redireciona após 1 segundo

    } catch (error) {
        let message = 'Erro desconhecido. Tente novamente.';
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                message = 'Email ou senha inválidos.';
                break;
            case 'auth/invalid-email':
                message = 'Formato de email inválido.';
                break;
            case 'auth/too-many-requests':
                message = 'Muitas tentativas de login. Tente novamente mais tarde.';
                break;
            default:
                console.error("Erro de login:", error);
                message = `Erro: ${error.message}`;
        }
        feedbackMessage.textContent = message;
        feedbackMessage.style.backgroundColor = '#f44336'; // Vermelho para erro
        feedbackMessage.style.display = 'block';
    }
});
