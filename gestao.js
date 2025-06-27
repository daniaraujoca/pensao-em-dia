document.addEventListener("DOMContentLoaded", function () {
    // Referências aos elementos do DOM
    const filhoTabsContainer = document.getElementById("filhoTabs"); // Onde as abas serão geradas
    const filhosContentContainer = document.getElementById("filhosContent"); // Onde o conteúdo de cada filho será exibido
    const pagamentoModal = document.getElementById("pagamentoModal");
    const closeButton = document.querySelector(".close-button");
    const pagamentoForm = document.getElementById("pagamentoForm");
    const modalValorInput = document.getElementById("modalValor");
    const modalDataInput = document.getElementById("modalData");

    // Variáveis de estado
    let currentFilhoIndex = -1; // Índice do filho atualmente selecionado
    let currentMesIndex = -1;
    let currentYearToDisplay = new Date().getFullYear(); // Ano exibido para o filho atual
    let currentPagamentoIndex = -1;

    // Nomes dos meses para exibição
    const mesesNomes = [
        "Janeiro", "Fevereiro", "Março", "Abril",
        "Maio", "Junho", "Julho", "Agosto",
        "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const usuarioLogadoEmail = localStorage.getItem("usuarioLogadoEmail");

    // --- Funções de Dados e Armazenamento ---
    function getFilhosDoUsuario() {
        const filhosPorUsuario = JSON.parse(localStorage.getItem("filhosPorUsuario")) || {};
        let filhos = filhosPorUsuario[usuarioLogadoEmail] || [];

        return filhos.map(filho => {
            if (!filho.pagamentos) {
                filho.pagamentos = {};
            }
            if (!filho.anosCalculoHabilitados || !Array.isArray(filho.anosCalculoHabilitados)) {
                filho.anosCalculoHabilitados = [];
            }
            return filho;
        });
    }

    function salvarFilhosDoUsuario(filhos) {
        const filhosPorUsuario = JSON.parse(localStorage.getItem("filhosPorUsuario")) || {};
        filhosPorUsuario[usuarioLogadoEmail] = filhos;
        localStorage.setItem("filhosPorUsuario", JSON.stringify(filhosPorUsuario));
    }

    function normalizePagamentos(filhos) {
        return filhos.map(filho => {
            if (Array.isArray(filho.pagamentos)) {
                const newPagamentos = {};
                const currentYear = new Date().getFullYear(); // Ou um ano de referência
                newPagamentos[currentYear] = filho.pagamentos;
                filho.pagamentos = newPagamentos;
            } else if (!filho.pagamentos) {
                filho.pagamentos = {};
            }
            for (const year in filho.pagamentos) {
                if (filho.pagamentos.hasOwnProperty(year)) {
                    if (!Array.isArray(filho.pagamentos[year])) {
                        filho.pagamentos[year] = Array(12).fill().map(() => []);
                    } else if (filho.pagamentos[year].length < 12) {
                        while (filho.pagamentos[year].length < 12) {
                            filho.pagamentos[year].push([]);
                        }
                    }
                }
            }
            if (!filho.anosCalculoHabilitados || !Array.isArray(filho.anosCalculoHabilitados)) {
                filho.anosCalculoHabilitados = [];
            }
            return filho;
        });
    }

    // --- Cálculo do Montante Devedor ---
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

    // --- Função para Calcular Idade ---
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

    // --- Função principal para renderizar as abas e o conteúdo dos filhos ---
    function renderizarGestaoCompleta() {
        filhoTabsContainer.innerHTML = "";
        filhosContentContainer.innerHTML = "";

        let filhos = getFilhosDoUsuario();
        filhos = normalizePagamentos(filhos);
        salvarFilhosDoUsuario(filhos);

        if (filhos.length === 0) {
            filhosContentContainer.innerHTML = `
                <div class="no-children-message">
                    <p>Nenhum filho cadastrado para gestão ainda. <a href="cadastrofilho.html">Cadastre um filho</a> para começar!</p>
                </div>
            `;
            // Esconde os controles de navegação de ano e checkbox se não houver filhos
            const yearNavigation = document.querySelector('.year-navigation');
            const yearEnableToggle = document.querySelector('.year-enable-toggle');
            if (yearNavigation) yearNavigation.style.display = 'none';
            if (yearEnableToggle) yearEnableToggle.style.display = 'none';
            return;
        }

        // Mostra os controles de navegação de ano e checkbox
        const yearNavigation = document.querySelector('.year-navigation');
        const yearEnableToggle = document.querySelector('.year-enable-toggle');
        if (yearNavigation) yearNavigation.style.display = 'flex'; // Volta a exibir
        if (yearEnableToggle) yearEnableToggle.style.display = 'block'; // Volta a exibir


        filhos.forEach((filho, filhoIndex) => {
            // 1. Criar o Botão da Aba
            const tabButton = document.createElement("button");
            tabButton.classList.add("tab-button");
            tabButton.textContent = filho.nome;
            tabButton.dataset.filhoIndex = filhoIndex; // Passa o índice do array aqui
            filhoTabsContainer.appendChild(tabButton);

            // 2. Criar o Conteúdo da Aba para o Filho
            const filhoContentDiv = document.createElement("div");
            filhoContentDiv.classList.add("filho-content");
            filhoContentDiv.id = `filho-${filhoIndex}-content`; // ID único para o conteúdo

            // Inserir o HTML do bloco de gestão do filho aqui
            // A maior parte do que estava em renderizarFilhosGestao vai para cá
            const { totalDevido, status } = calcularMontanteDevido(filho);
            const idadeFilho = calcularIdade(filho.dataNascimento);

            filhoContentDiv.innerHTML = `
                <div class="filho-bloco">
                    <div class="filho-header">
                        <h2 class="filho-nome">Filho(a): ${filho.nome}</h2>
                        <button class="toggle-meses-btn" data-filho-index="${filhoIndex}">Esconder Meses (${currentYearToDisplay})</button>
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
                        <span class="current-year" data-filho-index="${filhoIndex}">Ano: ${currentYearToDisplay}</span>
                        <button class="nav-btn next-year-btn" data-filho-index="${filhoIndex}">Próximo <i class="fas fa-chevron-right"></i></button>
                    </div>

                    <div class="year-enable-toggle">
                        <label>
                            <input type="checkbox" class="enable-year-checkbox" data-filho-index="${filhoIndex}">
                            Habilitar ${currentYearToDisplay} para cálculo de dívida de <span class="display-year-for-toggle">${filho.nome}</span>
                        </label>
                        <small>Apenas anos habilitados são considerados no montante devedor.</small>
                    </div>

                    <div class="meses-grid">
                    </div>
                </div>
            `;
            filhosContentContainer.appendChild(filhoContentDiv);

            // Preencher os meses dentro da grid recém-criada
            // Passa o filhoIndex para renderizarMesesParaFilho
            renderizarMesesParaFilho(filho, filhoContentDiv, currentYearToDisplay, filhoIndex);

            // Adicionar evento de clique para o botão da aba
            tabButton.addEventListener('click', function() {
                activateTab(filhoIndex);
            });
        });

        // Ativar a primeira aba por padrão, se houver filhos
        if (filhos.length > 0) {
            activateTab(0);
        }
    }

    // --- Função para renderizar os meses para um filho específico e um ano específico ---
    // Adiciona filhoIndex como parâmetro para uso nos data-atributos dos botões de pagamento
    function renderizarMesesParaFilho(filho, filhoContentDiv, yearToDisplay, filhoIndex) {
        const mesesGrid = filhoContentDiv.querySelector(".meses-grid");
        mesesGrid.innerHTML = ""; // Limpa a grid de meses antes de preencher

        const pagamentosDoAnoExibido = filho.pagamentos[yearToDisplay] || Array(12).fill().map(() => []);

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
                statusMesClass = "";
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

        // Adiciona os event listeners específicos para este conteúdo de filho
        addFilhoContentEventListeners(filhoContentDiv);

        // Atualiza o estado do checkbox de habilitar ano para este filho
        const enableYearCheckbox = filhoContentDiv.querySelector('.enable-year-checkbox');
        const isYearEnabled = filho.anosCalculoHabilitados.includes(yearToDisplay);
        if (enableYearCheckbox) {
            enableYearCheckbox.checked = isYearEnabled;
            enableYearCheckbox.removeEventListener('change', handleEnableYearChange); // Remove para evitar duplicidade
            enableYearCheckbox.addEventListener('change', handleEnableYearChange);
        }
    }

    // --- Função para ativar uma aba específica ---
    function activateTab(filhoIndex) {
        const filhos = getFilhosDoUsuario();
        if (filhoIndex < 0 || filhoIndex >= filhos.length) return;

        // Remove a classe 'active' de todos os botões e conteúdos
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.filho-content').forEach(content => content.classList.remove('active'));

        // Adiciona a classe 'active' ao botão e conteúdo corretos
        const selectedTabButton = document.querySelector(`.tab-button[data-filho-index="${filhoIndex}"]`);
        const selectedFilhoContent = document.getElementById(`filho-${filhoIndex}-content`);

        if (selectedTabButton) selectedTabButton.classList.add('active');
        if (selectedFilhoContent) selectedFilhoContent.classList.add('active');

        // Atualiza as variáveis de estado globais para o filho ativo
        currentFilhoIndex = filhoIndex;
        // Pega o ano que estava sendo exibido para este filho, ou o ano atual se for a primeira vez
        currentYearToDisplay = selectedFilhoContent.querySelector('.current-year') ?
                                parseInt(selectedFilhoContent.querySelector('.current-year').textContent.replace('Ano: ', '')) :
                                new Date().getFullYear();

        // Renderiza os meses para o ano atual do filho selecionado novamente
        // Passa currentFilhoIndex para a função de renderização
        renderizarMesesParaFilho(filhos[currentFilhoIndex], selectedFilhoContent, currentYearToDisplay, currentFilhoIndex);

        // Atualiza a exibição do ano no toggle (para o nome do filho)
        const displayYearForToggle = selectedFilhoContent.querySelector('.display-year-for-toggle');
        if(displayYearForToggle) displayYearForToggle.textContent = filhos[currentFilhoIndex].nome;
    }

    // --- Adiciona Event Listeners para o conteúdo de um filho específico ---
    function addFilhoContentEventListeners(filhoContentDiv) {
        // Toggle Meses
        filhoContentDiv.querySelectorAll('.toggle-meses-btn').forEach(button => {
            button.removeEventListener('click', toggleMeses); // Remove para evitar duplicidade
            button.addEventListener('click', toggleMeses);
        });

        // Adicionar Pagamento
        filhoContentDiv.querySelectorAll('.adicionar-pagamento').forEach(button => {
            button.removeEventListener('click', adicionarPagamentoHandler);
            button.addEventListener('click', adicionarPagamentoHandler);
        });

        // Editar Pagamento
        filhoContentDiv.querySelectorAll('.btn-editar-pagamento').forEach(button => {
            button.removeEventListener('click', editarPagamentoHandler);
            button.addEventListener('click', editarPagamentoHandler);
        });

        // Excluir Pagamento
        filhoContentDiv.querySelectorAll('.btn-excluir-pagamento').forEach(button => {
            button.removeEventListener('click', excluirPagamentoHandler);
            button.addEventListener('click', excluirPagamentoHandler);
        });

        // Navegação de Ano (Previous)
        filhoContentDiv.querySelectorAll('.prev-year-btn').forEach(button => {
            button.removeEventListener('click', handleYearNavigation);
            button.addEventListener('click', handleYearNavigation);
        });

        // Navegação de Ano (Next)
        filhoContentDiv.querySelectorAll('.next-year-btn').forEach(button => {
            button.removeEventListener('click', handleYearNavigation);
            button.addEventListener('click', handleYearNavigation);
        });
    }

    // --- Handlers de Ações Globalizadas (adaptados para trabalhar com o filho atual) ---

    // Handler para os botões de navegar ano
    function handleYearNavigation(e) {
        const filhos = getFilhosDoUsuario();
        const filhoIndex = parseInt(e.currentTarget.dataset.filhoIndex);
        const filhoAtual = filhos[filhoIndex];
        const filhoContentDiv = document.getElementById(`filho-${filhoIndex}-content`);
        let yearInView = parseInt(filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', ''));

        if (e.currentTarget.classList.contains('prev-year-btn')) {
            yearInView--;
        } else if (e.currentTarget.classList.contains('next-year-btn')) {
            yearInView++;
        }

        filhoContentDiv.querySelector('.current-year').textContent = `Ano: ${yearInView}`;
        // Passa o filhoIndex para a renderização
        renderizarMesesParaFilho(filhoAtual, filhoContentDiv, yearInView, filhoIndex);

        // Atualiza o estado do checkbox de habilitar ano
        const enableYearCheckbox = filhoContentDiv.querySelector('.enable-year-checkbox');
        if (enableYearCheckbox) {
            enableYearCheckbox.checked = filhoAtual.anosCalculoHabilitados.includes(yearInView);
            enableYearCheckbox.closest('label').querySelector('.display-year-for-toggle').textContent = yearInView; // Atualiza o ano no texto do checkbox
        }
    }

    // Handler para o checkbox de habilitar/desabilitar ano
    function handleEnableYearChange(e) {
        const filhos = getFilhosDoUsuario();
        const filhoIndex = parseInt(e.target.dataset.filhoIndex);
        const filho = filhos[filhoIndex];

        const filhoContentDiv = document.getElementById(`filho-${filhoIndex}-content`);
        const anoParaHabilitar = parseInt(filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', ''));

        if (e.target.checked) {
            const confirmacao = confirm(`Tem certeza que deseja HABILITAR o ano ${anoParaHabilitar} para o cálculo do Montante Devedor para o filho(a) ${filho.nome}? Isso pode aumentar a dívida total.`);
            if (confirmacao) {
                if (!filho.anosCalculoHabilitados.includes(anoParaHabilitar)) {
                    filho.anosCalculoHabilitados.push(anoParaHabilitar);
                    filho.anosCalculoHabilitados.sort((a, b) => a - b);
                    salvarFilhosDoUsuario(filhos);
                    // Não é preciso renderizar tudo novamente, só atualizar o montante do filho atual
                    atualizarMontanteDevedorDisplay(filhoIndex);
                }
            } else {
                e.target.checked = false; // Reverte o checkbox se o usuário cancelar
            }
        } else {
            const confirmacao = confirm(`Tem certeza que deseja DESABILITAR o ano ${anoParaHabilitar} do cálculo do Montante Devedor para o filho(a) ${filho.nome}? Isso pode reduzir a dívida total.`);
            if (confirmacao) {
                const index = filho.anosCalculoHabilitados.indexOf(anoParaHabilitar);
                if (index > -1) {
                    filho.anosCalculoHabilitados.splice(index, 1);
                    salvarFilhosDoUsuario(filhos);
                    // Não é preciso renderizar tudo novamente, só atualizar o montante do filho atual
                    atualizarMontanteDevedorDisplay(filhoIndex);
                }
            } else {
                e.target.checked = true; // Reverte o checkbox se o usuário cancelar
            }
        }
    }

    // Função para atualizar apenas o display do montante devedor de um filho específico
    function atualizarMontanteDevedorDisplay(filhoIndex) {
        const filhos = getFilhosDoUsuario();
        const filho = filhos[filhoIndex];
        const { totalDevido, status } = calcularMontanteDevido(filho);
        const filhoContentDiv = document.getElementById(`filho-${filhoIndex}-content`);
        const montanteDevedorElem = filhoContentDiv.querySelector('.montante-devedor');

        montanteDevedorElem.textContent = `Montante Devedor: R$ ${totalDevido.toFixed(2).replace('.', ',')}`;
        // Remove classes de status antigas e adiciona a nova
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

    // O parâmetro filhoId agora é, na verdade, o filhoIndex
    function openModal(filhoIndexParaModal, mesIdx, anoPagamento, pagamentoIdx = -1) {
        // currentFilhoIndex agora recebe o índice diretamente
        currentFilhoIndex = parseInt(filhoIndexParaModal);

        currentMesIndex = parseInt(mesIdx);
        currentYearToDisplay = parseInt(anoPagamento); // Ano do pagamento em questão
        currentPagamentoIndex = parseInt(pagamentoIdx);

        modalValorInput.value = '';
        modalDataInput.value = '';
        modalDataInput.classList.remove('invalid');

        if (currentPagamentoIndex !== -1) {
            const filhos = getFilhosDoUsuario(); // Pega a lista de filhos atualizada
            const filho = filhos[currentFilhoIndex]; // Acessa o filho pelo índice
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

    // --- Handlers de Ações (disparados pelos botões dentro das abas) ---
    // Agora `e.target.dataset.filhoIndex` será o índice do array, não um ID
    function adicionarPagamentoHandler(e) {
        const filhoIndex = e.currentTarget.dataset.filhoIndex; // Use currentTarget para garantir que pega do botão
        const mesIndex = e.currentTarget.dataset.mesIndex;
        const anoPagamento = e.currentTarget.dataset.ano;
        openModal(filhoIndex, mesIndex, anoPagamento);
    }

    // Agora `e.target.dataset.filhoIndex` será o índice do array, não um ID
    function editarPagamentoHandler(e) {
        const filhoIndex = e.currentTarget.dataset.filhoIndex; // Use currentTarget para garantir que pega do botão
        const mesIndex = e.currentTarget.dataset.mesIndex;
        const pagamentoIndex = e.currentTarget.dataset.pagamentoIndex;
        const anoPagamento = e.currentTarget.dataset.ano;
        openModal(filhoIndex, mesIndex, anoPagamento, pagamentoIndex);
    }

    // Agora `e.target.dataset.filhoIndex` será o índice do array, não um ID
    function excluirPagamentoHandler(e) {
        const filhoIndex = e.currentTarget.dataset.filhoIndex; // Use currentTarget para garantir que pega do botão
        const mesIndex = e.currentTarget.dataset.mesIndex;
        const pagamentoIndex = e.currentTarget.dataset.pagamentoIndex;
        const anoPagamento = e.currentTarget.dataset.ano;

        if (confirm("Tem certeza que deseja excluir este pagamento?")) {
            const filhos = getFilhosDoUsuario();
            // Nao precisa mais de findIndex, currentFilhoIndex ja esta correto
            // const filhoIndex = filhos.findIndex(f => f.id === filhoId);
            // if (filhoIndex === -1) return; // Filho não encontrado (já garantido pelo filhoIndex)

            filhos[filhoIndex].pagamentos[anoPagamento][mesIndex].splice(pagamentoIndex, 1);
            salvarFilhosDoUsuario(filhos);

            // Re-renderiza o conteúdo da aba do filho atual
            const filhoContentDiv = document.getElementById(`filho-${filhoIndex}-content`);
            const yearInView = parseInt(filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', ''));
            // Passa o filhoIndex para a renderização
            renderizarMesesParaFilho(filhos[filhoIndex], filhoContentDiv, yearInView, filhoIndex);
            atualizarMontanteDevedorDisplay(filhoIndex); // Atualiza o montante

            alert("Pagamento excluído.");
        }
    }

    // --- Submissão do Formulário do Modal ---
    pagamentoForm.addEventListener('submit', function(e) {
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

        const filhos = getFilhosDoUsuario();
        const filho = filhos[currentFilhoIndex]; // currentFilhoIndex já está setado corretamente

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

        salvarFilhosDoUsuario(filhos);

        // Re-renderiza o conteúdo da aba do filho atual
        const filhoContentDiv = document.getElementById(`filho-${currentFilhoIndex}-content`);
        const yearInView = parseInt(filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', ''));
        // Passa currentFilhoIndex para a renderização
        renderizarMesesParaFilho(filho, filhoContentDiv, yearInView, currentFilhoIndex);
        atualizarMontanteDevedorDisplay(currentFilhoIndex); // Atualiza o montante

        closeModal();
    });

    // Chama a função de renderização inicial
    renderizarGestaoCompleta();
});