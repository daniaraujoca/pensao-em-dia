// gestao.js
import { db, auth } from "./common.js"; // Importar db e auth do common.js
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function () {
    const filhoTabsContainer = document.getElementById("filhoTabs");
    const filhosContentContainer = document.getElementById("filhosContent");
    const pagamentoModal = document.getElementById("pagamentoModal");
    const closeButton = document.querySelector(".close-button");
    const pagamentoForm = document.getElementById("pagamentoForm");
    const modalValorInput = document.getElementById("modalValor");
    const modalDataInput = document.getElementById("modalData");

    let currentFilhoDocId = null;
    let currentFilhoIndex = -1;
    let currentMesIndex = -1;
    let currentYearToDisplay = new Date().getFullYear();
    let currentPagamentoIndex = -1;

    let filhosDoUsuario = [];

    const mesesNomes = [
        "Janeiro", "Fevereiro", "Março", "Abril",
        "Maio", "Junho", "Julho", "Agosto",
        "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    async function getFilhosDoUsuarioFirestore() {
        return new Promise((resolve, reject) => {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    const userId = user.uid;
                    const filhosRef = collection(db, "users", userId, "filhos");
                    try {
                        const querySnapshot = await getDocs(filhosRef);
                        const filhos = querySnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        resolve(normalizePagamentos(filhos));
                    } catch (e) {
                        console.error("Erro ao buscar filhos do Firestore: ", e);
                        reject(e);
                    }
                } else {
                    console.warn("Usuário não autenticado. Não é possível buscar filhos.");
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
            return;
        }
        const userId = auth.currentUser.uid;
        const filhoDocRef = doc(db, "users", userId, "filhos", filho.id);
        try {
            // setDoc sobrescreve. Para atualizações parciais, updateDoc seria usado.
            // Para a estrutura de 'pagamentos' que é um objeto aninhado, setDoc é mais simples aqui.
            await setDoc(filhoDocRef, {
                nome: filho.nome,
                dataNascimento: filho.dataNascimento,
                valorPensao: filho.valorPensao,
                pagamentos: filho.pagamentos,
                anosCalculoHabilitados: filho.anosCalculoHabilitados
            });
            console.log("Filho atualizado no Firestore:", filho.nome);
        } catch (e) {
            console.error("Erro ao salvar filho no Firestore: ", e);
            alert("Erro ao salvar dados do filho. Tente novamente.");
        }
    }

    function normalizePagamentos(filhos) {
        return filhos.map(filho => {
            if (!filho.pagamentos) {
                filho.pagamentos = {};
            }
            if (!filho.anosCalculoHabilitados || !Array.isArray(filho.anosCalculoHabilitados)) {
                filho.anosCalculoHabilitados = [];
            }
            for (const year in filho.pagamentos) {
                if (filho.pagamentos.hasOwnProperty(year)) {
                    if (!Array.isArray(filho.pagamentos[year])) {
                        const oldPagamentos = filho.pagamentos[year];
                        filho.pagamentos[year] = Array(12).fill().map(() => []);
                        if (Array.isArray(oldPagamentos)) {
                            oldPagamentos.forEach(p => {
                                const pParts = p.data.split('/');
                                const pMonth = parseInt(pParts[1], 10) - 1;
                                if (pMonth >= 0 && pMonth < 12) {
                                    filho.pagamentos[year][pMonth].push(p);
                                }
                            });
                        }
                    } else if (filho.pagamentos[year].length < 12) {
                        while (filho.pagamentos[year].length < 12) {
                            filho.pagamentos[year].push([]);
                        }
                    }
                }
            }
            return filho;
        });
    }

    function calcularMontanteDevido(filho) {
        const valorMensal = parseFloat(filho.valorPensao);
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth();

        let totalDevido = 0;
        let status = "verde";
        let temMesesComDivida = false;

        for (let i = 0; i < filho.anosCalculoHabilitados.length; i++) {
            const ano = filho.anosCalculoHabilitados[i];

            if (ano > anoAtual) continue;

            const pagamentosDoAno = filho.pagamentos[ano] || Array(12).fill().map(() => []);

            let limiteMes = 11;
            if (ano === anoAtual) {
                limiteMes = mesAtual;
            }

            for (let mes = 0; mes <= limiteMes; mes++) {
                const pagamentosMes = pagamentosDoAno[mes] || [];
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
        } else if (status === "verde" && temMesesComDivida) {
            status = "amarelo";
        }

        return { totalDevido, status };
    }

    function calcularIdade(dataNascimentoStr) {
        if (!dataNascimentoStr) return "N/A";

        let dataParts = dataNascimentoStr.split('-');
        if (dataParts.length !== 3) {
            dataParts = dataNascimentoStr.split('/');
            if (dataParts.length === 3) {
                dataNascimentoStr = `${dataParts[2]}-${dataParts[1]}-${dataParts[0]}`;
            } else {
                return "N/A";
            }
        }

        const dataNascimento = new Date(dataNascimentoStr);
        if (isNaN(dataNascimento.getTime())) return "N/A";

        const hoje = new Date();
        let idade = hoje.getFullYear() - dataNascimento.getFullYear();
        const mesAtual = hoje.getMonth();
        const diaAtual = hoje.getDate();
        const mesNascimento = dataNascimento.getMonth();
        const diaNascimento = dataNascimento.getDate();

        if (mesAtual < mesNascimento || (mesAtual === mesNascimento && diaAtual < diaNascimento)) {
            idade--;
        }
        return idade;
    }

    async function renderizarGestaoCompleta() {
        filhoTabsContainer.innerHTML = "";
        filhosContentContainer.innerHTML = "";

        try {
            filhosDoUsuario = await getFilhosDoUsuarioFirestore();
        } catch (error) {
            console.error("Não foi possível carregar os filhos:", error);
            filhosContentContainer.innerHTML = `<div class="feedback-message error">Erro ao carregar os dados dos filhos. Por favor, tente recarregar a página.</div>`;
            return;
        }

        const yearNavigation = document.querySelector('.year-navigation'); // Buscar fora do loop para não criar duplicatas
        const yearEnableToggle = document.querySelector('.year-enable-toggle'); // Buscar fora do loop

        if (filhosDoUsuario.length === 0) {
            filhosContentContainer.innerHTML = `
                <div class="sem-filhos-gestao">
                    <p>Nenhum filho cadastrado para gestão ainda. <a href="cadastrofilho.html">Cadastre um filho</a> para começar!</p>
                </div>
            `;
            if (yearNavigation) yearNavigation.style.display = 'none';
            if (yearEnableToggle) yearEnableToggle.style.display = 'none';
            return;
        } else {
            if (yearNavigation) yearNavigation.style.display = 'flex'; // Exibir se houver filhos
            if (yearEnableToggle) yearEnableToggle.style.display = 'block'; // Exibir se houver filhos
        }

        filhosDoUsuario.forEach((filho, filhoIndex) => {
            const tabButton = document.createElement("button");
            tabButton.classList.add("tab-button");
            tabButton.textContent = filho.nome;
            tabButton.dataset.filhoIndex = filhoIndex;
            tabButton.dataset.filhoDocId = filho.id;
            filhoTabsContainer.appendChild(tabButton);

            const filhoContentDiv = document.createElement("div");
            filhoContentDiv.classList.add("filho-content");
            filhoContentDiv.id = `filho-${filhoIndex}-content`;

            const { totalDevido, status } = calcularMontanteDevido(filho);
            const idadeFilho = calcularIdade(filho.dataNascimento);

            const initialYearForFilho = new Date().getFullYear();

            filhoContentDiv.innerHTML = `
                <div class="filho-bloco">
                    <div class="filho-header">
                        <h2 class="filho-nome">Filho(a): ${filho.nome}</h2>
                        <button class="toggle-meses-btn" data-filho-index="${filhoIndex}">Esconder Meses (${initialYearForFilho})</button>
                    </div>
                    <div class="filho-detalhes">
                        <p>Valor Mensal Devido: R$ ${Number(filho.valorPensao).toFixed(2).replace('.', ',')}</p>
                        <p>Idade: ${idadeFilho} anos</p>
                    </div>
                    <div class="montante-devedor ${status}">
                        Montante Devedor: R$ ${totalDevido.toFixed(2).replace('.', ',')}
                    </div>

                    <div class="year-navigation">
                        <button class="nav-btn prev-year-btn" data-filho-index="${filhoIndex}"><i class="fas fa-chevron-left"></i> Anterior</button>
                        <span class="current-year" data-filho-index="${filhoIndex}">Ano: ${initialYearForFilho}</span>
                        <button class="nav-btn next-year-btn" data-filho-index="${filhoIndex}">Próximo <i class="fas fa-chevron-right"></i></button>
                    </div>

                    <div class="year-enable-toggle">
                        <label>
                            <input type="checkbox" class="enable-year-checkbox" data-filho-index="${filhoIndex}">
                            Habilitar <span class="display-year-for-toggle">${initialYearForFilho}</span> para cálculo de dívida de <span class="display-name-for-toggle">${filho.nome}</span>
                        </label>
                        <small>Apenas anos habilitados são considerados no montante devedor.</small>
                    </div>

                    <div class="meses-grid">
                    </div>
                </div>
            `;
            filhosContentContainer.appendChild(filhoContentDiv);

            renderizarMesesParaFilho(filho, filhoContentDiv, initialYearForFilho, filhoIndex);

            tabButton.addEventListener('click', function() {
                activateTab(filhoIndex);
            });
        });

        if (filhosDoUsuario.length > 0) {
            activateTab(0);
        }
    }

    function renderizarMesesParaFilho(filho, filhoContentDiv, yearToDisplay, filhoIndex) {
        const mesesGrid = filhoContentDiv.querySelector(".meses-grid");
        mesesGrid.innerHTML = "";

        if (!filho.pagamentos[yearToDisplay]) {
            filho.pagamentos[yearToDisplay] = Array(12).fill().map(() => []);
        } else if (filho.pagamentos[yearToDisplay].length < 12) {
            while (filho.pagamentos[yearToDisplay].length < 12) {
                filho.pagamentos[yearToDisplay].push([]);
            }
        }
        const pagamentosDoAnoExibido = filho.pagamentos[yearToDisplay];

        mesesNomes.forEach((nomeMes, mesIndex) => {
            const mesBox = document.createElement("div");
            mesBox.classList.add("mes-box");

            const pagamentosDoMes = pagamentosDoAnoExibido[mesIndex] || [];
            const totalPagoNoMes = pagamentosDoMes.reduce((soma, p) => soma + parseFloat(p.valor || 0), 0);

            let statusMesClass = "";
            const hoje = new Date();
            const anoAtual = hoje.getFullYear();
            const mesAtual = hoje.getMonth();

            if (yearToDisplay < anoAtual || (yearToDisplay === anoAtual && mesIndex <= mesAtual)) {
                if (totalPagoNoMes >= parseFloat(filho.valorPensao)) {
                    statusMesClass = "pago-completo";
                } else if (totalPagoNoMes > 0) {
                    statusMesClass = "pago-parcial";
                } else {
                    statusMesClass = "nao-pago";
                }
            } else {
                statusMesClass = ""; // Futuro ou mês atual não passado ainda, sem status de dívida
            }

            if (statusMesClass) {
                mesBox.classList.add(statusMesClass);
            }

            mesBox.innerHTML = `
                <div class="mes-nome ${statusMesClass}">${nomeMes} ${yearToDisplay}</div>
                <ul class="pagamentos-lista">
                    ${pagamentosDoMes.map((p, i) => `
                        <li class="pagamento-item">
                            <span class="pagamento-texto">R$ ${Number(p.valor).toFixed(2).replace('.', ',')} - ${p.data}</span>
                            <button class="btn-editar-pagamento" data-filho-index="${filhoIndex}" data-mes-index="${mesIndex}" data-pagamento-index="${i}" data-ano="${yearToDisplay}"><i class="fas fa-pencil-alt"></i></button>
                            <button class="btn-excluir-pagamento" data-filho-index="${filhoIndex}" data-mes-index="${mesIndex}" data-pagamento-index="${i}" data-ano="${yearToDisplay}"><i class="fas fa-times"></i></button>
                        </li>
                    `).join('')}
                </ul>
                <button class="adicionar-pagamento" data-filho-index="${filhoIndex}" data-mes-index="${mesIndex}" data-ano="${yearToDisplay}">Adicionar Pagamento</button>
            `;
            mesesGrid.appendChild(mesBox);
        });

        addFilhoContentEventListeners(filhoContentDiv);

        const enableYearCheckbox = filhoContentDiv.querySelector('.enable-year-checkbox');
        const isYearEnabled = filho.anosCalculoHabilitados.includes(yearToDisplay);
        if (enableYearCheckbox) {
            enableYearCheckbox.checked = isYearEnabled;
            enableYearCheckbox.removeEventListener('change', handleEnableYearChange);
            enableYearCheckbox.addEventListener('change', handleEnableYearChange);
            enableYearCheckbox.closest('label').querySelector('.display-year-for-toggle').textContent = yearToDisplay;
            enableYearCheckbox.closest('label').querySelector('.display-name-for-toggle').textContent = filho.nome;
        }
    }

    function activateTab(filhoIndex) {
        if (filhoIndex < 0 || filhoIndex >= filhosDoUsuario.length) return;

        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.filho-content').forEach(content => content.classList.remove('active'));

        const selectedTabButton = document.querySelector(`.tab-button[data-filho-index="${filhoIndex}"]`);
        const selectedFilhoContent = document.getElementById(`filho-${filhoIndex}-content`);

        if (selectedTabButton) selectedTabButton.classList.add('active');
        if (selectedFilhoContent) selectedFilhoContent.classList.add('active');

        currentFilhoIndex = filhoIndex;
        currentFilhoDocId = filhosDoUsuario[filhoIndex].id;

        currentYearToDisplay = selectedFilhoContent.querySelector('.current-year') ?
                                parseInt(selectedFilhoContent.querySelector('.current-year').textContent.replace('Ano: ', '')) :
                                new Date().getFullYear();

        renderizarMesesParaFilho(filhosDoUsuario[currentFilhoIndex], selectedFilhoContent, currentYearToDisplay, currentFilhoIndex);

        const toggleButton = selectedFilhoContent.querySelector('.toggle-meses-btn');
        const mesesGrid = selectedFilhoContent.querySelector('.meses-grid');
        if (toggleButton && mesesGrid) {
             toggleButton.textContent = mesesGrid.classList.contains('hidden') ? `Mostrar Meses (${currentYearToDisplay})` : `Esconder Meses (${currentYearToDisplay})`;
        }

        const displayYearForToggle = selectedFilhoContent.querySelector('.display-year-for-toggle');
        if(displayYearForToggle) displayYearForToggle.textContent = currentYearToDisplay;
        const displayNameForToggle = selectedFilhoContent.querySelector('.display-name-for-toggle');
        if(displayNameForToggle) displayNameForToggle.textContent = filhosDoUsuario[currentFilhoIndex].nome;
    }

    function addFilhoContentEventListeners(filhoContentDiv) {
        filhoContentDiv.querySelectorAll('.toggle-meses-btn').forEach(button => {
            button.removeEventListener('click', toggleMeses);
            button.addEventListener('click', toggleMeses);
        });

        filhoContentDiv.querySelectorAll('.adicionar-pagamento').forEach(button => {
            button.removeEventListener('click', adicionarPagamentoHandler);
            button.addEventListener('click', adicionarPagamentoHandler);
        });

        filhoContentDiv.querySelectorAll('.btn-editar-pagamento').forEach(button => {
            button.removeEventListener('click', editarPagamentoHandler);
            button.addEventListener('click', editarPagamentoHandler);
        });

        filhoContentDiv.querySelectorAll('.btn-excluir-pagamento').forEach(button => {
            button.removeEventListener('click', excluirPagamentoHandler);
            button.addEventListener('click', excluirPagamentoHandler);
        });

        filhoContentDiv.querySelectorAll('.prev-year-btn').forEach(button => {
            button.removeEventListener('click', handleYearNavigation);
            button.addEventListener('click', handleYearNavigation);
        });

        filhoContentDiv.querySelectorAll('.next-year-btn').forEach(button => {
            button.removeEventListener('click', handleYearNavigation);
            button.addEventListener('click', handleYearNavigation);
        });
    }

    async function handleYearNavigation(e) {
        const filhoIndex = parseInt(e.currentTarget.dataset.filhoIndex);
        const filhoAtual = filhosDoUsuario[filhoIndex];
        const filhoContentDiv = document.getElementById(`filho-${filhoIndex}-content`);
        let yearInView = parseInt(filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', ''));

        if (e.currentTarget.classList.contains('prev-year-btn')) {
            yearInView--;
        } else if (e.currentTarget.classList.contains('next-year-btn')) {
            yearInView++;
        }

        filhoContentDiv.querySelector('.current-year').textContent = `Ano: ${yearInView}`;
        renderizarMesesParaFilho(filhoAtual, filhoContentDiv, yearInView, filhoIndex);

        const enableYearCheckbox = filhoContentDiv.querySelector('.enable-year-checkbox');
        if (enableYearCheckbox) {
            enableYearCheckbox.checked = filhoAtual.anosCalculoHabilitados.includes(yearInView);
            enableYearCheckbox.closest('label').querySelector('.display-year-for-toggle').textContent = yearInView;
            enableYearCheckbox.closest('label').querySelector('.display-name-for-toggle').textContent = filhoAtual.nome;
        }

        const toggleButton = filhoContentDiv.querySelector('.toggle-meses-btn');
        if (toggleButton) {
             const mesesGrid = filhoContentDiv.querySelector('.meses-grid');
             toggleButton.textContent = mesesGrid.classList.contains('hidden') ? `Mostrar Meses (${yearInView})` : `Esconder Meses (${yearInView})`;
        }
    }

    async function handleEnableYearChange(e) {
        const filhoIndex = parseInt(e.target.dataset.filhoIndex);
        const filho = filhosDoUsuario[filhoIndex];

        const filhoContentDiv = document.getElementById(`filho-${filhoIndex}-content`);
        const anoParaHabilitar = parseInt(filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', ''));

        if (e.target.checked) {
            const confirmacao = confirm(`Tem certeza que deseja HABILITAR o ano ${anoParaHabilitar} para o cálculo do Montante Devedor para o filho(a) ${filho.nome}? Isso pode aumentar a dívida total.`);
            if (confirmacao) {
                if (!filho.anosCalculoHabilitados.includes(anoParaHabilitar)) {
                    filho.anosCalculoHabilitados.push(anoParaHabilitar);
                    filho.anosCalculoHabilitados.sort((a, b) => a - b);
                    await salvarFilhoNoFirestore(filho);
                    atualizarMontanteDevedorDisplay(filhoIndex);
                }
            } else {
                e.target.checked = false;
            }
        } else {
            const confirmacao = confirm(`Tem certeza que deseja DESABILITAR o ano ${anoParaHabilitar} do cálculo do Montante Devedor para o filho(a) ${filho.nome}? Isso pode reduzir a dívida total.`);
            if (confirmacao) {
                const index = filho.anosCalculoHabilitados.indexOf(anoParaHabilitar);
                if (index > -1) {
                    filho.anosCalculoHabilitados.splice(index, 1);
                    await salvarFilhoNoFirestore(filho);
                    atualizarMontanteDevedorDisplay(filhoIndex);
                }
            } else {
                e.target.checked = true;
            }
        }
    }

    function atualizarMontanteDevedorDisplay(filhoIndex) {
        const filho = filhosDoUsuario[filhoIndex];
        const { totalDevido, status } = calcularMontanteDevido(filho);
        const filhoContentDiv = document.getElementById(`filho-${filhoIndex}-content`);
        const montanteDevedorElem = filhoContentDiv.querySelector('.montante-devedor');

        montanteDevedorElem.textContent = `Montante Devedor: R$ ${totalDevido.toFixed(2).replace('.', ',')}`;
        montanteDevedorElem.classList.remove('verde', 'amarelo', 'vermelho');
        montanteDevedorElem.classList.add(status);
    }

    function toggleMeses() {
        const mesesGrid = this.closest('.filho-bloco').querySelector('.meses-grid');
        if (mesesGrid) {
            mesesGrid.classList.toggle('hidden');
            const filhoContentDiv = this.closest('.filho-content');
            const yearDisplay = filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', '');
            this.textContent = mesesGrid.classList.contains('hidden') ? `Mostrar Meses (${yearDisplay})` : `Esconder Meses (${yearDisplay})`;
        }
    }

    function openModal(filhoIndexParaModal, mesIdx, anoPagamento, pagamentoIdx = -1) {
        currentFilhoIndex = parseInt(filhoIndexParaModal);
        currentFilhoDocId = filhosDoUsuario[currentFilhoIndex].id;
        currentMesIndex = parseInt(mesIdx);
        currentYearToDisplay = parseInt(anoPagamento);
        currentPagamentoIndex = parseInt(pagamentoIdx);

        modalValorInput.value = '';
        modalDataInput.value = '';
        modalDataInput.classList.remove('invalid');

        if (currentPagamentoIndex !== -1) {
            const filho = filhosDoUsuario[currentFilhoIndex];
            const pagamento = filho.pagamentos[currentYearToDisplay][currentMesIndex][currentPagamentoIndex];
            modalValorInput.value = pagamento.valor;
            modalDataInput.value = pagamento.data;
            pagamentoModal.querySelector('h2').textContent = 'Editar Pagamento';
        } else {
            pagamentoModal.querySelector('h2').textContent = 'Registrar Pagamento';
        }
        pagamentoModal.style.display = 'flex';
    }

    function closeModal() {
        pagamentoModal.style.display = 'none';
        currentFilhoIndex = -1;
        currentFilhoDocId = null;
        currentMesIndex = -1;
        currentPagamentoIndex = -1;
    }

    closeButton.addEventListener('click', closeModal);

    window.addEventListener('click', function(event) {
        if (event.target === pagamentoModal) {
            closeModal();
        }
    });

    function formatarDataInput(input) {
        let value = input.value.replace(/\D/g, '');
        let formattedValue = '';

        if (value.length > 0) {
            formattedValue += value.substring(0, 2);
            if (value.length >= 2) {
                formattedValue += '/' + value.substring(2, 4);
            }
            if (value.length >= 4) {
                formattedValue += '/' + value.substring(4, 8);
            }
        }
        input.value = formattedValue;
    }

    modalDataInput.addEventListener('input', function() {
        formatarDataInput(this);
        this.classList.remove('invalid');
    });

    function isValidDate(dateString) {
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false;
        const parts = dateString.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        const date = new Date(year, month - 1, day);

        return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
    }

    function adicionarPagamentoHandler(e) {
        const filhoIndex = e.currentTarget.dataset.filhoIndex;
        const mesIndex = e.currentTarget.dataset.mesIndex;
        const anoPagamento = e.currentTarget.dataset.ano;
        openModal(filhoIndex, mesIndex, anoPagamento);
    }

    function editarPagamentoHandler(e) {
        const filhoIndex = e.currentTarget.dataset.filhoIndex;
        const mesIndex = e.currentTarget.dataset.mesIndex;
        const pagamentoIndex = e.currentTarget.dataset.pagamentoIndex;
        const anoPagamento = e.currentTarget.dataset.ano;
        openModal(filhoIndex, mesIndex, anoPagamento, pagamentoIndex);
    }

    async function excluirPagamentoHandler(e) {
        const filhoIndex = parseInt(e.currentTarget.dataset.filhoIndex);
        const mesIndex = parseInt(e.currentTarget.dataset.mesIndex);
        const pagamentoIndex = parseInt(e.currentTarget.dataset.pagamentoIndex);
        const anoPagamento = parseInt(e.currentTarget.dataset.ano);

        if (confirm("Tem certeza que deseja excluir este pagamento?")) {
            const filho = filhosDoUsuario[filhoIndex];
            
            filho.pagamentos[anoPagamento][mesIndex].splice(pagamentoIndex, 1);
            
            await salvarFilhoNoFirestore(filho);

            const filhoContentDiv = document.getElementById(`filho-${filhoIndex}-content`);
            const yearInView = parseInt(filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', ''));
            renderizarMesesParaFilho(filho, filhoContentDiv, yearInView, filhoIndex);
            atualizarMontanteDevedorDisplay(filhoIndex);

            alert("Pagamento excluído.");
        }
    }

    pagamentoForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const valor = parseFloat(modalValorInput.value);
        const data = modalDataInput.value;

        if (isNaN(valor) || valor <= 0) {
            alert("Por favor, insira um valor válido e positivo.");
            modalValorInput.focus();
            return;
        }

        if (!isValidDate(data)) {
            alert("Por favor, insira uma data válida no formato DD/MM/AAAA.");
            modalDataInput.classList.add('invalid');
            modalDataInput.focus();
            return;
        }

        const filho = filhosDoUsuario[currentFilhoIndex];

        if (!filho.pagamentos[currentYearToDisplay]) {
            filho.pagamentos[currentYearToDisplay] = Array(12).fill().map(() => []);
        }
        if (!filho.pagamentos[currentYearToDisplay][currentMesIndex]) {
            filho.pagamentos[currentYearToDisplay][currentMesIndex] = [];
        }

        if (currentPagamentoIndex !== -1) {
            filho.pagamentos[currentYearToDisplay][currentMesIndex][currentPagamentoIndex] = {
                valor: valor,
                data: data
            };
            alert("Pagamento atualizado com sucesso!");
        } else {
            filho.pagamentos[currentYearToDisplay][currentMesIndex].push({
                valor: valor,
                data: data
            });
            alert(`Pagamento de R$ ${valor.toFixed(2)} em ${data} adicionado.`);
        }

        await salvarFilhoNoFirestore(filho);

        const filhoContentDiv = document.getElementById(`filho-${currentFilhoIndex}-content`);
        const yearInView = parseInt(filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', ''));
        renderizarMesesParaFilho(filho, filhoContentDiv, yearInView, currentFilhoIndex);
        atualizarMontanteDevedorDisplay(currentFilhoIndex);

        closeModal();
    });

    auth.onAuthStateChanged((user) => {
        if (user) {
            renderizarGestaoCompleta();
        } else {
            window.location.href = "index.html";
        }
    });
});
