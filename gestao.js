// gestao.js

document.addEventListener("DOMContentLoaded", function () {
    // Referências aos elementos do DOM
    const filhoTabsContainer = document.getElementById("filhoTabs");
    const filhosContentContainer = document.getElementById("filhosContent");
    const pagamentoModal = document.getElementById("pagamentoModal");
    const closeButton = document.querySelector(".close-button");
    const pagamentoForm = document.getElementById("pagamentoForm");
    const modalValorInput = document.getElementById("modalValor");
    const modalDataInput = document.getElementById("modalData");

    // Variáveis de estado globais
    let currentFilhoId = null; // Agora armazena o ID do banco de dados
    let currentMesIndex = -1; // Mês selecionado (0-11)
    let currentYearToDisplay = new Date().getFullYear(); // Ano atualmente exibido para o filho
    let currentPagamentoId = null; // ID do pagamento para edição/exclusão

    // Cache local dos dados dos filhos e seus pagamentos (para evitar muitas requisições)
    let allChildrenData = []; // Array de filhos do backend
    // Objeto para armazenar pagamentos por child_id e ano: { child_id: { year: [pago, parcial, nao_pago,...] } }
    let allPaymentsByChildAndYear = {}; 

    // Nomes dos meses para exibição
    const mesesNomes = [
        "Janeiro", "Fevereiro", "Março", "Abril",
        "Maio", "Junho", "Julho", "Agosto",
        "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    // --- Funções de Ajuda de Data ---
    function formatarDataParaBackend(dataDDMMYYYY) {
        const parts = dataDDMMYYYY.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`; // AAAA-MM-DD
        }
        return dataDDMMYYYY; // Retorna original se formato inválido, ajuste no backend pode ser necessário
    }

    function formatarDataParaFrontend(dataYYYYMMDD) {
        if (!dataYYYYMMDD) return '';
        const date = new Date(dataYYYYMMDD + 'T12:00:00'); // Adiciona T12:00:00 para evitar problemas de fuso horário
        if (isNaN(date.getTime())) return dataYYYYMMDD; // Retorna original se inválido
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`; // DD/MM/AAAA
    }

    function isValidDate(dateString) {
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false;
        const parts = dateString.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        const date = new Date(year, month - 1, day);

        return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
    }

    // --- Funções de Conexão com o Backend (API) ---

    // Função para buscar todos os filhos do utilizador
    async function fetchChildren() {
        try {
            const response = await fetch('/api/children');
            if (!response.ok) {
                // Se a sessão expirou ou não está autenticado, redireciona para o login
                if (response.status === 401) {
                    alert('Sessão expirada ou não autorizado. Por favor, faça login novamente.');
                    window.location.href = 'index.html';
                    return [];
                }
                throw new Error(`Erro ao buscar filhos: ${response.statusText}`);
            }
            const children = await response.json();
            return children;
        } catch (error) {
            console.error("Erro ao carregar filhos:", error);
            alert("Erro ao carregar filhos. Verifique a conexão.");
            return [];
        }
    }

    // Função para buscar pagamentos de um filho específico
    async function fetchPaymentsForChild(childId) {
        try {
            const response = await fetch(`/api/payments/${childId}`);
            if (!response.ok) {
                if (response.status === 404) return []; // Sem pagamentos é ok
                throw new Error(`Erro ao buscar pagamentos para o filho ${childId}: ${response.statusText}`);
            }
            const payments = await response.json();
            return payments;
        } catch (error) {
            console.error(`Erro ao carregar pagamentos para o filho ${childId}:`, error);
            alert(`Erro ao carregar pagamentos para o filho ${childId}.`);
            return [];
        }
    }

    // Função para adicionar ou atualizar um pagamento
    async function addOrUpdatePaymentAPI(payload, isUpdate = false, paymentId = null) {
        let url = '/api/payments';
        let method = 'POST';

        if (isUpdate) {
            url = `/api/payments/${paymentId}`; // Assumindo uma rota PUT para atualizar pagamento
            method = 'PUT';
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ao ${isUpdate ? 'atualizar' : 'registar'} pagamento: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`Erro ao ${isUpdate ? 'atualizar' : 'registar'} pagamento:`, error);
            alert(`Erro: ${error.message}`);
            return null;
        }
    }

    // Função para excluir um pagamento
    async function deletePaymentAPI(paymentId) {
        try {
            const response = await fetch(`/api/payments/${paymentId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ao excluir pagamento: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error("Erro ao excluir pagamento:", error);
            alert(`Erro: ${error.message}`);
            return null;
        }
    }

    // Função para atualizar os anos habilitados de um filho no backend
    async function updateChildEnabledYears(childId, enabledYearsArray) {
        try {
            const response = await fetch(`/api/children/${childId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled_years: enabledYearsArray })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ao atualizar anos habilitados: ${response.statusText}`);
            }
            const result = await response.json();
            console.log("Anos habilitados atualizados no backend:", result);
            return result;
        } catch (error) {
            console.error("Erro ao salvar anos habilitados:", error);
            alert(`Erro ao salvar configuração de anos: ${error.message}`);
            return null;
        }
    }

    // --- Funções de Cálculo e Lógica de Negócio ---

    // Adaptação para calcular o montante devido com base nos dados do backend
    function calcularMontanteDevido(filho, pagamentosDoFilho) {
        const valorMensal = parseFloat(filho.monthly_alimony_value);
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth(); // 0-11

        let totalDevido = 0;
        let status = "verde";
        let temMesesComDivida = false;

        // USA APENAS OS ANOS HABILITADOS PARA CÁLCULO (agora persistente)
        const anosParaCalcular = filho.enabled_years || []; 

        if (anosParaCalcular.length === 0) {
            return { totalDevido: 0, status: "verde" }; // Se nenhum ano habilitado, dívida é 0
        }

        for (const ano of anosParaCalcular) { 
            if (ano > anoAtual) continue; // Não calcula para anos futuros

            // Considera o mês atual se for o ano atual, caso contrário, todos os 12 meses.
            const limiteMes = (ano === anoAtual) ? mesAtual : 11;

            for (let mes = 0; mes <= limiteMes; mes++) {
                const pagamentosNoPeriodo = pagamentosDoFilho[ano] && pagamentosDoFilho[ano][mes] ? pagamentosDoFilho[ano][mes] : [];
                const totalPago = pagamentosNoPeriodo.reduce((soma, p) => soma + parseFloat(p.amount || 0), 0);

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

    // Função para Calcular Idade
    function calcularIdade(dataNascimentoStr) {
        if (!dataNascimentoStr) return "N/A";

        // dataNascimentoStr deve vir no formato YYYY-MM-DD do backend
        const dataNascimento = new Date(dataNascimentoStr + 'T12:00:00'); 
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

    // --- Funções de Renderização da UI ---

    // Função principal para buscar dados e renderizar as abas e o conteúdo dos filhos
    async function fetchChildrenAndRender() {
        filhoTabsContainer.innerHTML = "";
        filhosContentContainer.innerHTML = "";
        allChildrenData = []; // Limpa o cache de filhos
        allPaymentsByChildAndYear = {}; // Limpa o cache de pagamentos

        const children = await fetchChildren();
        // Inicializa 'enabled_years' para cada filho se não vier do backend
        allChildrenData = children.map(child => {
            if (!child.enabled_years || !Array.isArray(child.enabled_years)) {
                // Se não houver anos habilitados, por padrão, habilita o ano atual
                child.enabled_years = [new Date().getFullYear()]; 
            }
            return child;
        });

        if (allChildrenData.length === 0) {
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

        // Para cada filho, busca seus pagamentos e depois renderiza
        for (const filho of allChildrenData) {
            const payments = await fetchPaymentsForChild(filho.id);
            // Organiza os pagamentos por ano e mês para fácil acesso no frontend
            const organizedPayments = organizePaymentsByYearAndMonth(payments);
            allPaymentsByChildAndYear[filho.id] = organizedPayments; // Armazena no cache global

            // 1. Criar o Botão da Aba
            const tabButton = document.createElement("button");
            tabButton.classList.add("tab-button");
            tabButton.textContent = filho.full_name; // Usa full_name do backend
            tabButton.dataset.filhoId = filho.id; // Usa o ID do banco de dados aqui
            filhoTabsContainer.appendChild(tabButton);

            // 2. Criar o Conteúdo da Aba para o Filho
            const filhoContentDiv = document.createElement("div");
            filhoContentDiv.classList.add("filho-content");
            filhoContentDiv.id = `filho-${filho.id}-content`; // ID único para o conteúdo

            const { totalDevido, status } = calcularMontanteDevido(filho, organizedPayments);
            const idadeFilho = calcularIdade(filho.date_of_birth); // Usa date_of_birth do backend

            filhoContentDiv.innerHTML = `
                <div class="filho-bloco">
                    <div class="filho-header">
                        <h2 class="filho-nome">Filho(a): ${filho.full_name}</h2>
                        <button class="toggle-meses-btn" data-filho-id="${filho.id}">Esconder Meses (${currentYearToDisplay})</button>
                    </div>
                    <div class="filho-detalhes">
                        <p>Valor Mensal Devido: R$ ${Number(filho.monthly_alimony_value).toFixed(2).replace('.', ',')}</p>
                        <p>Idade: ${idadeFilho} anos</p>
                    </div>
                    <div class="montante-devedor ${status}">
                        Montante Devedor: R$ ${totalDevido.toFixed(2).replace('.', ',')}
                    </div>

                    <div class="year-navigation">
                        <button class="nav-btn prev-year-btn" data-filho-id="${filho.id}"><i class="fas fa-chevron-left"></i> Anterior</button>
                        <span class="current-year" data-filho-id="${filho.id}">Ano: ${currentYearToDisplay}</span>
                        <button class="nav-btn next-year-btn" data-filho-id="${filho.id}">Próximo <i class="fas fa-chevron-right"></i></button>
                    </div>

                    <div class="year-enable-toggle">
                        <label>
                            <input type="checkbox" class="enable-year-checkbox" data-filho-id="${filho.id}">
                            Habilitar <span class="display-year-for-toggle-year">${currentYearToDisplay}</span> para cálculo de dívida de <span class="display-year-for-toggle-name">${filho.full_name}</span>
                        </label>
                        <small>Apenas anos habilitados são considerados no montante devedor.</small>
                    </div>

                    <div class="meses-grid">
                    </div>
                </div>
            `;
            filhosContentContainer.appendChild(filhoContentDiv);

            // Preencher os meses dentro da grid recém-criada
            renderizarMesesParaFilho(filho, filhoContentDiv, currentYearToDisplay);

            // Adicionar evento de clique para o botão da aba
            tabButton.addEventListener('click', function() {
                activateTab(filho.id); // Ativa a aba pelo ID do filho
            });
        }

        // Ativar a primeira aba por padrão, se houver filhos
        if (allChildrenData.length > 0) {
            activateTab(allChildrenData[0].id);
        }
    }

    // Adapta os pagamentos do backend (lista plana) para a estrutura { ano: { mes: [] } }
    function organizePaymentsByYearAndMonth(payments) {
        const organized = {};
        payments.forEach(p => {
            const date = new Date(p.payment_date + 'T12:00:00'); // Garante que a data é tratada como local para evitar fuso horário
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-11

            if (!organized[year]) {
                organized[year] = Array(12).fill().map(() => []); // Inicializa todos os meses do ano
            }
            organized[year][month].push({
                id: p.id,
                amount: p.amount,
                payment_date: p.payment_date, // Mantém YYYY-MM-DD
                created_at: p.created_at,
                month_reference: p.month_reference, // Inclui referência do mês
                year_reference: p.year_reference    // Inclui referência do ano
            });
        });

        // Ordenar os pagamentos dentro de cada mês por data
        for (const year in organized) {
            for (let mes = 0; mes < 12; mes++) {
                if (organized[year][mes]) {
                    organized[year][mes].sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
                }
            }
        }
        return organized;
    }

    // --- Função para renderizar os meses para um filho específico e um ano específico ---
    function renderizarMesesParaFilho(filho, filhoContentDiv, yearToDisplay) {
        const mesesGrid = filhoContentDiv.querySelector(".meses-grid");
        if (!mesesGrid) return; // Garante que a grid existe
        mesesGrid.innerHTML = ""; // Limpa a grid de meses antes de preencher

        const pagamentosDoAnoExibido = allPaymentsByChildAndYear[filho.id] && allPaymentsByChildAndYear[filho.id][yearToDisplay]
            ? allPaymentsByChildAndYear[filho.id][yearToDisplay]
            : Array(12).fill().map(() => []);

        mesesNomes.forEach((nomeMes, mesIndex) => {
            const mesBox = document.createElement("div");
            mesBox.classList.add("mes-box");

            const pagamentosDoMes = pagamentosDoAnoExibido[mesIndex] || [];
            const totalPagoNoMes = pagamentosDoMes.reduce((soma, p) => soma + parseFloat(p.amount || 0), 0);

            let statusMesClass = "";
            const hoje = new Date();
            const anoAtual = hoje.getFullYear();
            const mesAtual = hoje.getMonth();

            if (yearToDisplay < anoAtual || (yearToDisplay === anoAtual && mesIndex <= mesAtual)) {
                if (totalPagoNoMes >= parseFloat(filho.monthly_alimony_value)) {
                    statusMesClass = "pago-completo";
                } else if (totalPagoNoMes > 0) {
                    statusMesClass = "pago-parcial";
                } else {
                    statusMesClass = "nao-pago";
                }
            } else {
                statusMesClass = ""; // Futuro ou não habilitado
            }

            if (statusMesClass) {
                mesBox.classList.add(statusMesClass);
            }

            mesBox.innerHTML = `
                <div class="mes-nome ${statusMesClass}">${nomeMes} ${yearToDisplay}</div>
                <ul class="pagamentos-lista">
                    ${pagamentosDoMes.map(p => `
                        <li class="pagamento-item">
                            <span class="pagamento-texto">R$ ${Number(p.amount).toFixed(2).replace('.', ',')} - ${formatarDataParaFrontend(p.payment_date)}</span>
                            <button class="btn-editar-pagamento" data-filho-id="${filho.id}" data-mes-index="${mesIndex}" data-pagamento-id="${p.id}" data-ano="${yearToDisplay}"><i class="fas fa-pencil-alt"></i></button>
                            <button class="btn-excluir-pagamento" data-filho-id="${filho.id}" data-mes-index="${mesIndex}" data-pagamento-id="${p.id}" data-ano="${yearToDisplay}"><i class="fas fa-times"></i></button>
                        </li>
                    `).join('')}
                </ul>
                <button class="adicionar-pagamento" data-filho-id="${filho.id}" data-mes-index="${mesIndex}" data-ano="${yearToDisplay}">Adicionar Pagamento</button>
            `;
            mesesGrid.appendChild(mesBox);
        });

        // Adiciona os event listeners específicos para este conteúdo de filho
        addFilhoContentEventListeners(filhoContentDiv);

        // Atualiza o estado do checkbox de habilitar ano para este filho
        const enableYearCheckbox = filhoContentDiv.querySelector('.enable-year-checkbox');
        if (enableYearCheckbox) {
            // Verifica se o ano atual está na lista de anos habilitados do filho
            enableYearCheckbox.checked = filho.enabled_years.includes(yearToDisplay);
            enableYearCheckbox.removeEventListener('change', handleEnableYearChange); // Remove para evitar duplicidade
            enableYearCheckbox.addEventListener('change', handleEnableYearChange);
        }
        // Atualiza o texto do checkbox com o ano correto
        const displayYearForToggleYear = filhoContentDiv.querySelector('.display-year-for-toggle-year');
        if(displayYearForToggleYear) displayYearForToggleYear.textContent = yearToDisplay;
    }

    // --- Função para ativar uma aba específica ---
    function activateTab(filhoId) {
        const filhos = allChildrenData;
        const filhoIndex = filhos.findIndex(f => f.id === filhoId);
        if (filhoIndex === -1) return;

        // Remove a classe 'active' de todos os botões e conteúdos
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.filho-content').forEach(content => content.classList.remove('active'));

        // Adiciona a classe 'active' ao botão e conteúdo corretos
        const selectedTabButton = document.querySelector(`.tab-button[data-filho-id="${filhoId}"]`);
        const selectedFilhoContent = document.getElementById(`filho-${filhoId}-content`);

        if (selectedTabButton) selectedTabButton.classList.add('active');
        if (selectedFilhoContent) selectedFilhoContent.classList.add('active');

        // Atualiza as variáveis de estado globais para o filho ativo
        currentFilhoId = filhoId;
        // Pega o ano que estava sendo exibido para este filho, ou o ano atual se for a primeira vez
        currentYearToDisplay = selectedFilhoContent.querySelector('.current-year') ?
                                parseInt(selectedFilhoContent.querySelector('.current-year').textContent.replace('Ano: ', '')) :
                                new Date().getFullYear();

        // Renderiza os meses para o ano atual do filho selecionado novamente
        const filhoAtual = allChildrenData.find(f => f.id === currentFilhoId);
        renderizarMesesParaFilho(filhoAtual, selectedFilhoContent, currentYearToDisplay);

        // Atualiza a exibição do nome do filho e ano no toggle de habilitar ano
        const displayYearForToggleName = selectedFilhoContent.querySelector('.display-year-for-toggle-name');
        if(displayYearForToggleName) displayYearForToggleName.textContent = filhoAtual.full_name;
        const displayYearForToggleYear = selectedFilhoContent.querySelector('.display-year-for-toggle-year');
        if(displayYearForToggleYear) displayYearForToggleYear.textContent = currentYearToDisplay;
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
        const filhoId = parseInt(e.currentTarget.dataset.filhoId);
        const filhoContentDiv = document.getElementById(`filho-${filhoId}-content`);
        let yearInView = parseInt(filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', ''));

        if (e.currentTarget.classList.contains('prev-year-btn')) {
            yearInView--;
        } else if (e.currentTarget.classList.contains('next-year-btn')) {
            yearInView++;
        }

        filhoContentDiv.querySelector('.current-year').textContent = `Ano: ${yearInView}`;
        const filhoAtual = allChildrenData.find(f => f.id === filhoId);
        renderizarMesesParaFilho(filhoAtual, filhoContentDiv, yearInView);

        // Atualiza o estado do checkbox de habilitar ano para o novo ano
        const enableYearCheckbox = filhoContentDiv.querySelector('.enable-year-checkbox');
        if (enableYearCheckbox && filhoAtual.enabled_years) {
            enableYearCheckbox.checked = filhoAtual.enabled_years.includes(yearInView);
        }
        
        const displayYearForToggleYear = filhoContentDiv.querySelector('.display-year-for-toggle-year');
        if(displayYearForToggleYear) displayYearForToggleYear.textContent = yearInView;
    }

    // Handler para o checkbox de habilitar/desabilitar ano
    async function handleEnableYearChange(e) {
        const filhoId = parseInt(e.target.dataset.filhoId);
        const filho = allChildrenData.find(f => f.id === filhoId);

        const filhoContentDiv = document.getElementById(`filho-${filhoId}-content`);
        const anoParaHabilitar = parseInt(filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', ''));

        // Se 'enabled_years' não existir no objeto filho, inicialize
        if (!filho.enabled_years) {
            filho.enabled_years = [];
        }

        let updatedYears = [...filho.enabled_years]; // Cria uma cópia para modificação

        if (e.target.checked) {
            const confirmacao = confirm(`Tem certeza que deseja HABILITAR o ano ${anoParaHabilitar} para o cálculo do Montante Devedor para o filho(a) ${filho.full_name}? Isso pode aumentar a dívida total.`);
            if (confirmacao) {
                if (!updatedYears.includes(anoParaHabilitar)) {
                    updatedYears.push(anoParaHabilitar);
                    updatedYears.sort((a, b) => a - b);
                }
            } else {
                e.target.checked = false; // Reverte o checkbox se o utilizador cancelar
                return; // Sai da função
            }
        } else {
            const confirmacao = confirm(`Tem certeza que deseja DESABILITAR o ano ${anoParaHabilitar} do cálculo do Montante Devedor para o filho(a) ${filho.full_name}? Isso pode reduzir a dívida total.`);
            if (confirmacao) {
                const index = updatedYears.indexOf(anoParaHabilitar);
                if (index > -1) {
                    updatedYears.splice(index, 1);
                }
            } else {
                e.target.checked = true; // Reverte o checkbox se o utilizador cancelar
                return; // Sai da função
            }
        }

        // Tenta salvar no backend
        const result = await updateChildEnabledYears(filho.id, updatedYears);
        if (result) {
            // Se o backend salvou com sucesso, atualiza o cache local
            filho.enabled_years = updatedYears;
            atualizarMontanteDevedorDisplay(filho.id); // Atualiza o montante
            alert("Configuração de ano salva com sucesso!");
        } else {
            // Se falhou no backend, reverte o estado do checkbox no frontend
            e.target.checked = !e.target.checked; 
            alert("Falha ao salvar configuração de ano. Tente novamente.");
        }
    }

    // Função para atualizar apenas o display do montante devedor de um filho específico
    function atualizarMontanteDevedorDisplay(filhoId) {
        const filho = allChildrenData.find(f => f.id === filhoId);
        const pagamentosDoFilho = allPaymentsByChildAndYear[filhoId];
        const { totalDevido, status } = calcularMontanteDevido(filho, pagamentosDoFilho);
        const filhoContentDiv = document.getElementById(`filho-${filhoId}-content`);
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

    function openModal(filhoIdParaModal, mesIdx, anoPagamento, pagamentoId = null) {
        currentFilhoId = parseInt(filhoIdParaModal);
        currentMesIndex = parseInt(mesIdx);
        currentYearToDisplay = parseInt(anoPagamento);
        currentPagamentoId = pagamentoId; // Pode ser null para novo pagamento

        modalValorInput.value = '';
        modalDataInput.value = '';
        modalDataInput.classList.remove('invalid');

        if (currentPagamentoId) { // Se um ID de pagamento foi passado, é uma edição
            const pagamentosDoFilhoNoAnoMes = allPaymentsByChildAndYear[currentFilhoId][currentYearToDisplay][currentMesIndex];
            const pagamento = pagamentosDoFilhoNoAnoMes.find(p => p.id === currentPagamentoId);
            if (pagamento) {
                modalValorInput.value = pagamento.amount;
                modalDataInput.value = formatarDataParaFrontend(pagamento.payment_date);
            }
            pagamentoModal.querySelector('h2').textContent = 'Editar Pagamento';
        } else {
            pagamentoModal.querySelector('h2').textContent = 'Registar Pagamento';
        }
        pagamentoModal.style.display = 'flex';
    }

    function closeModal() {
        pagamentoModal.style.display = 'none';
        currentFilhoId = null;
        currentMesIndex = -1;
        currentPagamentoId = null;
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

    // --- Handlers de Ações (disparados pelos botões dentro das abas) ---
    function adicionarPagamentoHandler(e) {
        const filhoId = e.currentTarget.dataset.filhoId;
        const mesIndex = e.currentTarget.dataset.mesIndex;
        const anoPagamento = e.currentTarget.dataset.ano;
        openModal(filhoId, mesIndex, anoPagamento);
    }

    function editarPagamentoHandler(e) {
        const filhoId = e.currentTarget.dataset.filhoId;
        const mesIndex = e.currentTarget.dataset.mesIndex;
        const pagamentoId = parseInt(e.currentTarget.dataset.pagamentoId); // Pega o ID do pagamento
        const anoPagamento = e.currentTarget.dataset.ano;
        openModal(filhoId, mesIndex, anoPagamento, pagamentoId);
    }

    async function excluirPagamentoHandler(e) {
        const filhoId = e.currentTarget.dataset.filhoId;
        const mesIndex = e.currentTarget.dataset.mesIndex; // Usado para re-renderizar o mês
        const pagamentoId = parseInt(e.currentTarget.dataset.pagamentoId);
        const anoPagamento = e.currentTarget.dataset.ano;

        if (confirm("Tem certeza que deseja excluir este pagamento?")) {
            const result = await deletePaymentAPI(pagamentoId);
            if (result) {
                alert("Pagamento excluído com sucesso!");
                // Remove o pagamento do cache local
                if (allPaymentsByChildAndYear[filhoId] && allPaymentsByChildAndYear[filhoId][anoPagamento] && allPaymentsByChildAndYear[filhoId][anoPagamento][mesIndex]) {
                    allPaymentsByChildAndYear[filhoId][anoPagamento][mesIndex] = allPaymentsByChildAndYear[filhoId][anoPagamento][mesIndex].filter(p => p.id !== pagamentoId);
                }
                // Re-renderiza o conteúdo da aba do filho atual
                const filhoContentDiv = document.getElementById(`filho-${filhoId}-content`);
                const filhoAtual = allChildrenData.find(f => f.id === filhoId);
                renderizarMesesParaFilho(filhoAtual, filhoContentDiv, currentYearToDisplay);
                atualizarMontanteDevedorDisplay(filhoId); // Atualiza o montante
            }
        }
    }

    // --- Submissão do Formulário do Modal ---
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

        const payload = {
            child_id: currentFilhoId,
            amount: valor,
            payment_date: formatarDataParaBackend(data), // Formata para YYYY-MM-DD para o backend
            // Inclui mês e ano de referência no payload (para futura persistência no backend)
            month_reference: currentMesIndex + 1, // Mês (1-12)
            year_reference: currentYearToDisplay
        };

        let result = null;
        if (currentPagamentoId) {
            result = await addOrUpdatePaymentAPI(payload, true, currentPagamentoId); // Atualizar
        } else {
            result = await addOrUpdatePaymentAPI(payload); // Adicionar
        }

        if (result) {
            alert("Operação de pagamento realizada com sucesso!");
            closeModal();
            // Re-busca e re-renderiza TUDO para garantir a consistência
            // Em produção, você poderia fazer uma atualização mais granular do cache
            fetchChildrenAndRender(); 
        }
    });

    // Chama a função de renderização inicial
    fetchChildrenAndRender();
});
