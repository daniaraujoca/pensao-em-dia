import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async function () {
    // Acessa window.auth e window.db que são definidos no HTML
    const auth = window.auth;
    const db = window.db;

    // Elementos do seu HTML (usando IDs que já existiam ou inferindo pela estrutura)
    const filhoTabsContainer = document.getElementById("filhoTabs");
    const filhosContentContainer = document.getElementById("filhosContent"); // Agora usaremos este como o container do conteúdo

    // Modal de Pagamento (os IDs do modal que você já tem)
    const pagamentoModal = document.getElementById("pagamentoModal");
    const closeButton = pagamentoModal ? pagamentoModal.querySelector(".close-button") : null;
    const pagamentoForm = document.getElementById("pagamentoForm");
    const modalValor = document.getElementById("modalValor");
    const modalData = document.getElementById("modalData");

    let currentFilhoId = null; // Para saber qual filho está sendo exibido/pago
    let activeFilhoData = null; // Armazena os dados do filho ativo
    let currentDisplayYear = new Date().getFullYear(); // Ano exibido atualmente (será 2025 atualmente)

    // Redireciona se não estiver logado e inicia o carregamento dos filhos
    onAuthStateChanged(auth, user => {
        if (!user) {
            window.location.href = "./index.html";
        } else {
            loadFilhos(user.uid);
        }
    });

    // Event Listeners do Modal de Pagamento
    if (closeButton) {
        closeButton.addEventListener("click", () => {
            pagamentoModal.style.display = "none";
        });
    }
    if (pagamentoModal) {
        window.addEventListener("click", (event) => {
            if (event.target == pagamentoModal) {
                pagamentoModal.style.display = "none";
            }
        });
    }

    // Função para carregar filhos do Firestore e criar as abas
    async function loadFilhos(userId) {
        filhoTabsContainer.innerHTML = ""; // Limpa as abas
        filhosContentContainer.innerHTML = ""; // Limpa o conteúdo principal
        try {
            const q = query(collection(db, "filhos"), where("userId", "==", userId));
            const querySnapshot = await getDocs(q);
            const filhos = [];
            querySnapshot.forEach((documento) => {
                filhos.push({ id: documento.id, ...documento.data() });
            });

            if (filhos.length === 0) {
                filhosContentContainer.innerHTML = "<p class='sem-filhos-gestao'>Nenhum filho cadastrado. <a href='./cadastrofilho.html'>Cadastre um filho</a> para começar a gestão.</p>";
                return;
            }

            filhos.forEach((filho, index) => {
                const tab = document.createElement("button");
                tab.classList.add("tab-button"); // CORRIGIDO: Agora usa a classe do CSS
                tab.textContent = filho.nome;
                tab.setAttribute('data-filho-id', filho.id);
                tab.addEventListener("click", () => showFilhoDetails(filho.id, filhos));
                filhoTabsContainer.appendChild(tab);

                if (index === 0) {
                    tab.click(); // Ativa a primeira aba por padrão
                }
            });

        } catch (error) {
            console.error("Erro ao carregar filhos:", error);
            filhosContentContainer.innerHTML = "<p>Erro ao carregar os dados dos filhos. Tente novamente mais tarde.</p>";
        }
    }

    // Função para exibir detalhes de um filho
    async function showFilhoDetails(filhoId, allFilhos) {
        filhoTabsContainer.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
        document.querySelector(`.tab-button[data-filho-id="${filhoId}"]`).classList.add("active");

        activeFilhoData = allFilhos.find(f => f.id === filhoId);
        if (!activeFilhoData) {
            filhosContentContainer.innerHTML = "<p>Detalhes do filho não encontrados.</p>";
            return;
        }

        currentFilhoId = filhoId;

        // CORRIGIDO: Usa a classe 'filho-bloco' e 'meses-grid' do CSS
        filhosContentContainer.innerHTML = `
            <div class="filho-bloco"> 
                <h3>Filho(a): <span class="filho-nome-header">${activeFilhoData.nome}</span></h3>
                <p><span class="filho-data-nascimento">Data de Nascimento: ${formatarData(activeFilhoData.dataNascimento)}</span></p>
                <p><span class="filho-valor-mensal">Valor Mensal: R$ ${activeFilhoData.valorMensal.toFixed(2)}</span></p>
                <p><span class="filho-idade">Idade: ${calcularIdade(activeFilhoData.dataNascimento)} anos</span></p>
                
                <p><span class="total-devido-display">Total Devido: R$ 0.00</span></p>
                <p><span class="total-pago-display">Total Pago: R$ 0.00</span></p>
                
                <div class="montante-devedor montante-devedor-box">Montante Devedor: R$ 0.00</div>

                <button class="action-btn register-payment-btn">Registrar Pagamento</button>
                <button class="action-btn delete-btn delete-filho-btn">Excluir Filho</button>
            </div>

            <div class="year-navigation">
                <button class="nav-btn prev-year-btn">&lt; Anterior</button>
                <span class="current-year">Ano: ${currentDisplayYear}</span>
                <button class="nav-btn next-year-btn">Próximo &gt;</button>
            </div>

            <div class="year-enable-toggle"> <label for="enable-year-checkbox">
                    <input type="checkbox" class="enable-year-checkbox" id="enable-year-checkbox">
                    Habilitar <span class="enable-year-text">${currentDisplayYear}</span> para cálculo de dívida de <span class="enable-filho-name-for-checkbox">${activeFilhoData.nome}</span>
                </label>
                <small>Apenas anos habilitados são considerados no montante devedor.</small>
            </div>

            <h3>Histórico de Pagamentos</h3>
            <button class="action-btn toggle-meses-btn">Esconder Meses (${currentDisplayYear})</button> <div class="meses-grid"> </div>
        `;
        
        addEventListenersToDynamicContent();
        displayMonthsForYear(activeFilhoData, currentDisplayYear);
    }

    // Função para adicionar listeners aos elementos que foram criados dinamicamente
    function addEventListenersToDynamicContent() {
        const registerPaymentBtn = filhosContentContainer.querySelector(".register-payment-btn");
        const deleteFilhoBtn = filhosContentContainer.querySelector(".delete-filho-btn");
        const prevYearBtn = filhosContentContainer.querySelector(".prev-year-btn");
        const nextYearBtn = filhosContentContainer.querySelector(".next-year-btn");
        const enableYearCheckbox = filhosContentContainer.querySelector(".enable-year-checkbox"); // CORRIGIDO: ID correto
        const toggleMesesBtn = filhosContentContainer.querySelector(".toggle-meses-btn"); // CORRIGIDO: Classe correta do CSS


        if (registerPaymentBtn) {
            registerPaymentBtn.addEventListener("click", () => {
                if (pagamentoModal) {
                    pagamentoModal.style.display = "block";
                    modalValor.value = '';
                    modalData.value = '';
                }
            });
        }
        if (deleteFilhoBtn) {
            deleteFilhoBtn.addEventListener("click", () => {
                if (confirm(`Tem certeza que deseja excluir ${activeFilhoData.nome} e todos os seus pagamentos? Esta ação é irreversível.`)) {
                    deleteFilho(activeFilhoData.id);
                }
            });
        }
        if (prevYearBtn) {
            prevYearBtn.addEventListener('click', () => {
                currentDisplayYear--;
                // Recarrega os detalhes para atualizar o ano. Passamos activeFilhoData dentro de um array
                // porque showFilhoDetails espera um array de filhos como segundo argumento.
                // Isso é um ajuste para o fluxo da função.
                showFilhoDetails(currentFilhoId, [activeFilhoData]); 
            });
        }
        if (nextYearBtn) {
            nextYearBtn.addEventListener('click', () => { // CORRIGIDO: Event listener para nextYearBtn
                currentDisplayYear++; // CORRIGIDO: Incrementa o ano
                showFilhoDetails(currentFilhoId, [activeFilhoData]);
            });
        }
        if (enableYearCheckbox) {
            enableYearCheckbox.addEventListener('change', () => {
                calcularEExibirSaldo(activeFilhoData, currentDisplayYear);
            });
        }
        if (toggleMesesBtn) { // CORRIGIDO: Usando o botão e classe corretos
            const mesesGridCurrentContainer = filhosContentContainer.querySelector(".meses-grid"); // CORRIGIDO: Referencia a classe correta
            if (mesesGridCurrentContainer) {
                toggleMesesBtn.addEventListener('click', () => {
                    mesesGridCurrentContainer.classList.toggle('hidden');
                    toggleMesesBtn.textContent = mesesGridCurrentContainer.classList.contains('hidden') ? 
                        `Mostrar Meses (${currentDisplayYear})` : `Esconder Meses (${currentDisplayYear})`;
                });
            }
        }
    }


    // Função para calcular a idade do filho
    function calcularIdade(dataNascimento) {
        const [ano, mes, dia] = dataNascimento.split('-').map(Number);
        const dataNasc = new Date(ano, mes - 1, dia);
        const hoje = new Date();
        let idade = hoje.getFullYear() - dataNasc.getFullYear();
        const m = hoje.getMonth() - dataNasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
            idade--;
        }
        return idade;
    }

    // Função para calcular e exibir o saldo devedor
    function calcularEExibirSaldo(filho, ano) {
        const pagamentosNoAno = (filho.pagamentos || []).filter(p => new Date(p.data).getFullYear() === ano);
        const totalPagoAno = pagamentosNoAno.reduce((sum, p) => sum + p.valor, 0);

        let totalDevidoAno = 0;
        const enableYearCheckbox = filhosContentContainer.querySelector(".enable-year-checkbox");

        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;
        const diaAtual = hoje.getDate();


        if (!enableYearCheckbox || enableYearCheckbox.checked) {
            for (let m = 1; m <= 12; m++) {
                if (ano < anoAtual) {
                    totalDevidoAno += filho.valorMensal;
                } 
                else if (ano === anoAtual) {
                    if (m < mesAtual) {
                        totalDevidoAno += filho.valorMensal;
                    } 
                    else if (m === mesAtual && diaAtual >= filho.diaVencimento) {
                        totalDevidoAno += filho.valorMensal;
                    }
                }
            }
        }
        
        const totalDevidoDisplay = filhosContentContainer.querySelector(".total-devido-display");
        const totalPagoDisplay = filhosContentContainer.querySelector(".total-pago-display");
        const montanteDevedorDisplay = filhosContentContainer.querySelector(".montante-devedor-box");

        if (totalDevidoDisplay) totalDevidoDisplay.textContent = `Total Devido: R$ ${totalDevidoAno.toFixed(2
