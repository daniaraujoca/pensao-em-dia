// cadastro.js - Versão sem Firebase, adaptada para backend Flask

document.addEventListener("DOMContentLoaded", function () {
    const cadastroForm = document.getElementById("cadastroForm");

    if (cadastroForm) {
        cadastroForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const nome = document.getElementById("cadastroNome").value.trim();
            const sobrenome = document.getElementById("cadastroSobrenome").value.trim();
            const email = document.getElementById("cadastroEmail").value.trim().toLowerCase();
            const senha = document.getElementById("cadastroSenha").value;
            const confirmarSenha = document.getElementById("cadastroConfirmarSenha").value;

            // --- Lógica de validação CORRIGIDA ---
            // Agora verifica se a 'senha' ESTÁ vazia, não se está preenchida
            if (!nome || !sobrenome || !email || !senha || !confirmarSenha) {
                alert("Por favor, preencha todos os campos.");
                return;
            }

            if (senha !== confirmarSenha) {
                alert("As senhas não coincidem.");
                return;
            }

            // --- Lógica de Cadastro para o Backend Flask ---
            try {
                const response = await fetch('/api/register', { // Endpoint de cadastro no Flask
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: nome,
                        surname: sobrenome,
                        email: email,
                        password: senha
                    })
                });

                const data = await response.json(); // Pega a resposta JSON do Flask

                if (response.ok) { // Se a resposta for 2xx (sucesso)
                    alert("Cadastro realizado com sucesso! Faça login.");
                    // Opcional: armazenar algo no localStorage se o backend retornar token ou user_id
                    // localStorage.setItem("usuarioLogadoEmail", email);
                    // localStorage.setItem("usuarioLogadoNome", `${nome} ${sobrenome}`);

                    window.location.href = "./index.html"; // Redireciona para a página de login
                } else { // Se a resposta não for 2xx (ex: 400, 409, 500)
                    let errorMessage = data.message || "Ocorreu um erro ao cadastrar. Tente novamente.";
                    alert(errorMessage);
                    console.error("Erro no backend Flask:", data.message);
                }
            } catch (error) {
                // Erro de rede ou outro problema na requisição
                console.error("Erro de conexão ou requisição:", error);
                alert("Não foi possível conectar ao servidor. Verifique sua conexão.");
            }
        });
    }
});