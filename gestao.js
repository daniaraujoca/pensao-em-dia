// gestao.js
import { auth, db } from "./common.js";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let filhos = []; // Armazenará os dados dos filhos carregados

// Elementos do DOM (AJUSTADOS AOS SEUS IDs NO gestao.html)
const filhosContentElement = document.getElementById("filhosContent"); // Onde a lista de filhos será renderizada
const pagamentoModal = document.getElementById("pagamentoModal");
const closePagamentoModalBtn = document.getElementById("closePagamentoModalBtn"); // ID ADICIONADO NO HTML
const pagamentoForm = document.getElementById("pagamentoForm");
const pagamentoFilhoIdInput = document.getElementById("pagamentoFilhoIdInput"); // ID ADICIONADO NO HTML (hidden)
const modalValorInput = document.getElementById("modalValor"); // Seu ID original
const modalDataInput = document.getElementById("modalData");     // Seu ID original
const pagamentosListContainer = document.getElementById("pagamentos-list-container"); // ID ADICIONADO NO HTML

let currentPayingFilhoId = null; // Para saber qual filho está sendo pago

document.addEventListener("DOMContentLoaded", async () => {
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
        renderFilhosList();
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

/**
 * Salva ou atualiza os dados de um filho no Firestore.
 * Principalmente para atualizar pagamentos.
 */
async function salvarFilhoNoFirestore(filho) {
    if (!auth.currentUser) {
        console.error("Usuário não autenticado. Não é possível salvar dados.");
        alert("Sua sessão expirou ou você não está logado. Por favor, faça login novamente.");
        window.location.href = "index.html";
        return false;
    }
    const userId = auth.currentUser.uid;
    const filhoDocRef = doc(db, "users", userId, "filhos", filho.id);

    const pagamentosParaSalvar = {};
    for (const ano in filho.pagamentos) {
        if (filho.pagamentos.hasOwnProperty(ano) && Array.isArray(filho.pagamentos[ano])) {
            pagamentosParaSalvar[ano] = filho.pagamentos[ano].flat(); // Achata para salvar no Firestore
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
    let status = "verde"; 
    
    // Se anosCalculoHabilitados não estiver definido ou for vazio, calculamos apenas o ano atual.
    const anosParaCalcular = filho.anosCalculoHabilitados && filho.anosCalculoHabilitados.length > 0 
                             ? filho.anosCalculoHabilitados 
                             : [anoAtual];

    for (const ano of anosParaCalcular) {
        if (ano > anoAtual) continue; 

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
    if (!filhosContentElement) {
        console.error("Elemento 'filhosContent' não encontrado no DOM.");
        return;
    }

    filhosContentElement.innerHTML = ''; 
    if (filhos.length === 0) {
        filhosContentElement.innerHTML = '<p>Nenhum filho cadastrado ainda. Cadastre um filho na aba "Cadastro de Filhos".</p>';
        return;
    }

    filhos.forEach(filho => {
        const { totalDevido, status } = calcularMontanteDevido(filho);
        const filhoItem = document.createElement("div");
        filhoItem.classList.add("filho-item", status); // Para aplicar estilo de status (verde, amarelo, vermelho)

        filhoItem.innerHTML = `
            <h3>${filho.nome}</h3>
            <p>Nascimento: ${filho.dataNascimento}</p>
            <p>Pensão Mensal: R$ ${parseFloat(filho.valorMensal).toFixed(2)}</p>
            <p>Vencimento: Dia ${filho.diaVencimento}</p>
            <p>Total Devido: R$ ${totalDevido.toFixed(2)}</p>
            <div class="filho-actions">
                <button class="pagar-btn" data-id="${filho.id}">Registrar Pagamento</button>
                <button class="delete-btn" data-id="${filho.id}">Excluir</button>
            </div>
        `;
        filhosContentElement.appendChild(filhoItem);

        filhoItem.querySelector(".pagar-btn").addEventListener("click", () => openPagamentoModal(filho));
        filhoItem.querySelector(".delete-btn").addEventListener("click", () => deletarFilho(filho.id, filho.nome));
    });
}

async function deletarFilho(id, nome) {
    if (confirm(`Tem certeza que deseja excluir os dados de ${nome}? Esta ação é irreversível.`)) {
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
    if (!pagamentoModal || !pagamentoForm || !modalValorInput || !modalDataInput || !pagamentoFilhoIdInput) {
        console.error("Um ou mais elementos do modal de pagamento não foram encontrados. Verifique o HTML.");
        return;
    }

    currentPayingFilhoId = filho.id; // Define o ID do filho atual no modal
    pagamentoFilhoIdInput.value = filho.id; // Preenche o input hidden

    modalValorInput.value = filho.valorMensal; // Sugere o valor da pensão
    
    // Define a data atual no formato DD/MM/AAAA
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0'); 
    const ano = hoje.getFullYear();
    modalDataInput.value = `${dia}/${mes}/${ano}`;

    renderPagamentosListInModal(filho); // Renderiza a lista de pagamentos existentes no modal
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
    const valor = parseFloat(modalValorInput.value);
    const dataString = modalDataInput.value; // Formato 'DD/MM/AAAA'

    const dataParts = dataString.split('/');
    if (dataParts.length !== 3 || isNaN(parseInt(dataParts[0])) || isNaN(parseInt(dataParts[1])) || isNaN(parseInt(dataParts[2]))) {
        alert("Formato de data inválido. Use DD/MM/AAAA.");
        return;
    }
    const dataFormattedForFirestore = `${dataParts[2]}-${dataParts[1]}-${dataParts[0]}`; // YYYY-MM-DD

    const dataObj = new Date(dataFormattedForFirestore + 'T00:00:00'); // Cria objeto Date para obter ano/mês
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
        renderPagamentosListInModal(filho); // Atualiza a lista no modal
        renderFilhosList(); // Atualiza a lista principal para refletir o status
        // Limpa o formulário de pagamento (opcional)
        modalValorInput.value = filho.valorMensal; 
        modalDataInput.value = `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
    }
}

function renderPagamentosListInModal(filho) {
    if (!pagamentosListContainer) {
        console.error("Elemento 'pagamentos-list-container' não encontrado no DOM.");
        return;
    }

    pagamentosListContainer.innerHTML = '';
    const pagamentosDoFilho = filho.pagamentos || {};

    let hasPagamentos = false;

    // Itera pelos anos (mais recente primeiro)
    Object.keys(pagamentosDoFilho).sort((a, b) => b - a).forEach(ano => {
        const pagamentosAno = pagamentosDoFilho[ano];
        if (pagamentosAno && Array.isArray(pagamentosAno)) {
            // Itera pelos meses (mais recente primeiro)
            for (let mesIndex = 11; mesIndex >= 0; mesIndex--) {
                const pagamentosMes = pagamentosAno[mesIndex];
                if (pagamentosMes && Array.isArray(pagamentosMes) && pagamentosMes.length > 0) {
                    hasPagamentos = true;
                    const mesNome = new Date(ano, mesIndex).toLocaleString('pt-BR', { month: 'long' });
                    const mesDiv = document.createElement("div");
                    mesDiv.classList.add("pagamento-mes-group");
                    mesDiv.innerHTML = `<h4>${mesNome}/${ano}</h4>`;

                    // Ordena os pagamentos dentro do mês por data (mais recente primeiro)
                    pagamentosMes.sort((a, b) => new Date(b.data + 'T00:00:00') - new Date(a.data + 'T00:00:00'));

                    pagamentosMes.forEach(pagamento => {
                        const dataExibicao = new Date(pagamento.data + 'T00:00:00').toLocaleDateString('pt-BR');
                        const pagamentoItem = document.createElement("div");
                        pagamentoItem.classList.add("pagamento-item");
                        pagamentoItem.innerHTML = `
                            <span>R$ ${parseFloat(pagamento.valor).toFixed(2)} - ${dataExibicao}</span>
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
            }
        }
    });

    if (!hasPagamentos) {
        pagamentosListContainer.innerHTML = '<p>Nenhum pagamento registrado para este filho.</p>';
    }

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
        const pagamentoToRemoveIndex = filho.pagamentos[ano][mes].findIndex(p =>
            p.valor === valor && p.data === data 
        );

        if (pagamentoToRemoveIndex > -1) {
            filho.pagamentos[ano][mes].splice(pagamentoToRemoveIndex, 1);
            const success = await salvarFilhoNoFirestore(filho); 
            if (success) {
                renderPagamentosListInModal(filho); 
                await carregarFilhos(); 
            }
        } else {
            console.warn("Pagamento não encontrado para exclusão (valor/data não correspondem).");
        }
    }
}
