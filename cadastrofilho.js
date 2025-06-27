// cadastrofilho.js
import { auth, db } from "./common.js"; // Importa 'auth' e 'db' de common.js
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function () {
    const cadastroFilhoForm = document.getElementById("cadastroFilhoForm");
    const nomeFilhoInput = document.getElementById("nomeFilho");
    const dataNascimentoInput = document.getElementById("dataNascimento");
    const valorMensalInput = document.getElementById("valorMensal");
    const diaVencimentoInput = document.getElementById("diaVencimento");
    const feedbackCadastroFilho = document.getElementById("feedbackCadastroFilho");

    if (cadastroFilhoForm) {
        cadastroFilhoForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            feedbackCadastroFilho.textContent = ""; // Limpa a mensagem
            feedbackCadastroFilho.classList.remove("success", "error");
            feedbackCadastroFilho.style.display = "none";

            const user = auth.currentUser;
            if (!user) {
                feedbackCadastroFilho.textContent = "Você precisa estar logado para cadastrar um filho. Redirecionando...";
                feedbackCadastroFilho.classList.add("error");
                feedbackCadastroFilho.style.display = "block";
                // É o common.js que fará o redirecionamento. Apenas exibir a mensagem.
                return;
            }

            const nomeFilho = nomeFilhoInput.value.trim();
            const dataNascimento = dataNascimentoInput.value;
            const valorMensal = parseFloat(valorMensalInput.value);
            const diaVencimento = parseInt(diaVencimentoInput.value);

            if (!nomeFilho || !dataNascimento || isNaN(valorMensal) || isNaN(diaVencimento)) {
                feedbackCadastroFilho.textContent = "Por favor, preencha todos os campos corretamente.";
                feedbackCadastroFilho.classList.add("error");
                feedbackCadastroFilho.style.display = "block";
                return;
            }

            if (diaVencimento < 1 || diaVencimento > 31) {
                feedbackCadastroFilho.textContent = "O dia do vencimento deve ser entre 1 e 31.";
                feedbackCadastroFilho.classList.add("error");
                feedbackCadastroFilho.style.display = "block";
                return;
            }

            try {
                // Caminho CORRETO para salvar o filho dentro da subcoleção do usuário
                const filhosCollectionRef = collection(db, "users", user.uid, "filhos");
                
                const docRef = await addDoc(filhosCollectionRef, {
                    nome: nomeFilho,
                    dataNascimento: dataNascimento, // Salvar como string "AAAA-MM-DD"
                    valorMensal: valorMensal,
                    diaVencimento: diaVencimento,
                    criadoEm: new Date(), // Timestamp para registro
                    // Total devido inicial e total pago inicial
                    totalDevido: 0, 
                    totalPago: 0,
                    // Inicializa a estrutura para pagamentos (pode ser vazia no início)
                    pagamentos: {} // Usar um objeto para pagamentos por ano/mês
                });

                feedbackCadastroFilho.textContent = `Filho(a) ${nomeFilho} cadastrado(a) com sucesso! Você será redirecionado.`;
                feedbackCadastroFilho.classList.add("success");
                feedbackCadastroFilho.style.display = "block";
                cadastroFilhoForm.reset(); // Limpa o formulário

                // Após o cadastro, o usuário pode ser redirecionado para a gestão
                // Ou apenas receber a mensagem e poder cadastrar outro.
                // Decidi redirecionar, pois é mais provável que queira ver a gestão.
                setTimeout(() => {
                    window.location.href = "./gestao.html";
                }, 1500); // Pequeno atraso para a mensagem ser lida

            } catch (e) {
                console.error("Erro ao adicionar documento: ", e);
                feedbackCadastroFilho.textContent = "Erro ao cadastrar filho(a). Verifique o console para mais detalhes.";
                feedbackCadastroFilho.classList.add("error");
                feedbackCadastroFilho.style.display = "block";
            }
        });
    }
});
