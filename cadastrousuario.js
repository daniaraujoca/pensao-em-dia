document.addEventListener("DOMContentLoaded", () => {
    const cadastroUsuarioForm = document.getElementById("cadastroUsuarioForm");

    cadastroUsuarioForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const nome = document.getElementById("nomeCadastro").value.trim(); // Captura o nome
        const email = document.getElementById("emailCadastro").value.trim().toLowerCase();
        const senha = document.getElementById("senhaCadastro").value;
        const confirmarSenha = document.getElementById("confirmarSenha").value;

        if (!nome || !email || !senha || !confirmarSenha) {
            alert("Preencha todos os campos.");
            return;
        }

        if (senha !== confirmarSenha) {
            alert("As senhas não coincidem.");
            return;
        }

        // Recupera usuários existentes ou cria um array vazio
        const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

        // Verifica se o email já está cadastrado
        const emailExiste = usuarios.some(u => u.email === email);
        if (emailExiste) {
            alert("Este email já está cadastrado.");
            return;
        }

        // Adiciona o novo usuário com o nome
        usuarios.push({ nome, email, senha });
        localStorage.setItem("usuarios", JSON.stringify(usuarios));

        alert("Cadastro realizado com sucesso! Faça login para continuar.");
        window.location.href = "index.html";
    });
});