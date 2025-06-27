// Importa as funções necessárias do Firestore
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function () {
    const cadastroFilhoForm = document.getElementById("cadastroFilhoForm");
    const feedbackCadastroFilho = document.getElementById("feedbackCadastroFilho");

    // Obtém as instâncias de autenticação e banco de dados do Firebase
    const auth = window.auth;
    const db = window.db;

    if (cadastroFilhoForm) {
        cadastroFilhoForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            feedbackCadastroFilho.style.display = "none";
            feedbackCadastroFilho.classList.remove("success", "error");

            const user = auth.currentUser; // Obtém o usuário atualmente logado
            if (!user) {
                feedbackCadastroFilho.textContent = "Você precisa estar logado para cadastrar um filho.";
                feedbackCadastroFilho.classList.add("error");
                feedbackCadastroFilho.style.display = "block";
                setTimeout(() => { window.location.href = "./index.html"; }, 2000);
                return;
            }

            const nomeFilho = document.getElementById("nomeFilho").value.trim();
            const dataNascimento = document.getElementById("dataNascimento").value;
            const valorMensal = parseFloat(document.getElementById("valorMensal").value);
            const diaVencimento = parseInt(document.getElementById("diaVencimento").value);

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
                // Adiciona um novo documento à coleção 'filhos'
                // O UID do usuário garante que cada filho está associado ao seu criador
                const docRef = await addDoc(collection(db, "filhos"), {
                    userId: user.uid, // UID do usuário logado
                    nome: nomeFilho,
                    dataNascimento: dataNascimento, // Salva como string YYYY-MM-DD
                    valorMensal: valorMensal,
                    diaVencimento: diaVencimento,
                    criadoEm: new Date(), // Timestamp de criação
                    pagamentos: [] // Inicializa uma array vazia para pagamentos
                });

                feedbackCadastroFilho.textContent = `Filho(a) ${nomeFilho} cadastrado(a) com sucesso!`;
                feedbackCadastroFilho.classList.add("success");
                feedbackCadastroFilho.style.display = "block";
                cadastroFilhoForm.reset(); // Limpa o formulário

                // Redireciona para a página de gestão após o cadastro
                setTimeout(() => {
                    window.location.href = "./gestao.html";
                }, 1500);

            } catch (e) {
                console.error("Erro ao adicionar documento: ", e);
                feedbackCadastroFilho.textContent = "Erro ao cadastrar filho(a). Tente novamente.";
                feedbackCadastroFilho.classList.add("error");
                feedbackCadastroFilho.style.display = "block";
            }
        });
    }
});
