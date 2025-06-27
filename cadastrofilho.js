import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js"; // Mantido onAuthStateChanged para a importação, embora o bloco de uso vá ser removido.
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Obtém as instâncias globais de autenticação e Firestore do Firebase.
// Estas instâncias são definidas em common.js.
const auth = window.auth;
const db = window.db;

const usuarioLogadoNomeSpan = document.getElementById('usuarioLogadoNome');
const logoutBtn = document.getElementById('logoutBtn'); // Mantido para referência, mas a lógica de clique será removida.

const cadastroFilhoForm = document.getElementById('cadastroFilhoForm');
const nomeFilhoInput = document.getElementById('nomeFilho');
const dataNascimentoInput = document.getElementById('dataNascimento');
const pensaoMensalInput = document.getElementById('pensaoMensal');
const observacoesInput = document.getElementById('observacoes');
const feedbackMessage = document.getElementById('feedbackMessage');

// --- INÍCIO DAS SEÇÕES REMOVIDAS/AJUSTADAS ---

// REMOVIDO: Bloco onAuthStateChanged duplicado.
// A lógica de verificação de autenticação e exibição do nome do usuário
// já é gerenciada centralmente em common.js.
/*
onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioLogadoNomeSpan.textContent = user.displayName || user.email;
        logoutBtn.style.display = 'block';
    } else {
        window.location.href = 'index.html'; // Redireciona se não estiver logado
    }
});
*/

// REMOVIDO: Lógica de logout duplicada.
// O botão de logout será gerenciado pelo common.js.
/*
logoutBtn.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            localStorage.removeItem("usuarioLogadoEmail");
            localStorage.removeItem("usuarioLogadoNome");
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error("Erro ao fazer logout:", error);
            feedbackMessage.textContent = 'Erro ao fazer logout.';
            feedbackMessage.style.backgroundColor = '#f44336';
            feedbackMessage.style.display = 'block';
        });
});
*/

// REMOVIDO: Funções de carregamento e exclusão de filhos.
// Estas funções pertencem ao gestao.js e foram removidas para melhorar a organização.
/*
async function carregarFilhos() { ... }
async function deletarFilho(filhoId) { ... }
*/

// --- FIM DAS SEÇÕES REMOVIDAS/AJUSTADAS ---


// Lógica de cadastro de filho (mantida, pois este é o propósito do arquivo)
cadastroFilhoForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o recarregamento da página

    // Verifica se há um usuário logado antes de tentar cadastrar o filho
    const user = auth.currentUser;
    if (!user) {
        feedbackMessage.textContent = 'Nenhum usuário logado. Por favor, faça login novamente.';
        feedbackMessage.style.backgroundColor = '#f44336';
        feedbackMessage.style.display = 'block';
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        return;
    }

    const nomeFilho = nomeFilhoInput.value;
    const dataNascimentoStr = dataNascimentoInput.value;
    const pensaoMensal = parseFloat(pensaoMensalInput.value);
    const observacoes = observacoesInput.value;

    if (!nomeFilho || !dataNascimentoStr || isNaN(pensaoMensal)) {
        feedbackMessage.textContent = 'Por favor, preencha todos os campos obrigatórios (Nome, Data de Nascimento, Pensão Mensal).';
        feedbackMessage.style.backgroundColor = '#f44336';
        feedbackMessage.style.display = 'block';
        return;
    }

    const dataNascimento = new Date(dataNascimentoStr);
    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNascimento.getFullYear();
    const m = hoje.getMonth() - dataNascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < dataNascimento.getDate())) {
        idade--;
    }

    const statusAindaRecebePensao = idade < 18; // Exemplo: menor de 18 ainda recebe pensão

    feedbackMessage.style.display = 'none'; // Esconde mensagens anteriores
    feedbackMessage.textContent = ''; // Limpa o texto da mensagem

    try {
        // Adiciona um novo documento na subcoleção 'filhos' do usuário atual
        await addDoc(collection(db, "users", user.uid, "filhos"), {
            nome: nomeFilho,
            dataNascimento: dataNascimento, // Salva como Timestamp do Firestore
            pensaoMensal: pensaoMensal,
            observacoes: observacoes,
            statusAindaRecebePensao: statusAindaRecebePensao,
            criadoEm: new Date() // Adiciona um timestamp de criação
        });

        feedbackMessage.textContent = 'Filho cadastrado com sucesso! Redirecionando...';
        feedbackMessage.style.backgroundColor = '#4CAF50'; // Verde para sucesso
        feedbackMessage.style.display = 'block';

        // Limpa o formulário após o cadastro bem-sucedido
        cadastroFilhoForm.reset();

        setTimeout(() => {
            window.location.href = 'gestao.html'; // Redireciona para a página de gestão
        }, 1000); // Redireciona após 1 segundo

    } catch (error) {
        console.error("Erro ao cadastrar filho:", error);
        feedbackMessage.textContent = `Erro ao cadastrar filho: ${error.message}`;
        feedbackMessage.style.backgroundColor = '#f44336'; // Vermelho para erro
        feedbackMessage.style.display = 'block';
    }
});
