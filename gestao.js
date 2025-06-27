// gestao.js
import { auth, db } from "./common.js";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let filhos = []; // Armazenará os dados dos filhos carregados
let activeFilhoId = null; // ID do filho cuja aba está ativa
let currentYear = new Date().getFullYear(); // Ano atualmente exibido para o filho ativo

// Elementos do DOM
const filhoTabsContainer = document.getElementById("filhoTabs"); // Contêiner das abas
const filhosContentElement = document.getElementById("filhosContent"); // Onde o conteúdo do filho ativo será renderizado
const pagamentoModal = document.getElementById("pagamentoModal");
const closePagamentoModalBtn = document.getElementById("closePagamentoModalBtn");
const pagamentoForm = document.getElementById("pagamentoForm");
const pagamentoFilhoIdInput = document.getElementById("pagamentoFilhoIdInput");
const modalValorInput = document.getElementById("modalValor");
const modalDataInput = document.getElementById("modalData");
const pagamentosListContainer = document.getElementById("pagamentos-list-container");

// Variáveis para controle de edição de pagamento
let editingPayment = null; // Armazena o pagamento que está sendo editado (se houver)

document.addEventListener("DOMContentLoaded", async () => {
    // Esconder o conteúdo principal até que os filhos sejam carregados e a primeira aba renderizada
    if (filhosContentElement) {
        filhosContentElement.innerHTML = '<p>Carregando dados da pensão...</p>';
    }

    await carregarFilhos();

    if (closePagamentoModalBtn) {
        closePagamentoModalBtn.addEventListener("click", () => closePagamentoModal());
    }
    if (pagamentoForm) {
        pagamentoForm.addEventListener("submit", handlePagamentoFormSubmit);
    }
});

async function carregarFilhos() {
    try {
        filhos = await getFilhosDoUsuarioFirestore();
        if (filhos.length > 0) {
            renderFilhoTabs(); // Renderiza as abas
            // Ativa a primeira aba por padrão ou a última ativa se houver
            activeFilhoId = filhos[0].id;
            renderFilhoContent(activeFilhoId);
        } else {
            filhosContentElement.innerHTML = `
                <div class="sem-filhos-gestao">
                    <p>Nenhum filho cadastrado ainda. Para gerenciar pagamentos, por favor, <a href="./cadastrofilho.html">cadastre um filho</a>.</p>
                </div>
            `;
            filhoTabsContainer.innerHTML = ''; // Garante que as abas fiquem vazias
        }
    } catch (error) {
        console.error("Erro ao carregar filhos:", error);
        if (filhosContentElement) {
            filhosContentElement.innerHTML = '<p>Erro ao carregar os dados dos filhos. Por favor, tente novamente.</p>';
        }
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

async function salvarFilhoNoFirestore(filho) {
    if (!auth.currentUser) {
        console.error("Usuário não autenticado. Não é possível salvar dados.");
        alert("Sua sessão expirou ou você não está logado. Por favor, faça login novamente.");
        window.location.href = "index.html";
        return false;
    }
    const userId = auth.currentUser.uid;
    const filhoDocRef = doc(db, "users", userId, "filhos", filho.id);

    // Achata a estrutura de pagamentos para salvar no Firestore (de 12 arrays para um array plano)
    const pagamentosParaSalvar = {};
    for (const ano in filho.pagamentos) {
        if (filho.pagamentos.hasOwnProperty(ano)) {
            pagamentosParaSalvar[ano] = filho.pagamentos[ano].flat();
        }
    }

    try {
        await setDoc(filhoDocRef, {
            nome: filho.nome,
            dataNascimento: filho.dataNascimento,
            valorMensal: filho.valorMensal,
            diaVencimento: filho.diaVencimento,
            pagamentos: pagamentosParaSalvar,
            anosCalculoHabilitados: filho.anosCalculoHabilitados || []
        }, { merge: true });
        console.log("Dados do filho (incluindo pagamentos) atualizados no Firestore:", filho.nome);
        return true;
    } catch (e) {
        console.error("Erro ao salvar dados do filho no Firestore: ", e);
        alert("Erro ao salvar dados do filho. Tente novamente.");
        return false;
    }
}

/**
 * Normaliza a estrutura de pagamentos: objeto de anos, cada ano com 12 arrays para meses.
 * Garante que 'anosCalculoHabilitados' seja um array.
 */
function normalizePagamentos(filhos) {
    return filhos.map(filho => {
        if (!filho.pagamentos || typeof filho.pagamentos !== 'object') {
            filho.pagamentos = {};
        }
        if (!filho.anosCalculoHabilitados || !Array.isArray(filho.anosCalculoHabilitados)) {
            filho.anosCalculoHabilitados = [];
        }

        // Reconstrói a estrutura de 12 arrays de meses para cada ano
        const newPagamentos = {};
        for (const year in filho.pagamentos) {
            if (filho.pagamentos.hasOwnProperty(year)) {
                const pagamentosDoAnoPlano = filho.pagamentos[year] || [];
                const monthsArray = Array(12).fill().map(() => []);

                pagamentosDoAnoPlano.forEach(p => {
                    if (p && p.data) {
                        let pDate = null;
                        if (p.data.includes('-')) { // Assume YYYY-MM-DD
                            pDate = new Date(p.data + 'T00:00:00');
                        } else { // Assume DD/MM/YYYY
                            const parts = p.data.split('/');
                            pDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
                        }

                        if (pDate && !isNaN(pDate.getTime())) {
                            const pMonth = pDate.getMonth();
                            if (pMonth >= 0 && pMonth < 12) {
                                monthsArray[pMonth].push(p);
                            }
                        }
                    }
                });
                newPagamentos[year] = monthsArray;
            }
        }
        filho.pagamentos = newPagamentos;
        return filho;
    });
}

/**
 * Calcula o montante total devido por um filho e seu status.
 */
function calcularMontanteDevido(filho) {
    const valorMensal = parseFloat(filho.valorMensal || 0);
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();

    let totalDevido = 0;
    let status = "verde"; // Padrão para quando não há dívida

    const anosParaCalcular = filho.anosCalculoHabilitados && filho.anosCalculoHabilitados.length > 0
        ? filho.anosCalculoHabilitados
        : [anoAtual]; // Se nenhum ano habilitado, considere apenas o ano atual

    for (const ano of anosParaCalcular) {
        if (ano > anoAtual) continue; // Não calcula anos futuros

        const pagamentosDoAnoNormalizado = filho.pagamentos[ano] || Array(12).fill().map(() => []);

        let limiteMes = 11;
        if (ano === anoAtual) {
            limiteMes = mesAtual;
        }

        for (let mes = 0; mes <= limiteMes; mes++) {
            const pagamentosMes = pagamentosDoAnoNormalizado[mes] || [];
            const totalPago = pagamentosMes.reduce((soma, p) => soma + parseFloat(p.valor || 0), 0);

            if (totalPago < valorMensal) {
                totalDevido += (valorMensal - totalPago);
                if (totalPago === 0) {
                    status = "vermelho";
                } else if (status !== "vermelho") { // Garante que se já for vermelho, permaneça
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

function renderFilhoTabs() {
    const filhoTabsContainer = document.getElementById("filhoTabs");
    if (!filhoTabsContainer) {
        console.error("Elemento '#filhoTabs' não encontrado.");
        return;
    }
    filhoTabsContainer.innerHTML = ''; // Limpa as abas existentes

    filhos.forEach(filho => {
        const tabButton = document.createElement("button");
        tabButton.classList.add("tab-button");
        tabButton.textContent = filho.nome;
        tabButton.dataset.id = filho.id; // Armazena o ID do filho no data-attribute

        // Adiciona a classe 'active' se for o filho atualmente ativo
        if (filho.id === activeFilhoId) {
            tabButton.classList.add("active");
        }

        tabButton.addEventListener("click", () => {
            // Remove a classe 'active' de todas as abas
            document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
            // Adiciona a classe 'active' à aba clicada
            tabButton.classList.add("active");
            activeFilhoId = filho.id;
            // Redesenha o conteúdo do filho ativo
            renderFilhoContent(activeFilhoId);
        });
        filhoTabsContainer.appendChild(tabButton);
    });
}

function renderFilhoContent(filhoId) {
    const filho = filhos.find(f => f.id === filhoId);
    if (!filho || !filhosContentElement) {
        console.error("Filho não encontrado ou elemento de conteúdo do filho não disponível.");
        filhosContentElement.innerHTML = '<p>Selecione um filho para visualizar os detalhes.</p>';
        return;
    }

    const { totalDevido, status } = calcularMontanteDevido(filho);
    const anoAtualRender = currentYear; // Usar o ano armazenado globalmente para o filho ativo

    filhosContentElement.innerHTML = `
        <div class="filho-bloco" id="filhoBloco-${filho.id}">
            <div class="filho-header">
                <h2>Filho(a): ${filho.nome}</h2>
                <div class="filho-detalhes">
                    <p>Valor Mensal Devido: R$ ${parseFloat(filho.valorMensal).toFixed(2)}</p>
                    <p>Idade: ${calcularIdade(filho.dataNascimento)} anos</p>
                </div>
            </div>

            <div class="montante-devedor ${status}">
                Montante Devedor: R$ ${totalDevido.toFixed(2)}
            </div>

            <div class="year-navigation">
                <button class="nav-btn" id="prevYearBtn-${filho.id}"><i class="fas fa-chevron-left"></i> Anterior</button>
                <span class="current-year" id="currentYear-${filho.id}">Ano: ${anoAtualRender}</span>
                <button class="nav-btn" id="nextYearBtn-${filho.id}">Próximo <i class="fas fa-chevron-right"></i></button>
            </div>

            <div class="year-enable-toggle">
                <label>
                    <input type="checkbox" id="enableYearCheckbox-${filho.id}" ${filho.anosCalculoHabilitados.includes(anoAtualRender) ? 'checked' : ''}>
                    Habilitar ${anoAtualRender} para cálculo de dívida de ${filho.nome}
                </label>
                <small>Apenas anos habilitados são considerados no montante devedor.</small>
            </div>

            <div class="meses-grid" id="mesesGrid-${filho.id}">
                ${renderMesesDoAno(filho, anoAtualRender)}
            </div>

            <button class="toggle-meses-btn" data-target="mesesGrid-${filho.id}">Esconder Meses (${anoAtualRender})</button>
        </div>
    `;

    // Adiciona event listeners para os botões de navegação de ano
    document.getElementById(`prevYearBtn-${filho.id}`).addEventListener('click', () => changeYear(filho.id, -1));
    document.getElementById(`nextYearBtn-${filho.id}`).addEventListener('click', () => changeYear(filho.id, 1));

    // Adiciona event listener para o toggle de habilitar ano
    document.getElementById(`enableYearCheckbox-${filho.id}`).addEventListener('change', (e) => toggleYearEnabled(filho.id, anoAtualRender, e.target.checked));

    // Adiciona event listener para o botão de esconder meses
    document.querySelector(`#filhoBloco-${filho.id} .toggle-meses-btn`).addEventListener('click', (e) => toggleMesesVisibility(e.target));

    // Adiciona event listeners para os botões de adicionar pagamento de cada mês
    document.querySelectorAll(`#mesesGrid-${filho.id} .adicionar-pagamento`).forEach(button => {
        button.addEventListener('click', (e) => {
            const mesIndex = parseInt(e.target.dataset.mesIndex);
            const ano = parseInt(e.target.dataset.ano);
            openPagamentoModalForMonth(filho, ano, mesIndex);
        });
    });

    // Adiciona event listeners para os botões de editar e excluir pagamentos dentro dos meses
    document.querySelectorAll(`#mesesGrid-${filho.id} .edit-pagamento-btn`).forEach(button => {
        button.addEventListener('click', (e) => {
            const ano = parseInt(e.target.dataset.ano);
            const mes = parseInt(e.target.dataset.mes);
            const data = e.target.dataset.data;
            const valor = parseFloat(e.target.dataset.valor);
            openPagamentoModalForEdit(filho, ano, mes, data, valor);
        });
    });

    document.querySelectorAll(`#mesesGrid-${filho.id} .delete-pagamento-btn-inline`).forEach(button => {
        button.addEventListener('click', (e) => {
            const ano = parseInt(e.target.dataset.ano);
            const mes = parseInt(e.target.dataset.mes);
            const data = e.target.dataset.data;
            const valor = parseFloat(e.target.dataset.valor);
            handleDeletePagamentoInline(filho, ano, mes, data, valor);
        });
    });

}

function renderMesesDoAno(filho, ano) {
    const mesesNomes = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    let htmlMeses = '';
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();

    for (let i = 0; i < 12; i++) {
        const pagamentosMes = (filho.pagamentos[ano] && filho.pagamentos[ano][i]) ? filho.pagamentos[ano][i] : [];
        const valorMensalDevido = parseFloat(filho.valorMensal || 0);
        const totalPagoNoMes = pagamentosMes.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0);

        let statusClass = 'nao-pago';
        let statusTextClass = 'nao-pago';

        if (totalPagoNoMes >= valorMensalDevido) {
            statusClass = 'pago-completo';
            statusTextClass = 'pago-completo';
        } else if (totalPagoNoMes > 0 && totalPagoNoMes < valorMensalDevido) {
            statusClass = 'pago-parcial';
            statusTextClass = 'pago-parcial';
        }

        // Se o mês for futuro ou o ano for futuro, não aplica status de "não pago"
        if (ano > anoAtual || (ano === anoAtual && i > mesAtual)) {
            statusClass = ''; // Sem status, estilo neutro
            statusTextClass = '';
        }


        htmlMeses += `
            <div class="mes-box ${statusClass}">
                <div class="mes-nome ${statusTextClass}">${mesesNomes[i]} ${ano}</div>
                <div class="pagamentos-lista">
                    ${pagamentosMes.length > 0 ? pagamentosMes.map(p => `
                        <div class="pagamento-item">
                            <span>R$ ${parseFloat(p.valor).toFixed(2)} - ${new Date(p.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            <div>
                                <button class="edit-pagamento-btn"
                                    data-filho-id="${filho.id}"
                                    data-ano="${ano}"
                                    data-mes="${i}"
                                    data-valor="${p.valor}"
                                    data-data="${p.data}">
                                    <i class="fas fa-pencil-alt"></i>
                                </button>
                                <button class="delete-pagamento-btn-inline"
                                    data-filho-id="${filho.id}"
                                    data-ano="${ano}"
                                    data-mes="${i}"
                                    data-valor="${p.valor}"
                                    data-data="${p.data}">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    `).join('') : '<p>Nenhum pagamento</p>'}
                </div>
                <button class="adicionar-pagamento" data-mes-index="${i}" data-ano="${ano}">Adicionar Pagamento</button>
            </div>
        `;
    }
    return htmlMeses;
}

function calcularIdade(dataNascimentoStr) {
    const [ano, mes, dia] = dataNascimentoStr.split('-').map(Number);
    const dataNascimento = new Date(ano, mes - 1, dia); // Mês é 0-indexado
    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNascimento.getFullYear();
    const m = hoje.getMonth() - dataNascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < dataNascimento.getDate())) {
        idade--;
    }
    return idade;
}

function changeYear(filhoId, direction) {
    const filho = filhos.find(f => f.id === filhoId);
    if (!filho) return;

    currentYear += direction;
    document.getElementById(`currentYear-${filho.id}`).textContent = `Ano: ${currentYear}`;

    // Atualiza o checkbox de habilitar ano ao mudar o ano
    const enableCheckbox = document.getElementById(`enableYearCheckbox-${filho.id}`);
    if (enableCheckbox) {
        enableCheckbox.checked = filho.anosCalculoHabilitados.includes(currentYear);
    }

    const mesesGrid = document.getElementById(`mesesGrid-${filho.id}`);
    if (mesesGrid) {
        mesesGrid.innerHTML = renderMesesDoAno(filho, currentYear);
        // Re-adicionar event listeners para os novos botões nos meses renderizados
        addEventListenersToMonthButtons(filho, mesesGrid);
    }

    // Atualiza o texto do botão de esconder/mostrar meses
    const toggleBtn = document.querySelector(`#filhoBloco-${filho.id} .toggle-meses-btn`);
    if (toggleBtn) {
        toggleBtn.textContent = mesesGrid.classList.contains('hidden') ? `Mostrar Meses (${currentYear})` : `Esconder Meses (${currentYear})`;
    }

    // Recalcular montante devido para o filho ativo se necessário, pois a habilitação de anos pode mudar
    // e o montante deve refletir todos os anos habilitados, não apenas o ano atual.
    const { totalDevido, status } = calcularMontanteDevido(filho);
    const montanteDevidoElement = document.querySelector(`#filhoBloco-${filho.id} .montante-devedor`);
    if (montanteDevidoElement) {
        montanteDevidoElement.textContent = `Montante Devedor: R$ ${totalDevido.toFixed(2)}`;
        montanteDevidoElement.className = `montante-devedor ${status}`; // Atualiza a classe de status
    }
}

function addEventListenersToMonthButtons(filho, container) {
    container.querySelectorAll(".adicionar-pagamento").forEach(button => {
        button.addEventListener("click", (e) => {
            const mesIndex = parseInt(e.target.dataset.mesIndex);
            const ano = parseInt(e.target.dataset.ano);
            openPagamentoModalForMonth(filho, ano, mesIndex);
        });
    });

    container.querySelectorAll(".edit-pagamento-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const ano = parseInt(e.target.dataset.ano);
            const mes = parseInt(e.target.dataset.mes);
            const data = e.target.dataset.data;
            const valor = parseFloat(e.target.dataset.valor);
            openPagamentoModalForEdit(filho, ano, mes, data, valor);
        });
    });

    container.querySelectorAll(".delete-pagamento-btn-inline").forEach(button => {
        button.addEventListener("click", (e) => {
            const ano = parseInt(e.target.dataset.ano);
            const mes = parseInt(e.target.dataset.mes);
            const data = e.target.dataset.data;
            const valor = parseFloat(e.target.dataset.valor);
            handleDeletePagamentoInline(filho, ano, mes, data, valor);
        });
    });
}


async function toggleYearEnabled(filhoId, ano, isChecked) {
    const filho = filhos.find(f => f.id === filhoId);
    if (!filho) return;

    if (isChecked) {
        if (!filho.anosCalculoHabilitados.includes(ano)) {
            filho.anosCalculoHabilitados.push(ano);
        }
    } else {
        filho.anosCalculoHabilitados = filho.anosCalculoHabilitados.filter(y => y !== ano);
    }
    // Garante que o array esteja ordenado para consistência
    filho.anosCalculoHabilitados.sort((a, b) => a - b);

    const success = await salvarFilhoNoFirestore(filho);
    if (success) {
        // Recalcular e renderizar o montante devedor após a mudança
        const { totalDevido, status } = calcularMontanteDevido(filho);
        const montanteDevidoElement = document.querySelector(`#filhoBloco-${filho.id} .montante-devedor`);
        if (montanteDevidoElement) {
            montanteDevidoElement.textContent = `Montante Devedor: R$ ${totalDevido.toFixed(2)}`;
            montanteDevidoElement.className = `montante-devedor ${status}`; // Atualiza a classe de status
        }
    } else {
        // Reverter o estado do checkbox se o salvamento falhar
        const checkbox = document.getElementById(`enableYearCheckbox-${filho.id}`);
        if (checkbox) checkbox.checked = !isChecked;
    }
}


function toggleMesesVisibility(button) {
    const mesesGrid = button.previousElementSibling; // Pega o div 'meses-grid' que está antes do botão
    if (mesesGrid) {
        mesesGrid.classList.toggle('hidden');
        if (mesesGrid.classList.contains('hidden')) {
            button.textContent = `Mostrar Meses (${currentYear})`;
        } else {
            button.textContent = `Esconder Meses (${currentYear})`;
        }
    }
}


// --- Funções de Manipulação de Modal de Pagamento ---

function openPagamentoModalForMonth(filho, ano, mesIndex) {
    // Resetar o estado de edição
    editingPayment = null;
    if (pagamentoForm) {
        const submitButton = pagamentoForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.textContent = 'Salvar Pagamento';
    }

    if (!pagamentoModal || !pagamentoForm || !modalValorInput || !modalDataInput || !pagamentoFilhoIdInput) {
        console.error("Um ou mais elementos do modal de pagamento não foram encontrados. Verifique o HTML.");
        return;
    }

    currentPayingFilhoId = filho.id;
    pagamentoFilhoIdInput.value = filho.id;

    modalValorInput.value = filho.valorMensal;

    // Preenche a data com o último dia do mês selecionado
    const dataObj = new Date(ano, mesIndex + 1, 0); // Último dia do mês
    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const anoStr = dataObj.getFullYear();
    modalDataInput.value = `${dia}/${mes}/${anoStr}`;

    renderPagamentosListInModal(filho, ano, mesIndex);
    pagamentoModal.style.display = "block";
}

function openPagamentoModalForEdit(filho, ano, mesIndex, dataStr, valor) {
    // Define o pagamento que está sendo editado
    editingPayment = { filhoId: filho.id, ano, mesIndex, data: dataStr, valor };

    if (pagamentoForm) {
        const submitButton = pagamentoForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.textContent = 'Atualizar Pagamento';
    }

    if (!pagamentoModal || !pagamentoForm || !modalValorInput || !modalDataInput || !pagamentoFilhoIdInput) {
        console.error("Um ou mais elementos do modal de pagamento para edição não foram encontrados. Verifique o HTML.");
        return;
    }

    currentPayingFilhoId = filho.id;
    pagamentoFilhoIdInput.value = filho.id;

    modalValorInput.value = valor;
    // Converte a data do formato YYYY-MM-DD para DD/MM/YYYY para exibir no input
    const parts = dataStr.split('-');
    modalDataInput.value = `${parts[2]}/${parts[1]}/${parts[0]}`;

    renderPagamentosListInModal(filho, ano, mesIndex); // Renderiza apenas os pagamentos do mês específico
    pagamentoModal.style.display = "block";
}


function closePagamentoModal() {
    if (pagamentoModal) {
        pagamentoModal.style.display = "none";
        editingPayment = null; // Reseta o estado de edição ao fechar
        if (pagamentoForm) {
            const submitButton = pagamentoForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.textContent = 'Salvar Pagamento';
            pagamentoForm.reset(); // Limpa o formulário
        }
    }
}

async function handlePagamentoFormSubmit(e) {
    e.preventDefault();

    const filhoId = pagamentoFilhoIdInput.value;
    const valor = parseFloat(modalValorInput.value);
    const dataString = modalDataInput.value; // Formato 'DD/MM/AAAA'

    const dataParts = dataString.split('/');
    if (dataParts.length !== 3 || isNaN(parseInt(dataParts[0])) || isNaN(parseInt(dataParts[1])) || isNaN(parseInt(dataParts[2]))) {
        alert("Formato de data inválido. Use DD/MM/AAAA.");
        return;
    }
    const dataFormattedForFirestore = `${dataParts[2]}-${dataParts[1]}-${dataParts[0]}`; // YYYY-MM-DD

    const dataObj = new Date(dataFormattedForFirestore + 'T00:00:00');
    if (isNaN(dataObj.getTime())) {
        alert("Data inválida. Por favor, insira uma data real (DD/MM/AAAA).");
        return;
    }

    const anoPagamento = dataObj.getFullYear();
    const mesPagamento = dataObj.getMonth(); // 0-indexed

    const filhoIndex = filhos.findIndex(f => f.id === filhoId);
    if (filhoIndex === -1) {
        alert("Filho não encontrado para registrar pagamento.");
        return;
    }

    const filho = filhos[filhoIndex];

    // Se estiver editando um pagamento
    if (editingPayment) {
        const { ano: oldAno, mesIndex: oldMes, data: oldData, valor: oldValor } = editingPayment;

        // Remove o pagamento antigo da lista (garante que não haja duplicatas ou pagamentos errados)
        if (filho.pagamentos && filho.pagamentos[oldAno] && Array.isArray(filho.pagamentos[oldAno][oldMes])) {
            const oldPagamentosMes = filho.pagamentos[oldAno][oldMes];
            const oldPaymentIndex = oldPagamentosMes.findIndex(p => p.valor === oldValor && p.data === oldData);
            if (oldPaymentIndex > -1) {
                oldPagamentosMes.splice(oldPaymentIndex, 1);
            }
        }
    }

    // Garante que a estrutura de pagamentos para o ano e mês exista
    if (!filho.pagamentos[anoPagamento]) {
        filho.pagamentos[anoPagamento] = Array(12).fill().map(() => []);
    }
    if (!Array.isArray(filho.pagamentos[anoPagamento][mesPagamento])) {
        filho.pagamentos[anoPagamento][mesPagamento] = [];
    }

    filho.pagamentos[anoPagamento][mesPagamento].push({ valor: valor, data: dataFormattedForFirestore });

    const success = await salvarFilhoNoFirestore(filho);
    if (success) {
        await carregarFilhos(); // Recarrega tudo para garantir que a UI esteja atualizada
        // Fecha o modal e reseta o estado de edição
        closePagamentoModal();
    }
}

function renderPagamentosListInModal(filho, targetAno = null, targetMesIndex = null) {
    if (!pagamentosListContainer) {
        console.error("Elemento 'pagamentos-list-container' não encontrado no DOM.");
        return;
    }

    pagamentosListContainer.innerHTML = '';
    const pagamentosDoFilho = filho.pagamentos || {};

    let hasPagamentosForTarget = false;
    const pagamentosExibidos = [];

    // Se targetAno e targetMesIndex são fornecidos, mostra apenas os pagamentos para aquele mês
    if (targetAno !== null && targetMesIndex !== null) {
        const pagamentosMes = (pagamentosDoFilho[targetAno] && pagamentosDoFilho[targetAno][targetMesIndex]) ? pagamentosDoFilho[targetAno][targetMesIndex] : [];
        if (pagamentosMes.length > 0) {
            pagamentosExibidos.push({
                ano: targetAno,
                mesIndex: targetMesIndex,
                pagamentos: [...pagamentosMes] // Copia para não modificar o original ao ordenar
            });
            hasPagamentosForTarget = true;
        }
    } else {
        // Caso contrário, mostra todos os pagamentos (como antes)
        Object.keys(pagamentosDoFilho).sort((a, b) => b - a).forEach(ano => {
            const pagamentosAno = pagamentosDoFilho[ano];
            if (pagamentosAno && Array.isArray(pagamentosAno)) {
                for (let mesIndex = 11; mesIndex >= 0; mesIndex--) {
                    const pagamentosMes = pagamentosAno[mesIndex];
                    if (pagamentosMes && Array.isArray(pagamentosMes) && pagamentosMes.length > 0) {
                        pagamentosExibidos.push({
                            ano: parseInt(ano),
                            mesIndex: mesIndex,
                            pagamentos: [...pagamentosMes]
                        });
                        hasPagamentosForTarget = true;
                    }
                }
            }
        });
        // Ordena os grupos de pagamento por ano e mês para exibição consistente
        pagamentosExibidos.sort((a, b) => {
            if (b.ano !== a.ano) return b.ano - a.ano;
            return b.mesIndex - a.mesIndex;
        });
    }

    if (!hasPagamentosForTarget) {
        pagamentosListContainer.innerHTML = '<p>Nenhum pagamento registrado para este mês (ou filho).</p>';
    } else {
        pagamentosExibidos.forEach(({ ano, mesIndex, pagamentos }) => {
            const mesNome = new Date(ano, mesIndex).toLocaleString('pt-BR', { month: 'long' });
            const mesDiv = document.createElement("div");
            mesDiv.classList.add("pagamento-mes-group");
            mesDiv.innerHTML = `<h4>${mesNome}/${ano}</h4>`;

            pagamentos.sort((a, b) => new Date(b.data + 'T00:00:00') - new Date(a.data + 'T00:00:00'));

            pagamentos.forEach(pagamento => {
                const dataExibicao = new Date(pagamento.data + 'T00:00:00').toLocaleDateString('pt-BR');
                const pagamentoItem = document.createElement("div");
                pagamentoItem.classList.add("pagamento-item");
                pagamentoItem.innerHTML = `
                    <span>R$ ${parseFloat(pagamento.valor).toFixed(2)} - ${dataExibicao}</span>
                    <div>
                        <button class="edit-pagamento-btn-modal"
                            data-filho-id="${filho.id}"
                            data-ano="${ano}"
                            data-mes="${mesIndex}"
                            data-valor="${pagamento.valor}"
                            data-data="${pagamento.data}">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="delete-pagamento-btn-modal"
                            data-filho-id="${filho.id}"
                            data-ano="${ano}"
                            data-mes="${mesIndex}"
                            data-valor="${pagamento.valor}"
                            data-data="${pagamento.data}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                mesDiv.appendChild(pagamentoItem);
            });
            pagamentosListContainer.appendChild(mesDiv);
        });

        // Adiciona event listeners para os botões de edição/exclusão no modal
        pagamentosListContainer.querySelectorAll(".edit-pagamento-btn-modal").forEach(button => {
            button.addEventListener("click", (e) => {
                const ano = parseInt(e.target.dataset.ano);
                const mes = parseInt(e.target.dataset.mes);
                const data = e.target.dataset.data;
                const valor = parseFloat(e.target.dataset.valor);
                openPagamentoModalForEdit(filho, ano, mes, data, valor);
            });
        });

        pagamentosListContainer.querySelectorAll(".delete-pagamento-btn-modal").forEach(button => {
            button.addEventListener("click", handleDeletePagamentoModal);
        });
    }
}


async function handleDeletePagamentoModal(e) {
    const btn = e.target.closest('button'); // Garante que pegamos o botão mesmo clicando no ícone
    if (!btn) return;

    const filhoId = btn.dataset.filhoId;
    const ano = parseInt(btn.dataset.ano);
    const mes = parseInt(btn.dataset.mes);
    const valor = parseFloat(btn.dataset.valor);
    const data = btn.dataset.data;

    if (!confirm(`Tem certeza que deseja excluir o pagamento de R$ ${valor.toFixed(2)} em ${new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')}?`)) {
        return;
    }

    const filhoIndex = filhos.findIndex(f => f.id === filhoId);
    if (filhoIndex === -1) {
        alert("Filho não encontrado.");
        return;
    }

    const filho = filhos[filhoIndex];

    if (filho.pagamentos && filho.pagamentos[ano] && Array.isArray(filho.pagamentos[ano][mes])) {
        const pagamentosMes = filho.pagamentos[ano][mes];
        const pagamentoToRemoveIndex = pagamentosMes.findIndex(p =>
            p.valor === valor && p.data === data
        );

        if (pagamentoToRemoveIndex > -1) {
            pagamentosMes.splice(pagamentoToRemoveIndex, 1);
            const success = await salvarFilhoNoFirestore(filho);
            if (success) {
                renderPagamentosListInModal(filho, ano, mes); // Atualiza a lista no modal para o mês específico
                await carregarFilhos(); // Recarrega tudo para atualizar o status e montante do filho
            }
        } else {
            console.warn("Pagamento não encontrado para exclusão no modal (valor/data não correspondem).");
        }
    }
}

async function handleDeletePagamentoInline(filho, ano, mes, data, valor) {
    if (!confirm(`Tem certeza que deseja excluir o pagamento de R$ ${valor.toFixed(2)} em ${new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')}?`)) {
        return;
    }

    if (filho.pagamentos && filho.pagamentos[ano] && Array.isArray(filho.pagamentos[ano][mes])) {
        const pagamentosMes = filho.pagamentos[ano][mes];
        const pagamentoToRemoveIndex = pagamentosMes.findIndex(p =>
            p.valor === valor && p.data === data
        );

        if (pagamentoToRemoveIndex > -1) {
            pagamentosMes.splice(pagamentoToRemoveIndex, 1);
            const success = await salvarFilhoNoFirestore(filho);
            if (success) {
                // Ao excluir inline, basta renderizar o conteúdo do filho ativo novamente para atualizar tudo
                renderFilhoContent(filho.id);
            }
        } else {
            console.warn("Pagamento não encontrado para exclusão inline (valor/data não correspondem).");
        }
    }
}
