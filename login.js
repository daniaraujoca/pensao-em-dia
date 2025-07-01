// login.js - Versão sem Firebase, adaptada para backend Flask

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const feedbackMessage = document.getElementById("feedbackMessage"); 

    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) { // Adicionado 'async'
            e.preventDefault();

            const email = document.getElementById("email").value.trim().toLowerCase();
            const password = document.getElementById("password").value; 

            feedbackMessage.style.display = "none";
            feedbackMessage.classList.remove("success", "error");

            if (!email || !password) {
                feedbackMessage.textContent = "Por favor, preencha seu e-mail e senha.";
                feedbackMessage.classList.add("error");
                feedbackMessage.style.display = "block";
                return;
            }

            // --- Lógica de Login para o Backend Flask ---
            try {
                const response = await fetch('/api/login', { // Endpoint de login no Flask
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                });

                const data = await response.json(); // Pega a resposta JSON do Flask

                if (response.ok) { // Se a resposta for 2xx (sucesso)
                    // Assumimos que o backend Flask retorna o nome do usuário no sucesso
                    localStorage.setItem("usuarioLogadoEmail", email);
                    localStorage.setItem("usuarioLogadoNome", data.user_name || email.split('@')[0]); // Use o nome do backend, ou parte do email

                    feedbackMessage.textContent = "Login realizado com sucesso!";
                    feedbackMessage.classList.add("success");
                    feedbackMessage.style.display = "block";

                    setTimeout(() => {
                        window.location.href = "./gestao.html"; // Redireciona para a página de gestão
                    }, 1000);

                } else { // Se a resposta não for 2xx (ex: 401 Unauthorized, 400 Bad Request)
                    let errorMessage = data.message || "Erro ao fazer login. Tente novamente.";
                    feedbackMessage.textContent = errorMessage;
                    feedbackMessage.classList.add("error");
                    feedbackMessage.style.display = "block";
                    console.error("Erro no backend Flask:", data.message);
                }
            } catch (error) {
                // Erro de rede ou outro problema na requisição
                console.error("Erro de conexão ou requisição:", error);
                feedbackMessage.textContent = "Não foi possível conectar ao servidor. Verifique sua conexão.";
                feedbackMessage.classList.add("error");
                feedbackMessage.style.display = "block";
            }
        });
    }
});