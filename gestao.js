import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    orderBy
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Obtém as instâncias globais de autenticação e Firestore do Firebase.
const auth = window.auth;
const db = window.db;

// Elementos do DOM
const usuarioLogadoNomeSpan = document.getElementById('usuarioLogadoNome');
const logoutBtn = document.getElementById('logoutBtn');

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

const filhosContainer = document.getElementById('filhosContainer');
const loadingMessage = document.getElementById('loadingMessage');
const feedbackMessage = document.getElementById('feedbackMessage');

// Elementos da aba de perfil (IDs novos do HTML)
const perfilUsuarioContainer = document.getElementById('perfilUsuarioContainer');
const perfilNomeSpan = document.getElementById('perfilNome'); // Novo ID
const perfilEmailSpan = document.getElementById('perfilEmail'); // Novo ID
const editPerfilBtn = document.getElementById('editPerfilBtn');

// Elementos do modal de pagamento
const pagamentoModal = document.getElementById('pagamentoModal');
const pagamentoForm = document.getElementById('pagamentoForm');
const modalFilhoIdInput = document.getElementById('modalFilhoId');
const modalMesAnoIdInput = document.getElementById('modalMesAnoId');
const modalValorPagoInput = document.getElementById('modalValorPago');
const modalDataPagamentoInput = document.getElementById('modalDataPagamento');
const modalMetodoPagamentoInput = document.getElementById('modalMetodoPagamento');
const modalObservacoesPagamentoInput = document.getElementById('modalObservacoesPagamento');
const cancelPagamentoBtn = document.getElementById('cancelPagamentoBtn');

let currentUserId = null; // Para armazenar o UID do usuário logado

// --- INÍCIO DAS SEÇÕES REMOVIDAS/AJUSTADAS ---

// REMOVIDO: Bloco onAuthStateChanged duplicado.
// A lógica de verificação de autenticação e exibição do nome do usuário
// já é gerenciada centralmente em common.js.
// A chamada inicial para carregar dados será feita via DOMContentLoaded.
/*
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        usuarioLogadoNomeSpan.textContent = user.displayName || user.email;
        logoutBtn.style.display = 'block';
        loadingMessage.style.display = 'block'; // Mostrar carregando ao iniciar
        carregarFilhos();
        // Carregar dados do perfil apenas quando a aba for ativada (já tratado abaixo)
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

// --- FIM DAS SEÇÕES REMOVIDAS/AJUSTADAS ---


// Lógica de Tabs
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;

        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        document.getElementById(targetTab + 'Tab').classList.add('active');
        button.classList.add('active');

        if (targetTab === 'perfil') {
            carregarDadosUsuario();
        } else if (targetTab === 'filhos') {
            // Re-carregar filhos pode ser necessário se houver edições ou exclusões
            carregarFilhos();
        }
    });
});

// Listener para o botão "Editar Perfil" (NOVA LÓGICA)
editPerfilBtn.addEventListener('click', () => {
    window.location.href = 'cadastrousuario.html'; // Redireciona para a página de edição de perfil
});


// Função para carregar dados do usuário (AJUSTADO para novos IDs no HTML)
async function carregarDadosUsuario() {
    const user = auth.currentUser;
    if (user) {
        // Preenche os spans com as informações do usuário
        perfilNomeSpan.textContent = user.displayName || 'Não definido';
        perfilEmailSpan.textContent = user.email || 'Não definido';
    } else {
        perfilNomeSpan.textContent = 'N/A';
        perfilEmailSpan.textContent = 'N/A';
        // O common.js já deve redirecionar se o usuário não estiver logado.
    }
}

// Função para carregar e exibir os filhos
async function carregarFilhos() {
    loadingMessage.style.display = 'block';
    filhosContainer.innerHTML = ''; // Limpa o conteúdo anterior
    const user = auth.currentUser;

    if (!user) {
        loadingMessage.textContent = 'Nenhum usuário logado. Por favor, faça login.';
        return;
    }

    try {
        const q = query(collection(db, "users", user.uid, "filhos"), orderBy("nome"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            loadingMessage.textContent = 'Nenhum filho cadastrado. Clique em "Cadastrar Novo Filho" para começar.';
            return;
        }

        loadingMessage.style.display = 'none';

        for (const docFilho of querySnapshot.docs) {
            const filho = { id: docFilho.id, ...docFilho.data() };
            const dataNascimento = filho.dataNascimento ? filho.dataNascimento.toDate() : null; // Converte Timestamp para Date

            const hoje = new Date();
            let idade = dataNascimento ? hoje.getFullYear() - dataNascimento.getFullYear() : 'N/A';
            if (dataNascimento) {
                const m = hoje.getMonth() - dataNascimento.getMonth();
                if (m < 0 || (m === 0 && hoje.getDate() < dataNascimento.getDate())) {
                    idade--;
                }
            }

            const filhoContent = document.createElement('div');
            filhoContent.classList.add('filho-content');
            filhoContent.innerHTML = `
                <h4>${filho.nome}</h4>
                <p><strong>Idade:</strong> ${idade !== 'N/A' ? idade + ' anos' : 'Data de Nasc. Indefinida'}</p>
                <p><strong>Pensão Mensal:</strong> R$ ${filho.pensaoMensal ? filho.pensaoMensal.toFixed(2).replace('.', ',') : '0,00'}</p>
                <p><strong>Status Pensão (18 anos):</strong> ${filho.statusAindaRecebePensao ? 'Ainda Recebe' : 'Não Recebe Mais'}</p>
                <p><strong>Observações:</strong> ${filho.observacoes || 'N/A'}</p>
                <div class="meses-container" id="meses-${filho.id}">
                    </div>
                <div class="filho-actions">
                    <button class="btn-secundario editar-filho-btn" data-filho-id="${filho.id}">Editar Filho</button>
                    <button class="btn-danger deletar-filho-btn" data-filho-id="${filho.id}">Excluir Filho</button>
                </div>
            `;
            filhosContainer.appendChild(filhoContent);

            // Renderizar meses de pagamento para este filho
            await renderizarMesesPagamento(filho.id, db);
        }

        // Adicionar listeners para botões de edição e exclusão de filhos
        document.querySelectorAll('.deletar-filho-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const filhoId = event.target.dataset.filhoId;
                if (confirm('Tem certeza que deseja excluir este filho e todos os seus registros de pagamento?')) {
                    deletarFilho(filhoId);
                }
            });
        });

        // Adicionar listeners para botões de editar filho (funcionalidade a ser implementada, talvez redirecionando para cadastrofilho.html com ID)
        document.querySelectorAll('.editar-filho-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const filhoId = event.target.dataset.filhoId;
                // Exemplo: Redirecionar para uma página de edição de filho, passando o ID
                alert('Funcionalidade de edição do filho ' + filhoId + ' a ser implementada.');
                // window.location.href = `cadastrofilho.html?id=${filhoId}`; // Se cadastrofilho.html for reusado para edição
            });
        });

    } catch (error) {
        console.error("Erro ao carregar filhos:", error);
        loadingMessage.textContent = 'Erro ao carregar os dados dos filhos.';
        loadingMessage.style.backgroundColor = '#f44336';
        loadingMessage.style.display = 'block';
    }
}

// Função para renderizar os meses de pagamento
async function renderizarMesesPagamento(filhoId, dbInstance) {
    const mesesContainer = document.getElementById(`meses-${filhoId}`);
    const anoAtual = new Date().getFullYear();
    const mesesDoAno = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    mesesContainer.innerHTML = '<h5>Situação Mensal ' + anoAtual + ':</h5>';

    const user = auth.currentUser;
    if (!user) return; // Garante que há um usuário logado

    try {
        const qPagamentos = query(
            collection(dbInstance, "users", user.uid, "filhos", filhoId, "pagamentos"),
            where("ano", "==", anoAtual)
        );
        const pagamentosSnapshot = await getDocs(qPagamentos);
        const pagamentosDoAno = {};
        pagamentosSnapshot.forEach(docPagamento => {
            const pagamento = docPagamento.data();
            const mesAnoKey = `${pagamento.mes}-${pagamento.ano}`;
            if (!pagamentosDoAno[mesAnoKey]) {
                pagamentosDoAno[mesAnoKey] = { valorTotalPago: 0, pagamentos: [] };
            }
            pagamentosDoAno[mesAnoKey].valorTotalPago += pagamento.valorPago;
            pagamentosDoAno[mesAnoKey].pagamentos.push(pagamento);
        });

        // Obter o valor da pensão mensal do filho para cálculo do status
        const filhoDoc = await getDocs(query(collection(dbInstance, "users", user.uid, "filhos"), where("__name__", "==", filhoId)));
        const pensaoMensal = filhoDoc.docs.length > 0 ? filhoDoc.docs[0].data().pensaoMensal : 0;


        mesesDoAno.forEach((nomeMes, indexMes) => {
            const mesAtual = indexMes + 1; // Mês é 1-baseado
            const mesAnoKey = `${mesAtual}-${anoAtual}`;
            const dadosPagamentoMes = pagamentosDoAno[mesAnoKey];

            let statusClass = 'nao-pago';
            let statusText = 'Não Pago';

            if (dadosPagamentoMes) {
                if (dadosPagamentoMes.valorTotalPago >= pensaoMensal) {
                    statusClass = 'pago-completo';
                    statusText = `Pago (Total: R$ ${dadosPagamentoMes.valorTotalPago.toFixed(2).replace('.', ',')})`;
                } else if (dadosPagamentoMes.valorTotalPago > 0 && dadosPagamentoMes.valorTotalPago < pensaoMensal) {
                    statusClass = 'pago-parcial';
                    statusText = `Pago Parcialmente (Total: R$ ${dadosPagamentoMes.valorTotalPago.toFixed(2).replace('.', ',')})`;
                }
            }

            const mesItem = document.createElement('div');
            mesItem.classList.add('mes-item', statusClass);
            mesItem.innerHTML = `
                <span>${nomeMes}: ${statusText}</span>
                <button class="registrar-pagamento-btn" data-filho-id="${filhoId}" data-mes-ano-id="${mesAnoKey}">Registrar Pagamento</button>
            `;
            mesesContainer.appendChild(mesItem);
        });

        // Adicionar listeners aos botões de registrar pagamento
        document.querySelectorAll(`#meses-${filhoId} .registrar-pagamento-btn`).forEach(button => {
            button.addEventListener('click', (event) => {
                const filhoId = event.target.dataset.filhoId;
                const mesAnoId = event.target.dataset.mesAnoId;
                registrarPagamentoModal(filhoId, mesAnoId);
            });
        });

    } catch (error) {
        console.error("Erro ao renderizar meses de pagamento:", error);
        mesesContainer.innerHTML = `<p style="color: #f44336;">Erro ao carregar pagamentos para este filho.</p>`;
    }
}


// Abre o modal de registro de pagamento
function registrarPagamentoModal(filhoId, mesAnoId) {
    modalFilhoIdInput.value = filhoId;
    modalMesAnoIdInput.value = mesAnoId;
    modalDataPagamentoInput.valueAsDate = new Date(); // Preenche com a data atual
    modalValorPagoInput.value = '';
    modalObservacoesPagamentoInput.value = '';
    modalMetodoPagamentoInput.value = ''; // Limpa seleção

    pagamentoModal.style.display = 'flex';
}

// Fecha o modal de registro de pagamento
cancelPagamentoBtn.addEventListener('click', () => {
    pagamentoModal.style.display = 'none';
    feedbackMessage.style.display = 'none'; // Esconde mensagens do modal
});

// Salva o pagamento
pagamentoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const filhoId = modalFilhoIdInput.value;
    const mesAnoId = modalMesAnoIdInput.value;
    const valorPago = parseFloat(modalValorPagoInput.value);
    const dataPagamento = new Date(modalDataPagamentoInput.value);
    const metodoPagamento = modalMetodoPagamentoInput.value;
    const observacoesPagamento = modalObservacoesPagamentoInput.value;

    if (!valorPago || !dataPagamento || !metodoPagamento || isNaN(valorPago)) {
        feedbackMessage.textContent = 'Por favor, preencha todos os campos obrigatórios do pagamento.';
        feedbackMessage.style.backgroundColor = '#f44336';
        feedbackMessage.style.display = 'block';
        return;
    }

    const [mes, ano] = mesAnoId.split('-').map(Number); // Pega mes e ano do id

    const user = auth.currentUser;
    if (!user) {
        feedbackMessage.textContent = 'Nenhum usuário logado para registrar pagamento.';
        feedbackMessage.style.backgroundColor = '#f44336';
        feedbackMessage.style.display = 'block';
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        return;
    }

    feedbackMessage.style.display = 'none';
    feedbackMessage.textContent = '';

    try {
        await addDoc(collection(db, "users", user.uid, "filhos", filhoId, "pagamentos"), {
            valorPago: valorPago,
            dataPagamento: dataPagamento, // Salva como Timestamp do Firestore
            metodoPagamento: metodoPagamento,
            observacoes: observacoesPagamento,
            mes: mes,
            ano: ano,
            registradoEm: new Date()
        });

        feedbackMessage.textContent = 'Pagamento registrado com sucesso!';
        feedbackMessage.style.backgroundColor = '#4CAF50';
        feedbackMessage.style.display = 'block';

        pagamentoModal.style.display = 'none';
        carregarFilhos(); // Recarrega os filhos para atualizar o status do pagamento

    } catch (error) {
        console.error("Erro ao registrar pagamento:", error);
        feedbackMessage.textContent = `Erro ao registrar pagamento: ${error.message}`;
        feedbackMessage.style.backgroundColor = '#f44336';
        feedbackMessage.style.display = 'block';
    }
});


// Função para deletar um filho e seus pagamentos
async function deletarFilho(filhoId) {
    const user = auth.currentUser;
    if (!user) {
        alert("Nenhum usuário logado para deletar filho.");
        window.location.href = 'index.html';
        return;
    }

    try {
        // 1. Deletar todos os pagamentos associados ao filho (subcoleção)
        const pagamentosRef = collection(db, "users", user.uid, "filhos", filhoId, "pagamentos");
        const pagamentosSnapshot = await getDocs(pagamentosRef);
        const deletePromises = [];
        pagamentosSnapshot.forEach((docPagamento) => {
            deletePromises.push(deleteDoc(doc(db, "users", user.uid, "filhos", filhoId, "pagamentos", docPagamento.id)));
        });
        await Promise.all(deletePromises); // Espera todos os pagamentos serem deletados

        // 2. Deletar o documento do filho
        await deleteDoc(doc(db, "users", user.uid, "filhos", filhoId));

        feedbackMessage.textContent = 'Filho e todos os pagamentos associados excluídos com sucesso!';
        feedbackMessage.style.backgroundColor = '#4CAF50';
        feedbackMessage.style.display = 'block';
        carregarFilhos(); // Recarrega a lista para atualizar a UI

    } catch (error) {
        console.error("Erro ao deletar filho:", error);
        feedbackMessage.textContent = `Erro ao deletar filho: ${error.message}`;
        feedbackMessage.style.backgroundColor = '#f44336';
        feedbackMessage.style.display = 'block';
    }
}

// Função auxiliar para formatar data
function formatarData(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Mês é 0-baseado
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

// Inicia o carregamento dos dados quando o DOM estiver completamente carregado
document.addEventListener('DOMContentLoaded', () => {
    // Obter o usuário atual uma vez que common.js já configurou a autenticação
    const user = auth.currentUser;
    if (user) {
        currentUserId = user.uid; // Define o UID globalmente
        loadingMessage.style.display = 'block'; // Mostrar carregando ao iniciar
        carregarFilhos(); // Carrega os filhos
        // carregarDadosUsuario(); // Não é necessário chamar aqui, pois é chamado ao ativar a aba de perfil
    } else {
        // common.js já deve redirecionar se o usuário não estiver logado
        loadingMessage.textContent = 'Redirecionando para login...';
    }
});
