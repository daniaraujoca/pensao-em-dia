// gestao.js
// IMPORTS NECESSÁRIOS PARA gestao.js
import { auth, db } from "./common.js";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


// Declaração de variáveis globais ou elementos do DOM para evitar erros de "não definido"
// Certifique-se de que esses elementos existam no seu HTML
let filhos = []; // Armazenará os dados dos filhos carregados
const filhosListElement = document.getElementById("filhos-list"); // Exemplo, ajuste para o ID real da sua lista de filhos
const addFilhoButton = document.getElementById("add-filho-btn"); // Exemplo, ajuste para o ID real do seu botão de adicionar
const filhoModal = document.getElementById("filho-modal"); // Modal para adicionar/editar filho
const closeModalButton = document.getElementById("close-modal-btn");
const filhoForm = document.getElementById("filho-form"); // Formulário dentro do modal
const filhoIdInput = document.getElementById("filho-id");
const filhoNomeInput = document.getElementById("filho-nome");
const filhoDataNascimentoInput = document.getElementById("filho-dataNascimento");
const filhoValorMensalInput = document.getElementById("filho-valorMensal");
const filhoDiaVencimentoInput = document.getElementById("filho-diaVencimento");
const anosCalculoContainer = document.getElementById("anos-calculo-container"); // Container dos checkboxes de anos
const pagamentoModal = document.getElementById("pagamento-modal");
const closePagamentoModalBtn = document.getElementById("close-pagamento-modal-btn");
const pagamentoForm = document.getElementById("pagamento-form");
const pagamentoFilhoIdInput = document.getElementById("pagamento-filho-id");
const pagamentoAnoInput = document.getElementById("pagamento-ano");
const pagamentoMesInput = document.getElementById("pagamento-mes");
const pagamentoValorInput = document.getElementById("pagamento-valor");
const pagamentoDataInput = document.getElementById("pagamento-data");
const pagamentosListContainer = document.getElementById("pagamentos-list-container"); // Onde a lista de pagamentos é exibida no modal
let currentEditingFilhoId = null; // Para saber qual filho está sendo editado ou pago

// --- Funções de Inicialização e Carregamento de Dados ---

document.addEventListener("DOMContentLoaded", async () => {
    await carregarFilhos();

    // Event Listeners
    if (addFilhoButton) {
        addFilhoButton.addEventListener("click", () => openFilhoModal());
    }
    if (closeModalButton) {
        closeModalButton.addEventListener("click", () => closeFilhoModal());
    }
    if (filhoForm) {
        filhoForm.addEventListener("submit", handleFilhoFormSubmit);
    }
    if (closePagamentoModalBtn) {
        closePagamentoModalBtn.addEventListener("click", () => closePagamentoModal());
    }
    if (pagamentoForm) {
        pagamentoForm.addEventListener("submit", handlePagamentoFormSubmit);
    }

    // Geração dinâmica dos checkboxes de anos
    const currentYear = new Date().getFullYear();
    for (let i = -2; i <= 2; i++) { // Anos de (Ano Atual - 2) a (Ano Atual + 2)
        const year = currentYear + i;
        const checkboxDiv = document.createElement("div");
        checkboxDiv.classList.add("year-checkbox");
        checkboxDiv.innerHTML = `
            <input type="checkbox" id="ano-${year}" value="${year}">
            <label for="ano-${year}">${year}</label>
        `;
        if (anosCalculoContainer) {
            anosCalculoContainer.appendChild(checkboxDiv);
        }
    }
});


async function carregarFilhos() {
    try {
        filhos = await getFilhosDoUsuarioFirestore();
        renderFilhosList();
    } catch (error) {
        console.error("Erro ao carregar filhos:", error);
        // Exibir uma mensagem para o usuário, se apropriado
    }
}

async function getFilhosDoUsuarioFirestore() {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();
            if (user) {
                const userId = user.uid;
                const filhosRef = collection(db, "users", userId, "filhos");
                try {
                    const querySnapshot = await getDocs(filhosRef);
                    const filhosData = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    resolve(normalizePagamentos(filhosData));
                } catch (e) {
                    console.error("Erro ao buscar filhos do Firestore: ", e);
                    reject(e);
                }
            } else {
                console.warn("Usuário não autenticado. Redirecionando para login.");
                window.location.href = "index.html";
                reject(new Error("Usuário não autenticado."));
            }
        });
    });
}

/**
 * Salva ou atualiza os dados de um filho no Firestore.
 * @param {Object} filho O objeto filho com os dados a serem salvos.
 */
async function salvarFilhoNoFirestore(filho) {
    if (!auth.currentUser) {
        console.error("Usuário não autenticado. Não é possível salvar dados.");
        alert("Sua sessão expirou ou você não está logado. Por favor, faça login novamente.");
        window.location.href = "index.html";
        return;
    }
    const userId = auth.currentUser.uid;
    const filhoDocRef = doc(db, "users", userId, "filhos", filho.id);

    // --- INÍCIO DA CORREÇÃO PARA O ERRO DE NESTED ARRAYS ---
    const pagamentosParaSalvar = {};
    for (const ano in filho.pagamentos) {
        if (filho.pagamentos.hasOwnProperty(ano) && Array.isArray(filho.pagamentos[ano])) {
            // Para cada ano, achate o array de meses para um único array de pagamentos
            // O Firestore permite arrays de objetos, mas não arrays de arrays de objetos.
            // Então, transformamos [[pag1], [pag2, pag3], []] em [pag1, pag2, pag3]
            pagamentosParaSalvar[ano] = filho.pagamentos[ano].flat();
        }
    }
    // --- FIM DA CORREÇÃO PARA O ERRO DE NESTED ARRAYS ---

    try {
        await setDoc(filhoDocRef, {
            nome: filho.nome,
            dataNascimento: filho.dataNascimento,
            valorMensal: filho.valorMensal, // PADRONIZADO para valorMensal
            diaVencimento: filho.diaVencimento,
            pagamentos: pagamentosParaSalvar, // Usamos a estrutura achatada aqui
            anosCalculoHabilitados: filho.anosCalculoHabilitados
        });
        console.log("Filho atualizado no Firestore:", filho.nome);
        return true; // Indica sucesso
    } catch (e) {
        console.error("Erro ao salvar filho no Firestore: ", e);
        alert("Erro ao salvar dados do filho. Tente novamente.");
        return false; // Indica falha
    }
}

/**
 * Normaliza a estrutura de pagamentos para garantir que seja um objeto de anos,
 * onde cada ano contém um array de 12 arrays para os meses.
 * Também garante que 'anosCalculoHabilitados' seja um array.
 * @param {Array} filhos Array de objetos de filhos.
 * @returns {Array} Array de filhos com a estrutura de pagamentos normalizada.
 */
function normalizePagamentos(filhos) {
    return filhos.map(filho => {
        // Garante que 'pagamentos' é um objeto (mapa de anos)
        if (!filho.pagamentos || typeof filho.pagamentos !== 'object') {
            filho.pagamentos = {};
        }
        // Garante que 'anosCalculoHabilitados' é um array
        if (!filho.anosCalculoHabilitados || !Array.isArray(filho.anosCalculoHabilitados)) {
            filho.anosCalculoHabilitados = [];
        }
        
        // Itera sobre os anos existentes em pagamentos (que agora são arrays planos após a leitura)
        for (const year in filho.pagamentos) {
            if (filho.pagamentos.hasOwnProperty(year)) {
                const pagamentosDoAnoPlano = filho.pagamentos[year] || [];
                // Cria uma nova estrutura de 12 arrays para os meses
                filho.pagamentos[year] = Array(12).fill().map(() => []); 
                
                // Redistribui pagamentos planos para a nova estrutura de 12 arrays de meses
                pagamentosDoAnoPlano.forEach(p => {
                    if (p && p.data) { // Garante que o pagamento e a data existem
                        const pParts = p.data.split('/'); // Ex: "DD/MM/AAAA"
                        const pMonth = parseInt(pParts[1], 10) - 1; // Mês é 0-indexado
                        if (pMonth >= 0 && pMonth < 12) {
                            filho.pagamentos[year][pMonth].push(p);
                        }
                    }
                });
            }
        }
        return filho;
    });
}

/**
 * Calcula o montante total devido por um filho e seu status (verde, amarelo, vermelho).
 * @param {Object} filho O objeto filho para cálculo.
 * @returns {{totalDevido: number, status: string}} Objeto contendo o total devido e o status.
 */
function calcularMontanteDevido(filho) {
    const valorMensal = parseFloat(filho.valorMensal);
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // 0-indexed

    let totalDevido = 0;
    let status = "verde"; // Padrão: tudo ok
    let temMesesComDivida = false; 

    for (const ano of filho.anosCalculoHabilitados) {
        if (ano > anoAtual) continue; // Não calcula dívida para anos futuros

        // Usa a estrutura já normalizada (array de 12 arrays de meses)
        const pagamentosDoAnoNormalizado = filho.pagamentos[ano] || Array(12).fill().map(() => []);

        let limiteMes = 11; // Por padrão, calcula até Dezembro
        if (ano === anoAtual) {
            limiteMes = mesAtual; // Para o ano atual, calcula só até o mês atual
        }

        for (let mes = 0; mes <= limiteMes; mes++) {
            const pagamentosMes = pagamentosDoAnoNormalizado[mes] || [];
            const totalPago = pagamentosMes.reduce((soma, p) => soma + parseFloat(p.valor || 0), 0);

            if (totalPago < valorMensal) {
                totalDevido += (valorMensal - totalPago);
                temMesesComDivida = true;
                if (totalPago === 0) {
                    status = "vermelho";
                } else if (status !== "vermelho") {
                    status = "amarelo";
                }
            }
        }
    }
    
    if (totalDevido === 0) {
        status = "verde";
    }

    return { totalDevido, status };
}

// --- Funções de Renderização da UI ---

function renderFilhosList() {
    if (!filhosListElement) return;

    filhosListElement.innerHTML = ''; // Limpa a lista existente
    if (filhos.length === 0) {
        filhosListElement.innerHTML = '<p>Nenhum filho cadastrado ainda. Clique em "Adicionar Filho" para começar!</p>';
        return;
    }

    filhos.forEach(filho => {
        const { totalDevido, status } = calcularMontanteDevido(filho);
        const filhoItem = document.createElement("div");
        filhoItem.classList.add("filho-item", status); // Adiciona classe de status para cor

        filhoItem.innerHTML = `
            <h3>${filho.nome}</h3>
            <p>Nascimento: ${filho.dataNascimento}</p>
            <p>Pensão Mensal: R$ ${parseFloat(filho.valorMensal).toFixed(2)}</p>
            <p>Vencimento: Dia ${filho.diaVencimento}</p>
            <p>Total Devido: R$ ${totalDevido.toFixed(2)}</p>
            <div class="filho-actions">
                <button class="edit-btn" data-id="${filho.id}">Editar</button>
                <button class="pagar-btn" data-id="${filho.id}">Pagamento</button>
                <button class="delete-btn" data-id="${filho.id}">Excluir</button>
            </div>
        `;
        filhosListElement.appendChild(filhoItem);

        // Adiciona event listeners aos botões
        filhoItem.querySelector(".edit-btn").addEventListener("click", () => openFilhoModal(filho));
        filhoItem.querySelector(".pagar-btn").addEventListener("click", () => openPagamentoModal(filho));
        filhoItem.querySelector(".delete-btn").addEventListener("click", () => deletarFilho(filho.id, filho.nome));
    });
}

// --- Funções de Manipulação de Modal de Filho ---

function openFilhoModal(filho = null) {
    if (!filhoModal || !filhoForm || !anosCalculoContainer) return;

    filhoForm.reset();
    currentEditingFilhoId = null;

    // Limpa e reseta os checkboxes de anos
    Array.from(anosCalculoContainer.querySelectorAll('input[type="checkbox"]')).forEach(checkbox => {
        checkbox.checked = false;
    });

    if (filho) {
        currentEditingFilhoId = filho.id;
        filhoIdInput.value = filho.id;
        filhoNomeInput.value = filho.nome;
        filhoDataNascimentoInput.value = filho.dataNascimento;
        filhoValorMensalInput.value = filho.valorMensal;
        filhoDiaVencimentoInput.value = filho.diaVencimento;

        // Marca os anos habilitados para cálculo
        if (filho.anosCalculoHabilitados && Array.isArray(filho.anosCalculoHabilitados)) {
            filho.anosCalculoHabilitados.forEach(year => {
                const checkbox = document.getElementById(`ano-${year}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
    } else {
        // Gerar um ID único para um novo filho
        filhoIdInput.value = doc(collection(db, "temp")).id; // Gera um ID aleatório do Firestore
    }
    filhoModal.style.display = "block";
}

function closeFilhoModal() {
    if (filhoModal) {
        filhoModal.style.display = "none";
    }
}

async function handleFilhoFormSubmit(e) {
    e.preventDefault();

    const filhoId = filhoIdInput.value;
    const nome = filhoNomeInput.value;
    const dataNascimento = filhoDataNascimentoInput.value;
    const valorMensal = parseFloat(filhoValorMensalInput.value);
    const diaVencimento = parseInt(filhoDiaVencimentoInput.value);

    // Coleta os anos habilitados para cálculo
    const anosCalculoHabilitados = Array.from(anosCalculoContainer.querySelectorAll('input[type="checkbox"]:checked'))
                                     .map(cb => parseInt(cb.value));

    // Encontre o filho existente para preservar os pagamentos, se houver
    let filhoExistente = filhos.find(f => f.id === filhoId);
    let pagamentosExistentes = filhoExistente ? filhoExistente.pagamentos : {};

    const novoFilho = {
        id: filhoId,
        nome: nome,
        dataNascimento: dataNascimento,
        valorMensal: valorMensal,
        diaVencimento: diaVencimento,
        pagamentos: pagamentosExistentes, // Mantém os pagamentos existentes
        anosCalculoHabilitados: anosCalculoHabilitados
    };

    const success = await salvarFilhoNoFirestore(novoFilho);
    if (success) {
        closeFilhoModal();
        await carregarFilhos(); // Recarrega a lista para refletir a mudança
    }
}

async function deletarFilho(id, nome) {
    if (confirm(`Tem certeza que deseja excluir os dados de ${nome}?`)) {
        if (!auth.currentUser) {
            console.error("Usuário não autenticado. Não é possível excluir dados.");
            alert("Sua sessão expirou ou você não está logado. Por favor, faça login novamente.");
            window.location.href = "index.html";
            return;
        }
        const userId = auth.currentUser.uid;
        const filhoDocRef = doc(db, "users", userId, "filhos", id);
        try {
            await deleteDoc(filhoDocRef);
            console.log("Filho excluído do Firestore:", nome);
            await carregarFilhos(); // Recarrega a lista após exclusão
        } catch (e) {
            console.error("Erro ao excluir filho do Firestore: ", e);
            alert("Erro ao excluir dados do filho. Tente novamente.");
        }
    }
}

// --- Funções de Manipulação de Modal de Pagamento ---

function openPagamentoModal(filho) {
    if (!pagamentoModal || !pagamentoForm) return;

    currentEditingFilhoId = filho.id;
    pagamentoFilhoIdInput.value = filho.id;
    pagamentoAnoInput.value = new Date().getFullYear();
    pagamentoMesInput.value = new Date().getMonth() + 1; // Mês atual (1-indexado)
    pagamentoValorInput.value = filho.valorMensal; // Sugere o valor da pensão
    pagamentoDataInput.value = new Date().toISOString().slice(0, 10); // Data atual YYYY-MM-DD

    renderPagamentosList(filho); // Renderiza a lista de pagamentos existentes
    pagamentoModal.style.display = "block";
}

function closePagamentoModal() {
    if (pagamentoModal) {
        pagamentoModal.style.display = "none";
    }
}

async function handlePagamentoFormSubmit(e) {
    e.preventDefault();

    const filhoId = pagamentoFilhoIdInput.value;
    const ano = parseInt(pagamentoAnoInput.value);
    const mes = parseInt(pagamentoMesInput.value) - 1; // 0-indexed
    const valor = parseFloat(pagamentoValorInput.value);
    const data = pagamentoDataInput.value; // Formato YYYY-MM-DD

    const filhoIndex = filhos.findIndex(f => f.id === filhoId);
    if (filhoIndex === -1) {
        alert("Filho não encontrado.");
        return;
    }

    const filho = filhos[filhoIndex];

    // Garante que a estrutura de pagamentos para o ano e mês exista
    if (!filho.pagamentos[ano]) {
        filho.pagamentos[ano] = Array(12).fill().map(() => []); // Inicializa o ano com 12 arrays vazios
    }
    if (!Array.isArray(filho.pagamentos[ano][mes])) {
        filho.pagamentos[ano][mes] = [];
    }

    // Adiciona o novo pagamento
    filho.pagamentos[ano][mes].push({ valor: valor, data: data });

    const success = await salvarFilhoNoFirestore(filho);
    if (success) {
        // Atualiza a lista de pagamentos no modal e a lista principal
        renderPagamentosList(filho);
        renderFilhosList(); // Atualiza o status na lista principal
        // Limpa o formulário de pagamento (opcional, pode ser para adicionar vários)
        // pagamentoValorInput.value = '';
        // pagamentoDataInput.value = new Date().toISOString().slice(0, 10);
    }
}

function renderPagamentosList(filho) {
    if (!pagamentosListContainer) return;

    pagamentosListContainer.innerHTML = '';
    const pagamentosDoFilho = filho.pagamentos || {};

    let hasPagamentos = false;

    // Itera pelos anos em ordem decrescente
    Object.keys(pagamentosDoFilho).sort((a, b) => b - a).forEach(ano => {
        const pagamentosAno = pagamentosDoFilho[ano];
        if (pagamentosAno && Array.isArray(pagamentosAno)) {
            // Itera pelos meses (0-11)
            pagamentosAno.forEach((pagamentosMes, mesIndex) => {
                if (pagamentosMes && Array.isArray(pagamentosMes) && pagamentosMes.length > 0) {
                    hasPagamentos = true;
                    const mesNome = new Date(ano, mesIndex).toLocaleString('pt-BR', { month: 'long' });
                    const mesDiv = document.createElement("div");
                    mesDiv.classList.add("pagamento-mes-group");
                    mesDiv.innerHTML = `<h4>${mesNome}/${ano}</h4>`;

                    pagamentosMes.forEach(pagamento => {
                        const pagamentoItem = document.createElement("div");
                        pagamentoItem.classList.add("pagamento-item");
                        pagamentoItem.innerHTML = `
                            <span>R$ ${parseFloat(pagamento.valor).toFixed(2)} - ${pagamento.data}</span>
                            <button class="delete-pagamento-btn" 
                                data-filho-id="${filho.id}" 
                                data-ano="${ano}" 
                                data-mes="${mesIndex}" 
                                data-valor="${pagamento.valor}" 
                                data-data="${pagamento.data}">
                                &times;
                            </button>
                        `;
                        mesDiv.appendChild(pagamentoItem);
                    });
                    pagamentosListContainer.appendChild(mesDiv);
                }
            });
        }
    });

    if (!hasPagamentos) {
        pagamentosListContainer.innerHTML = '<p>Nenhum pagamento registrado para este filho.</p>';
    }

    // Adiciona event listeners para os botões de exclusão de pagamento
    pagamentosListContainer.querySelectorAll(".delete-pagamento-btn").forEach(button => {
        button.addEventListener("click", handleDeletePagamento);
    });
}

async function handleDeletePagamento(e) {
    const btn = e.target;
    const filhoId = btn.dataset.filhoId;
    const ano = parseInt(btn.dataset.ano);
    const mes = parseInt(btn.dataset.mes);
    const valor = parseFloat(btn.dataset.valor);
    const data = btn.dataset.data;

    if (!confirm(`Tem certeza que deseja excluir o pagamento de R$ ${valor.toFixed(2)} em ${data} para este mês?`)) {
        return;
    }

    const filhoIndex = filhos.findIndex(f => f.id === filhoId);
    if (filhoIndex === -1) {
        alert("Filho não encontrado.");
        return;
    }

    const filho = filhos[filhoIndex];

    if (filho.pagamentos && filho.pagamentos[ano] && Array.isArray(filho.pagamentos[ano][mes])) {
        // Encontra o índice do pagamento específico a ser removido
        const pagamentoToRemoveIndex = filho.pagamentos[ano][mes].findIndex(p => 
            p.valor === valor && p.data === data
        );

        if (pagamentoToRemoveIndex > -1) {
            filho.pagamentos[ano][mes].splice(pagamentoToRemoveIndex, 1); // Remove o pagamento
            const success = await salvarFilhoNoFirestore(filho); // Salva a alteração
            if (success) {
                renderPagamentosList(filho); // Atualiza a lista no modal
                renderFilhosList(); // Atualiza a lista principal
            }
        } else {
            console.warn("Pagamento não encontrado para exclusão.");
        }
    }
}
