document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const feedbackMessage = document.getElementById("feedbackMessage"); // Para exibir mensagens

    // Certifica-se de que o objeto 'auth' do Firebase está disponível globalmente.
    // Ele é exposto globalmente como 'window.auth' no script type="module" do index.html.
    const auth = window.auth;

    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const email = document.getElementById("email").value.trim().toLowerCase();
            const password = document.getElementById("password").value; // Usamos 'password' para senhas no Firebase

            // Limpa mensagens anteriores
            feedbackMessage.style.display = "none";
            feedbackMessage.classList.remove("success", "error");

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Login bem-sucedido
                    const user = userCredential.user;
                    // Firebase já lida com a sessão do usuário.
                    // Podemos armazenar o nome de exibição ou o email para mostrar no cabeçalho.
                    localStorage.setItem("usuarioLogadoEmail", user.email);
                    // Se você precisar do nome, terá que salvá-lo no Firebase Firestore ou Realtime Database
                    // durante o cadastro, ou pedir ao usuário para definir após o primeiro login.
                    // Por enquanto, vamos usar o email ou um nome padrão.
                    localStorage.setItem("usuarioLogadoNome", user.displayName || user.email.split('@')[0]);

                    feedbackMessage.textContent = "Login realizado com sucesso!";
                    feedbackMessage.classList.add("success");
                    feedbackMessage.style.display = "block";

                    // Redireciona após um pequeno delay para a mensagem ser visível
                    setTimeout(() => {
                        window.location.href = "gestao.html";
                    }, 1000);

                })
                .catch((error) => {
                    // Ocorreu um erro durante o login
                    let errorMessage = "Erro ao fazer login. Verifique seu e-mail e senha.";

                    // Erros comuns do Firebase Authentication
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
