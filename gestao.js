import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async function () {
    // Acessa window.auth e window.db que são definidos no HTML
    const auth = window.auth;
    const db = window.db;

    // Elementos do seu HTML (usando IDs que já existiam ou inferindo pela estrutura)
    const filhoTabsContainer = document.getElementById("filhoTabs");
    const filhosContentContainer = document.getElementById("filhosContent");

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
            // Usando as funções importadas diretamente
            const q = query(collection(db, "filhos"), where("userId", "==", userId));
            const querySnapshot = await getDocs(q);
            const filhos = [];
            querySnapshot.forEach((documento) => {
                filhos.push({ id: documento.id, ...documento.data() });
            });

            if (filhos.length === 0) {
                filhosContentContainer.innerHTML = "<p>Nenhum filho cadastrado. <a href='./cadastrofilho.html'>Cadastre um filho</a> para começar.</p>";
                return;
            }

            filhos.forEach((filho, index) => {
                const tab = document.createElement("button");
                tab.classList.add("filho-tab");
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
        filhoTabsContainer.querySelectorAll(".filho-tab").forEach(btn => btn.classList.remove("active"));
        document.querySelector(`.filho-tab[data-filho-id="${filhoId}"]`).classList.add("active");

        activeFilhoData = allFilhos.find(f => f.id === filhoId);
        if (!activeFilhoData) {
            filhosContentContainer.innerHTML = "<p>Detalhes do filho não encontrados.</p>";
            return;
        }

        currentFilhoId = filhoId;

        filhosContentContainer.innerHTML = `
            <div class="filho-info">
                <h3>Filho(a): <span class="filho-nome-header">${activeFilhoData.nome}</span></h3>
                <p><span class="filho-data-nascimento">Data de Nascimento: ${formatarData(activeFilhoData.dataNascimento)}</span></p>
                <p><span class="filho-valor-mensal">Valor Mensal: R$ ${activeFilhoData.valorMensal.toFixed(2)}</span></p>
                <p><span class="filho-idade">Idade: ${calcularIdade(activeFilhoData.dataNascimento)} anos</span></p>
                
                <p><span class="total-devido-display">Total Devido: R$ 0.00</span></p>
                <p><span class="total-pago-display">Total Pago: R$ 0.00</span></p>
                
                <div class="montante-devedor-box montante-devedor">Montante Devedor: R$ 0.00</div>

                <button class="action-btn register-payment-btn">Registrar Pagamento</button>
                <button class="action-btn delete-btn delete-filho-btn">Excluir Filho</button>
            </div>

            <div class="year-navigation">
                <button class="nav-btn prev-year-btn">&lt; Anterior</button>
                <span class="current-year">Ano: ${currentDisplayYear}</span>
                <button class="nav-btn next-year-btn">Próximo &gt;</button>
            </div>

            <div class="year-options">
                <input type="checkbox" class="enable-year-checkbox">
                <label for="enable-year-checkbox">Habilitar <span class="enable-year-text">${currentDisplayYear}</span> para cálculo de dívida de <span class="enable-filho-name-for-checkbox">${activeFilhoData.nome}</span></label>
                <button class="action-btn hide-months-btn">Esconder Meses (${currentDisplayYear})</button>
            </div>

            <h3>Histórico de Pagamentos</h3>
            <div class="mes-cards-grid mes-cards-container">
                </div>
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
        const enableYearCheckbox = filhosContentContainer.querySelector(".enable-year-checkbox");
        const hideMonthsBtn = filhosContentContainer.querySelector(".hide-months-btn");


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
            nextYearBtn.addEventListener('click', () => {
                currentDisplayYear++;
                showFilhoDetails(currentFilhoId, [activeFilhoData]);
            });
        }
        if (enableYearCheckbox) {
            enableYearCheckbox.addEventListener('change', () => {
                calcularEExibirSaldo(activeFilhoData, currentDisplayYear);
            });
        }
        if (hideMonthsBtn) {
            hideMonthsBtn.addEventListener('click', () => {
                const mesCardsContainer = hijosContentContainer.querySelector(".mes-cards-container");
                if (mesCardsContainer) {
                    mesCardsContainer.classList.toggle('hidden');
                    hideMonthsBtn.textContent = mesCardsContainer.classList.contains('hidden') ? 
                        `Mostrar Meses (${currentDisplayYear})` : `Esconder Meses (${currentDisplayYear})`;
                }
            });
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

        if (totalDevidoDisplay) totalDevidoDisplay.textContent = `Total Devido: R$ ${totalDevidoAno.toFixed(2)}`;
        if (totalPagoDisplay) totalPagoDisplay.textContent = `Total Pago: R$ ${totalPagoAno.toFixed(2)}`;
        
        const montanteDevedor = totalDevidoAno - totalPagoAno;
        if (montanteDevedorDisplay) {
            montanteDevedorDisplay.textContent = `Montante Devedor: R$ ${montanteDevedor.toFixed(2)}`;
            montanteDevedorDisplay.style.backgroundColor = montanteDevedor > 0 ? '#dc3545' : '#28a745'; 
            montanteDevedorDisplay.style.color = 'white';
        }
    }


    // Renderiza os cards dos meses para o ano atual
    function displayMonthsForYear(filho, ano) {
        const mesCardsContainer = filhosContentContainer.querySelector(".mes-cards-container");
        if (!mesCardsContainer) return; 

        mesCardsContainer.innerHTML = '';
        const meses = [
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];
        
        meses.forEach((nomeMes, index) => {
            const mesNumero = index + 1;
            const pagamentosDoMes = (filho.pagamentos || []).filter(p => {
                const dataPag = new Date(p.data);
                return dataPag.getFullYear() === ano && (dataPag.getMonth() + 1) === mesNumero;
            });

            let saldoMes = -filho.valorMensal; // Inicia com o valor devido do mês
            let pagamentosExibicao = '';
            if (pagamentosDoMes.length > 0) {
                pagamentosDoMes.sort((a, b) => a.timestamp - b.timestamp).forEach(p => {
                    saldoMes += p.valor;
                    pagamentosExibicao += `
                        <p>R$ ${p.valor.toFixed(2)} - ${formatarData(p.data)} 
                            <i class="fas fa-times delete-payment-month-icon" 
                                data-filho-id="${filho.id}" 
                                data-timestamp="${p.timestamp}"></i>
                        </p>`;
                });
            }
            
            const cardClass = saldoMes >= 0 ? 'mes-pago' : 'mes-devedor'; 

            const cardHTML = `
                <div class="mes-card ${cardClass}">
                    <h4>${nomeMes} ${ano}</h4>
                    <p>Valor Mensal: R$ ${filho.valorMensal.toFixed(2)}</p>
                    <p>Pagamentos:</p>
                    <div class="payments-list">${pagamentosExibicao || 'Nenhum'}</div>
                    <p>Saldo do Mês: R$ ${saldoMes.toFixed(2)}</p>
                    <button class="add-payment-month-btn" 
                            data-filho-id="${filho.id}" 
                            data-mes="${mesNumero}" 
                            data-ano="${ano}">Adicionar Pagamento</button>
                </div>
            `;
            mesCardsContainer.insertAdjacentHTML('beforeend', cardHTML);
        });

        mesCardsContainer.querySelectorAll(".add-payment-month-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                currentFilhoId = e.target.dataset.filhoId;
                const mesDoCard = e.target.dataset.mes;
                const anoDoCard = e.target.dataset.ano;
                
                const dataPreenchida = `${String(activeFilhoData.diaVencimento).padStart(2, '0')}/${String(mesDoCard).padStart(2, '0')}/${anoDoCard}`;
                modalData.value = dataPreenchida;

                if (pagamentoModal) {
                    pagamentoModal.style.display = "block";
                    modalValor.value = '';
                }
            });
        });

        mesCardsContainer.querySelectorAll(".delete-payment-month-icon").forEach(icon => {
            icon.addEventListener("click", (e) => {
                const idFilho = e.target.dataset.filhoId;
                const timestampPagamento = parseInt(e.target.dataset.timestamp);
                if (confirm("Tem certeza que deseja excluir este pagamento?")) {
                    deletePagamento(idFilho, timestampPagamento);
                }
            });
        });

        const currentYearSpan = filhosContentContainer.querySelector(".current-year");
        const enableYearText = filhosContentContainer.querySelector(".enable-year-text");
        const enableFilhoNameForCheckbox = filhosContentContainer.querySelector(".enable-filho-name-for-checkbox");
        const hideMonthsBtn = filhosContentContainer.querySelector(".hide-months-btn");

        if (currentYearSpan) currentYearSpan.textContent = `Ano: ${currentDisplayYear}`;
        if (enableYearText) enableYearText.textContent = currentDisplayYear;
        if (enableFilhoNameForCheckbox) enableFilhoNameForCheckbox.textContent = filho.nome;
        if (hideMonthsBtn) {
            const mesCardsCurrentContainer = filhosContentContainer.querySelector(".mes-cards-container");
            hideMonthsBtn.textContent = mesCardsCurrentContainer.classList.contains('hidden') ? 
                `Mostrar Meses (${currentDisplayYear})` : `Esconder Meses (${currentDisplayYear})`;
        }


        calcularEExibirSaldo(filho, ano);
    }

    // Adicionar novo pagamento
    if (pagamentoForm) {
        pagamentoForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const valor = parseFloat(modalValor.value);
            const dataStr = modalData.value;

            const regexData = /^\d{2}\/\d{2}\/\d{4}$/;
            if (!regexData.test(dataStr)) {
                alert("Formato de data inválido. Use DD/MM/AAAA.");
                return;
            }

            const [dia, mes, ano] = dataStr.split('/').map(Number);
            const dataObjeto = new Date(ano, mes - 1, dia);

            if (isNaN(valor) || valor <= 0) {
                alert("Por favor, insira um valor de pagamento válido.");
                return;
            }
            if (isNaN(dataObjeto.getTime())) {
                 alert("Data inválida. Por favor, use DD/MM/AAAA.");
                 return;
            }
            
            const anoAtualLimite = new Date().getFullYear();
            if (dataObjeto.getFullYear() < (anoAtualLimite - 5) || dataObjeto.getFullYear() > (anoAtualLimite + 1)) {
                alert(`Por favor, insira uma data de pagamento entre ${anoAtualLimite - 5} e ${anoAtualLimite + 1}.`);
                return;
            }

            const novoPagamento = {
                valor: valor,
                data: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
                timestamp: Date.now() 
            };

            try {
                // Usamos as funções importadas diretamente
                const filhoRef = doc(db, "filhos", currentFilhoId);
                await updateDoc(filhoRef, {
                    pagamentos: arrayUnion(novoPagamento)
                });

                alert("Pagamento registrado com sucesso!");
                pagamentoModal.style.display = "none";
                
                // Recarrega os dados do filho específico e atualiza a interface
                const q = query(collection(db, "filhos"), where("userId", "==", auth.currentUser.uid), where("__name__", "==", currentFilhoId));
                const updatedFilhoSnap = await getDocs(q);
                if (!updatedFilhoSnap.empty) {
                    activeFilhoData = { id: updatedFilhoSnap.docs[0].id, ...updatedFilhoSnap.docs[0].data() };
                    displayMonthsForYear(activeFilhoData, currentDisplayYear); // Renderiza meses com dados atualizados
                    calcularEExibirSaldo(activeFilhoData, currentDisplayYear); // Atualiza saldo
                }

            } catch (error) {
                console.error("Erro ao registrar pagamento:", error);
                alert("Erro ao registrar pagamento. Tente novamente.");
            }
        });
    }

    // Excluir pagamento
    async function deletePagamento(filhoId, timestampPagamento) {
        try {
            const filhoRef = doc(db, "filhos", filhoId);
            const q = query(collection(db, "filhos"), where("userId", "==", auth.currentUser.uid), where("__name__", "==", filhoId));
            const filhoDocSnap = await getDocs(q);
            
            if (filhoDocSnap.empty) {
                console.error("Filho não encontrado para exclusão de pagamento.");
                return;
            }
            const filhoData = filhoDocSnap.docs[0].data();
            
            const pagamentosAtuais = filhoData.pagamentos || [];
            const pagamentoParaRemover = pagamentosAtuais.find(p => p.timestamp === timestampPagamento);

            if (pagamentoParaRemover) {
                await updateDoc(filhoRef, {
                    pagamentos: arrayRemove(pagamentoParaRemover)
                });
                alert("Pagamento excluído com sucesso!");
                
                const updatedFilhoSnap = query(collection(db, "filhos"), where("userId", "==", auth.currentUser.uid), where("__name__", "==", filhoId));
                const updatedFilhoDocs = await getDocs(updatedFilhoSnap);
                activeFilhoData = { id: updatedFilhoDocs.docs[0].id, ...updatedFilhoDocs.docs[0].data() };
                displayMonthsForYear(activeFilhoData, currentDisplayYear);
                calcularEExibirSaldo(activeFilhoData, currentDisplayYear);
            }
        } catch (error) {
            console.error("Erro ao excluir pagamento:", error);
            alert("Erro ao excluir pagamento. Tente novamente.");
        }
    }

    // Excluir filho
    async function deleteFilho(filhoId) {
        try {
            await deleteDoc(doc(db, "filhos", filhoId));
            alert("Filho excluído com sucesso!");
            loadFilhos(auth.currentUser.uid);
        } catch (error) {
            console.error("Erro ao excluir filho:", error);
            alert("Erro ao excluir filho. Tente novamente.");
        }
    }

    // Função para formatar data (YYYY-MM-DD para DD/MM/AAAA)
    function formatarData(dataString) {
        if (!dataString) return '';
        const [ano, mes, dia] = dataString.split('-');
        return `${dia}/${mes}/${ano}`;
    }
});
