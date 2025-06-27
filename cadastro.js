document.addEventListener("DOMContentLoaded", function () {
    const cadastroForm = document.getElementById("cadastroForm");

    // Certifica-se de que o objeto 'auth' do Firebase está disponível globalmente.
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

            // A lógica de verificação de email já existente e criação de usuário
            // será feita pelo Firebase Authentication.
            auth.createUserWithEmailAndPassword(email, senha)
                .then((userCredential) => {
                    // Usuário criado com sucesso no Firebase Authentication
                    const user = userCredential.user;

                    // O Firebase Authentication não armazena automaticamente "nome" e "sobrenome".
                    // Para o seu "Bem-vindo, [Nome]", vamos tentar atualizar o displayName.
                    // Isso é opcional, mas ajuda a manter o nome simples no usuário do Firebase.
                    return user.updateProfile({
                        displayName: `${nome} ${sobrenome}`
                    })
                    .then(() => {
                        // Salva o nome e o e-mail no localStorage para uso imediato no app
                        // (o email é sempre seguro para usar como identificador).
                        localStorage.setItem("usuarioLogadoEmail", user.email);
                        localStorage.setItem("usuarioLogadoNome", user.displayName); // Usando o display name atualizado
                        
                        alert("Cadastro realizado com sucesso! Faça login.");
                        window.location.href = "index.html"; // Redireciona para a página de login
                    });
                })
                .catch((error) => {
                    // Ocorreu um erro durante o cadastro
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
