import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function () {
    const cadastroFilhoForm = document.getElementById("cadastroFilhoForm");
    const feedbackCadastroFilho = document.getElementById("feedbackCadastroFilho");

    // Acessa window.auth e window.db que são definidos no HTML
    const auth = window.auth;
    const db = window.db;

    if (cadastroFilhoForm) {
        cadastroFilhoForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            feedbackCadastroFilho.style.display = "none";
            feedbackCadastroFilho.classList.remove("success", "error");

            const user = auth.currentUser;
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
                const docRef = await addDoc(collection(db, "filhos"), {
                    userId: user.uid,
                    nome: nomeFilho,
                    dataNascimento: dataNascimento, 
                    valorMensal: valorMensal,
                    diaVencimento: diaVencimento,
                    criadoEm: new Date(), 
                    pagamentos: [] 
                });

                feedbackCadastroFilho.textContent = `Filho(a) ${nomeFilho} cadastrado(a) com sucesso!`;
                feedbackCadastroFilho.classList.add("success");
                feedbackCadastroFilho.style.display = "block";
                cadastroFilhoForm.reset();

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
