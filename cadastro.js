document.getElementById("cadastroForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const nome = document.getElementById("cadastroNome").value.trim();
    const sobrenome = document.getElementById("cadastroSobrenome").value.trim();
    const email = document.getElementById("cadastroEmail").value.trim().toLowerCase(); // Armazena em minúsculas
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

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    // Verifica se email já existe (case-insensitive)
    if (usuarios.some(u => u.email === email)) {
        alert("Email já cadastrado.");
        return;
    }

    const novoUsuario = {
        id: Date.now(), // ID único para o usuário
        nome: nome, // Guardamos o nome completo aqui
        email: email,
        senha: senha // Em um sistema real, a senha deveria ser hashed!
    };

    usuarios.push(novoUsuario);
    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    alert("Cadastro realizado com sucesso! Faça login.");
    window.location.href = "index.html";
});