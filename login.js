document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();

            // IDs dos elementos de input corrigidos para 'email' e 'password'
            const email = document.getElementById("email").value.trim().toLowerCase();
            const senha = document.getElementById("password").value;

            const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

            const usuarioEncontrado = usuarios.find(u => u.email === email && u.senha === senha);

            if (usuarioEncontrado) {
                localStorage.setItem("usuarioLogadoEmail", usuarioEncontrado.email);
                localStorage.setItem("usuarioLogadoNome", usuarioEncontrado.nome);
                alert("Login realizado com sucesso!");
                window.location.href = "gestao.html"; // Redireciona para a página principal após o login
            } else {
                alert("Email ou senha inválidos.");
            }
        });
    }
});
