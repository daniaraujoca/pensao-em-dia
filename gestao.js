import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async function () {
    const auth = window.auth;
    const db = window.db;

    const filhoTabsContainer = document.getElementById("filhoTabs");
    const filhosContentContainer = document.getElementById("filhosContent");

    const pagamentoModal = document.getElementById("pagamentoModal");
    const closeButton = pagamentoModal ? pagamentoModal.querySelector(".close-button") : null;
    const pagamentoForm = document.getElementById("pagamentoForm");
    const modalValor = document.getElementById("modalValor");
    const modalData = document.getElementById("modalData");

    let currentFilhoId = null;
    let activeFilhoData = null;
    let currentDisplayYear = new Date().getFullYear();

    onAuthStateChanged(auth, user => {
        if (!user) {
            window.location.href = "./index.html";
        } else {
            loadFilhos(user.uid);
        }
    });

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

    async function loadFilhos(userId) {
        filhoTabsContainer.innerHTML = "";
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
                tab.classList.add("tab-button");
                tab.textContent = filho.nome;
                tab.setAttribute('data-filho-id', filho.id);
                tab.addEventListener("click", () => showFilhoDetails(filho.id, filhos));
                filhoTabsContainer.appendChild(tab);

                if (index === 0) {
                    tab.click();
                }
            });

        } catch (error) {
            console.error("Erro ao carregar filhos:", error);
            filhosContentContainer.innerHTML = "<p>Erro ao carregar os dados dos filhos. Tente novamente mais tarde.</p>";
        }
    }

    async function showFilhoDetails(filhoId, allFilhos) {
        filhoTabsContainer.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
        document.querySelector(`.tab-button[data-filho-id="${filhoId}"]`).classList.add("active");

        activeFilhoData = allFilhos.find(f => f.id === filhoId);
        if (!activeFilhoData) {
            filhosContentContainer.innerHTML = "<p>Detalhes do filho não encontrados.</p>";
            return;
        }

        currentFilhoId = filhoId;

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

            <div class="year-enable-toggle"> 
                <label for="enable-year-checkbox">
                    <input type="checkbox" class="enable-year-checkbox" id="enable-year-checkbox">
                    Habilitar <span class="enable-year-text">${currentDisplayYear}</span> para cálculo de dívida de <span class="enable-filho-name-for-checkbox">${activeFilhoData.nome}</span>
                </label>
                <small>Apenas anos habilitados são considerados no montante devedor.</small>
            </div>

            <h3>Histórico de Pagamentos</h3>
            <button class="action-btn toggle-meses-btn">Esconder Meses (${currentDisplayYear})</button> 
            
            <div class="meses-grid"> 
                </div>
        `;
        
        addEventListenersToDynamicContent();
        displayMonthsForYear(activeFilhoData, currentDisplayYear);
    }

    function addEventListenersToDynamicContent() {
        const registerPaymentBtn = filhosContentContainer.querySelector(".register-payment-btn");
        const deleteFilhoBtn = filhosContentContainer.querySelector(".delete-filho-btn");
        const prevYearBtn = filhosContentContainer.querySelector(".prev-year-btn");
        const nextYearBtn = filhosContentContainer.querySelector(".next-year-btn");
        const enableYearCheckbox = filhosContentContainer.querySelector(".enable-year-checkbox");
        const toggleMesesBtn = filhosContentContainer.querySelector(".toggle-meses-btn");


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
            // Define o estado inicial do checkbox com base em se o ano atual está habilitado nos dados do filho
            enableYearCheckbox.checked = activeFilhoData.anosHabilitadosCalculoDestaPagina && activeFilhoData.anosHabilitadosCalculoDestaPagina.includes(currentDisplayYear);
            
            enableYearCheckbox.addEventListener('change', async () => {
                const filhoRef = doc(db, "filhos", currentFilhoId);
                let anosHabilitados = activeFilhoData.anosHabilitadosCalculoDestaPagina || [];

                if (enableYearCheckbox.checked) {
                    if (!anosHabilitados.includes(currentDisplayYear)) {
                        anosHabilitados.push(currentDisplayYear);
                    }
                } else {
                    anosHabilitados = anosHabilitados.filter(year => year !== currentDisplayYear);
                }
                
                // Atualiza o Firebase com os anos habilitados
                await updateDoc(filhoRef, {
                    anosHabilitadosCalculoDestaPagina: anosHabilitados
                });

                // Atualiza o activeFilhoData local para refletir a mudança
                activeFilhoData.anosHabilitadosCalculoDestaPagina = anosHabilitados;
                
                calcularEExibirSaldo(activeFilhoData, currentDisplayYear);
            });
        }
        if (toggleMesesBtn) {
            const mesesGridCurrentContainer = filhosContentContainer.querySelector(".meses-grid");
            if (mesesGridCurrentContainer) {
                toggleMesesBtn.addEventListener('click', () => {
                    mesesGridCurrentContainer.classList.toggle('hidden');
                    toggleMesesBtn.textContent = mesesGridCurrentContainer.classList.contains('hidden') ? 
                        `Mostrar Meses (${currentDisplayYear})` : `Esconder Meses (${currentDisplayYear})`;
                });
            }
        }
    }

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

    function calcularEExibirSaldo(filho, ano) {
        const pagamentosNoAno = (filho.pagamentos || []).filter(p => new Date(p.data).getFullYear() === ano);
        const totalPagoAno = pagamentosNoAno.reduce((sum, p) => sum + p.valor, 0);

        let totalDevidoAno = 0;
        const enableYearCheckbox = filhosContentContainer.querySelector(".enable-year-checkbox");

        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;
        const diaAtual = hoje.getDate();

        // Verifica se o ano está habilitado para cálculo (usando os dados do filho, não apenas o checkbox momentâneo)
        const isYearEnabled = (filho.anosHabilitadosCalculoDestaPagina || []).includes(ano);

        if (isYearEnabled) { // Só calcula se o ano estiver habilitado
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
            montanteDevedorDisplay.classList.remove('verde', 'amarelo', 'vermelho');
            if (montanteDevedor > 0) {
                montanteDevedorDisplay.classList.add('vermelho');
            } else if (montanteDevedor < 0) {
                montanteDevedorDisplay.classList.add('verde'); 
            } else {
                montanteDevedorDisplay.classList.add('verde'); 
            }
        }
    }

    function displayMonthsForYear(filho, ano) {
        const mesesGridContainer = filhosContentContainer.querySelector(".meses-grid");
        if (!mesesGridContainer) return; 

        mesesGridContainer.innerHTML = '';
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

            let saldoMes = -filho.valorMensal;
            let pagamentosExibicao = '';
            if (pagamentosDoMes.length > 0) {
                pagamentosDoMes.sort((a, b) => a.timestamp - b.timestamp).forEach(p => {
                    saldoMes += p.valor;
                    pagamentosExibicao += `
                        <div class="pagamento-item">
                            R$ ${p.valor.toFixed(2)} - ${formatarData(p.data)} 
                            <button class="btn-excluir-pagamento" 
                                data-filho-id="${filho.id}" 
                                data-timestamp="${p.timestamp}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>`;
                });
            }
            
            let cardClass = 'nao-pago';
            let mesNomeClass = 'nao-pago-text'; // Adicionei uma classe para o texto do mês se precisar de cor diferente
            if (saldoMes >= 0) {
                cardClass = 'pago-completo';
                mesNomeClass = 'pago-completo-text';
            } else if (saldoMes > -filho.valorMensal) {
                cardClass = 'pago-parcial';
                mesNomeClass = 'pago-parcial-text';
            }

            const cardHTML = `
                <div class="mes-box ${cardClass}">
                    <h4 class="mes-nome ${mesNomeClass}">${nomeMes} ${ano}</h4>
                    <p>Valor Mensal: R$ ${filho.valorMensal.toFixed(2)}</p>
                    <p>Pagamentos:</p>
                    <div class="pagamentos-lista">${pagamentosExibicao || 'Nenhum'}</div>
                    <p>Saldo do Mês: R$ ${saldoMes.toFixed(2)}</p>
                    <button class="adicionar-pagamento"
                            data-filho-id="${filho.id}" 
                            data-mes="${mesNumero}" 
                            data-ano="${ano}">Adicionar Pagamento</button>
                </div>
            `;
            mesesGridContainer.insertAdjacentHTML('beforeend', cardHTML);
        });

        mesesGridContainer.querySelectorAll(".adicionar-pagamento").forEach(btn => {
            btn.addEventListener("click", (e) => {
                currentFilhoId = e.target.dataset.filhoId;
                const mesDoCard = e.target.dataset.mes;
                const anoDoCard = e.target.dataset.ano;
                
                const diaVenc = String(activeFilhoData.diaVencimento || 1).padStart(2, '0');
                const dataPreenchida = `${diaVenc}/${String(mesDoCard).padStart(2, '0')}/${anoDoCard}`;
                modalData.value = dataPreenchida;

                if (pagamentoModal) {
                    pagamentoModal.style.display = "block";
                    modalValor.value = '';
                }
            });
        });

        mesesGridContainer.querySelectorAll(".btn-excluir-pagamento").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const idFilho = e.target.dataset.filhoId || e.target.closest('.btn-excluir-pagamento').dataset.filhoId; // Para pegar do ícone
                const timestampPagamento = parseInt(e.target.dataset.timestamp || e.target.closest('.btn-excluir-pagamento').dataset.timestamp);

                if (confirm("Tem certeza que deseja excluir este pagamento?")) {
                    await deletePagamento(idFilho, timestampPagamento);
                }
            });
        });

        const currentYearSpan = filhosContentContainer.querySelector(".current-year");
        const enableYearText = filhosContentContainer.querySelector(".enable-year-text");
        const enableFilhoNameForCheckbox = filhosContentContainer.querySelector(".enable-filho-name-for-checkbox");
        const toggleMesesBtn = filhosContentContainer.querySelector(".toggle-meses-btn");

        if (currentYearSpan) currentYearSpan.textContent = `Ano: ${currentDisplayYear}`;
        if (enableYearText) enableYearText.textContent = currentDisplayYear;
        if (enableFilhoNameForCheckbox) enableFilhoNameForCheckbox.textContent = filho.nome;
        if (toggleMesesBtn) {
            const mesesGridCurrentContainer = filhosContentContainer.querySelector(".meses-grid");
            toggleMesesBtn.textContent = mesesGridCurrentContainer.classList.contains('hidden') ? 
                `Mostrar Meses (${currentDisplayYear})` : `Esconder Meses (${currentDisplayYear})`;
        }
        
        // Atualiza o estado do checkbox ao renderizar os meses
        const enableYearCheckbox = filhosContentContainer.querySelector(".enable-year-checkbox");
        if (enableYearCheckbox) {
             enableYearCheckbox.checked = (filho.anosHabilitadosCalculoDestaPagina || []).includes(currentDisplayYear);
        }

        calcularEExibirSaldo(filho, ano);
    }

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
                const filhoRef = doc(db, "filhos", currentFilhoId);
                await updateDoc(filhoRef, {
                    pagamentos: arrayUnion(novoPagamento)
                });

                alert("Pagamento registrado com sucesso!");
                pagamentoModal.style.display = "none";
                
                const q = query(collection(db, "filhos"), where("userId", "==", auth.currentUser.uid), where("__name__", "==", currentFilhoId));
                const updatedFilhoSnap = await getDocs(q);
                if (!updatedFilhoSnap.empty) {
                    activeFilhoData = { id: updatedFilhoSnap.docs[0].id, ...updatedFilhoSnap.docs[0].data() };
                    displayMonthsForYear(activeFilhoData, currentDisplayYear);
                    calcularEExibirSaldo(activeFilhoData, currentDisplayYear);
                }

            } catch (error) {
                console.error("Erro ao registrar pagamento:", error);
                alert("Erro ao registrar pagamento. Tente novamente.");
            }
        });
    }

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

    function formatarData(dataString) {
        if (!dataString) return '';
        const [ano, mes, dia] = dataString.split('-');
        return `${dia}/${mes}/${ano}`;
    }
});
