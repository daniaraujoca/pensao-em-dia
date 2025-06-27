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
    let currentYearToDisplay = new Date().getFullYear(); // Ano padrão ao carregar
    let currentPagamentoIndex = -1;

    let filhosDoUsuario = []; // Array que armazena os dados dos filhos carregados do Firestore

    const mesesNomes = [
        "Janeiro", "Fevereiro", "Março", "Abril",
        "Maio", "Junho", "Julho", "Agosto",
        "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    /**
     * Busca os dados dos filhos do usuário autenticado no Firestore.
     * @returns {Promise<Array>} Uma promessa que resolve com um array de objetos de filhos.
     */
    async function getFilhosDoUsuarioFirestore() {
        return new Promise((resolve, reject) => {
            // Garante que a lógica só prossegue quando o estado de autenticação é conhecido.
            // onAuthStateChanged é um listener, mas aqui estamos usando-o como uma forma de "esperar" pelo user.
            const unsubscribe = auth.onAuthStateChanged(async (user) => {
                unsubscribe(); // Desinscreve-se após a primeira execução para não ficar ativo
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
                    console.warn("Usuário não autenticado. Redirecionando para login.");
                    window.location.href = "index.html"; // Redireciona se não houver usuário logado
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
        // Usa doc() para criar uma referência ao documento específico do filho
        const filhoDocRef = doc(db, "users", userId, "filhos", filho.id);
        try {
            // setDoc sobrescreve o documento, o que é adequado aqui já que estamos enviando o objeto filho completo.
            await setDoc(filhoDocRef, {
                nome: filho.nome,
                dataNascimento: filho.dataNascimento,
                valorMensal: filho.valorMensal, // <--- AQUI: PADRONIZADO para valorMensal
                diaVencimento: filho.diaVencimento, // Adicionado campo que estava faltando no save
                pagamentos: filho.pagamentos,
                anosCalculoHabilitados: filho.anosCalculoHabilitados
            });
            console.log("Filho atualizado no Firestore:", filho.nome);
        } catch (e) {
            console.error("Erro ao salvar filho no Firestore: ", e);
            alert("Erro ao salvar dados do filho. Tente novamente.");
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
            
            // Itera sobre os anos existentes em pagamentos
            for (const year in filho.pagamentos) {
                if (filho.pagamentos.hasOwnProperty(year)) {
                    // Verifica se o valor para o ano é um array de 12 meses
                    if (!Array.isArray(filho.pagamentos[year]) || filho.pagamentos[year].length < 12) {
                        const oldPagamentos = Array.isArray(filho.pagamentos[year]) ? filho.pagamentos[year].flat() : []; // Pega todos os pagamentos planos
                        filho.pagamentos[year] = Array(12).fill().map(() => []); // Reinicializa com 12 arrays vazios
                        
                        // Redistribui pagamentos antigos para a nova estrutura de 12 arrays de meses
                        oldPagamentos.forEach(p => {
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
        // PADRONIZADO: usando valorMensal
        const valorMensal = parseFloat(filho.valorMensal); 
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth(); // 0-indexed

        let totalDevido = 0;
        let status = "verde"; // Padrão: tudo ok
        let temMesesComDivida = false; // Flag para diferenciar amarelo de verde

        // Itera apenas sobre os anos explicitamente habilitados para cálculo
        for (const ano of filho.anosCalculoHabilitados) {
            if (ano > anoAtual) continue; // Não calcula dívida para anos futuros

            const pagamentosDoAno = filho.pagamentos[ano] || Array(12).fill().map(() => []);

            let limiteMes = 11; // Por padrão, calcula até Dezembro
            if (ano === anoAtual) {
                limiteMes = mesAtual; // Para o ano atual, calcula só até o mês atual
            }

            for (let mes = 0; mes <= limiteMes; mes++) {
                const pagamentosMes = pagamentosDoAno[mes] || [];
                const totalPago = pagamentosMes.reduce((soma, p) => soma + parseFloat(p.valor || 0), 0);

                if (totalPago < valorMensal) {
                    totalDevido += (valorMensal - totalPago);
                    temMesesComDivida = true;
                    // Se o mês está completamente não pago (0), é vermelho
                    if (totalPago === 0) {
                        status = "vermelho"; 
                    } else if (status !== "vermelho") { // Se não for vermelho, mas for parcial, é amarelo
                        status = "amarelo";
                    }
                }
            }
        }

        // Caso especial: se não há dívida, mas a flag de "temMesesComDivida" é true, significa que
        // houve meses com dívida mas ela foi completamente quitada, então o status final é verde.
        // Se a dívida é 0, o status é sempre verde.
        if (totalDevido === 0) {
            status = "verde";
        } else if (status === "verde" && temMesesComDivida) { 
            // Já tratado nos loops, esta linha pode ser redundante se a lógica de status estiver perfeita acima,
            // mas mantida para clareza sobre o pensamento.
        }

        return { totalDevido, status };
    }

    /**
     * Calcula a idade de uma pessoa a partir da sua data de nascimento.
     * @param {string} dataNascimentoStr Data de nascimento no formato "AAAA-MM-DD" ou "DD/MM/AAAA".
     * @returns {number|string} A idade em anos ou "N/A" se a data for inválida.
     */
    function calcularIdade(dataNascimentoStr) {
        if (!dataNascimentoStr) return "N/A";

        let dataParts = dataNascimentoStr.split('-');
        // Se a data veio como DD/MM/AAAA, converte para AAAA-MM-DD para o construtor Date
        if (dataParts.length !== 3) {
            dataParts = dataNascimentoStr.split('/');
            if (dataParts.length === 3) {
                dataNascimentoStr = `${dataParts[2]}-${dataParts[1]}-${dataParts[0]}`;
            } else {
                return "N/A"; // Formato inválido
            }
        }

        const dataNascimento = new Date(dataNascimentoStr);
        if (isNaN(dataNascimento.getTime())) return "N/A"; // Data inválida

        const hoje = new Date();
        let idade = hoje.getFullYear() - dataNascimento.getFullYear();
        const mesAtual = hoje.getMonth();
        const diaAtual = hoje.getDate();
        const mesNascimento = dataNascimento.getMonth();
        const diaNascimento = dataNascimento.getDate();

        // Ajusta a idade se o aniversário ainda não ocorreu este ano
        if (mesAtual < mesNascimento || (mesAtual === mesNascimento && diaAtual < diaNascimento)) {
            idade--;
        }
        return idade;
    }

    /**
     * Renderiza toda a interface de gestão: abas dos filhos, conteúdo e modais.
     */
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

        if (filhosDoUsuario.length === 0) {
            filhosContentContainer.innerHTML = `
                <div class="sem-filhos-gestao">
                    <p>Nenhum filho cadastrado para gestão ainda. <a href="cadastrofilho.html">Cadastre um filho</a> para começar!</p>
                </div>
            `;
            // Oculta os controles de ano e toggle se não houver filhos
            const yearNavGlobal = document.querySelector('.year-navigation');
            const yearEnableToggleGlobal = document.querySelector('.year-enable-toggle');
            if (yearNavGlobal) yearNavGlobal.style.display = 'none';
            if (yearEnableToggleGlobal) yearEnableToggleGlobal.style.display = 'none';
            return;
        } 

        // Itera sobre cada filho para criar a aba e o conteúdo
        filhosDoUsuario.forEach((filho, filhoIndex) => {
            // Cria o botão da aba
            const tabButton = document.createElement("button");
            tabButton.classList.add("tab-button");
            tabButton.textContent = filho.nome;
            tabButton.dataset.filhoIndex = filhoIndex;
            tabButton.dataset.filhoDocId = filho.id;
            filhoTabsContainer.appendChild(tabButton);

            // Cria o div de conteúdo para o filho
            const filhoContentDiv = document.createElement("div");
            filhoContentDiv.classList.add("filho-content");
            filhoContentDiv.id = `filho-${filhoIndex}-content`;

            const { totalDevido, status } = calcularMontanteDevido(filho);
            const idadeFilho = calcularIdade(filho.dataNascimento);

            // Define o ano inicial a ser exibido para este filho (ano atual por padrão)
            const initialYearForFilho = new Date().getFullYear();

            // Renderiza o HTML básico para o conteúdo do filho
            filhoContentDiv.innerHTML = `
                <div class="filho-bloco">
                    <div class="filho-header">
                        <h2 class="filho-nome">Filho(a): ${filho.nome}</h2>
                        <button class="toggle-meses-btn" data-filho-index="${filhoIndex}">Esconder Meses (${initialYearForFilho})</button>
                    </div>
                    <div class="filho-detalhes">
                        <p>Valor Mensal Devido: R$ ${Number(filho.valorMensal).toFixed(2).replace('.', ',')}</p>
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

            // Renderiza os meses para o ano inicial deste filho
            renderizarMesesParaFilho(filho, filhoContentDiv, initialYearForFilho, filhoIndex);

            // Adiciona listener para a aba
            tabButton.addEventListener('click', function() {
                activateTab(filhoIndex);
            });
        });

        // Ativa a primeira aba por padrão se houver filhos
        if (filhosDoUsuario.length > 0) {
            activateTab(0);
        }
    }

    /**
     * Renderiza o grid de meses para um filho específico e um determinado ano.
     * @param {Object} filho O objeto filho.
     * @param {HTMLElement} filhoContentDiv O div de conteúdo do filho.
     * @param {number} yearToDisplay O ano a ser exibido.
     * @param {number} filhoIndex O índice do filho no array filhosDoUsuario.
     */
    function renderizarMesesParaFilho(filho, filhoContentDiv, yearToDisplay, filhoIndex) {
        const mesesGrid = filhoContentDiv.querySelector(".meses-grid");
        if (!mesesGrid) return; // Garante que o elemento existe
        mesesGrid.innerHTML = ""; // Limpa o grid de meses existente

        // Garante que o ano exibido tenha um array de 12 meses inicializado em 'pagamentos'
        if (!filho.pagamentos[yearToDisplay]) {
            filho.pagamentos[yearToDisplay] = Array(12).fill().map(() => []);
        } else if (filho.pagamentos[yearToDisplay].length < 12) {
            // Se por algum motivo o array do ano não tiver 12 meses, preenche com arrays vazios
            while (filho.pagamentos[yearToDisplay].length < 12) {
                filho.pagamentos[yearToDisplay].push([]);
            }
        }
        const pagamentosDoAnoExibido = filho.pagamentos[yearToDisplay];

        // Determina o mês e ano atual para cálculo de status
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth(); // 0-indexed

        mesesNomes.forEach((nomeMes, mesIndex) => {
            const mesBox = document.createElement("div");
            mesBox.classList.add("mes-box");

            const pagamentosDoMes = pagamentosDoAnoExibido[mesIndex] || [];
            const totalPagoNoMes = pagamentosDoMes.reduce((soma, p) => soma + parseFloat(p.valor || 0), 0);
            // PADRONIZADO: usando valorMensal
            const valorMensalDevido = parseFloat(filho.valorMensal); 

            let statusMesClass = "";
            // Só aplica status se o ano é passado ou o ano atual e o mês já passou ou é o mês atual
            if (yearToDisplay < anoAtual || (yearToDisplay === anoAtual && mesIndex <= mesAtual)) {
                if (totalPagoNoMes >= valorMensalDevido) {
                    statusMesClass = "pago-completo";
                } else if (totalPagoNoMes > 0) {
                    statusMesClass = "pago-parcial";
                } else {
                    statusMesClass = "nao-pago";
                }
            } else {
                statusMesClass = "futuro"; // Para meses futuros, sem status de dívida
            }

            if (statusMesClass) {
                mesBox.classList.add(statusMesClass);
            }

            mesBox.innerHTML = `
                <div class="mes-nome">${nomeMes} ${yearToDisplay}</div>
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

        // Adiciona/reatualiza os listeners para os novos elementos criados
        addFilhoContentEventListeners(filhoContentDiv);

        // Atualiza o estado do checkbox de habilitação do ano e seus textos descritivos
        const enableYearCheckbox = filhoContentDiv.querySelector('.enable-year-checkbox');
        const isYearEnabled = filho.anosCalculoHabilitados.includes(yearToDisplay);
        if (enableYearCheckbox) {
            enableYearCheckbox.checked = isYearEnabled;
            // Garante que o listener seja adicionado apenas uma vez por checkbox visível
            enableYearCheckbox.removeEventListener('change', handleEnableYearChange);
            enableYearCheckbox.addEventListener('change', handleEnableYearChange);
            enableYearCheckbox.closest('label').querySelector('.display-year-for-toggle').textContent = yearToDisplay;
            enableYearCheckbox.closest('label').querySelector('.display-name-for-toggle').textContent = filho.nome;
        }

         // Atualiza o texto do botão "Esconder/Mostrar Meses"
        const toggleButton = filhoContentDiv.querySelector('.toggle-meses-btn');
        if (toggleButton) {
            // Verifica se mesesGrid existe antes de verificar sua classe
            const mesesGridCheck = filhoContentDiv.querySelector('.meses-grid');
            toggleButton.textContent = mesesGridCheck && mesesGridCheck.classList.contains('hidden') ? `Mostrar Meses (${yearToDisplay})` : `Esconder Meses (${yearToDisplay})`;
        }
    }

    /**
     * Ativa uma aba de filho específica, mostrando seu conteúdo e atualizando o estado global.
     * @param {number} filhoIndex O índice do filho a ser ativado.
     */
    function activateTab(filhoIndex) {
        if (filhoIndex < 0 || filhoIndex >= filhosDoUsuario.length) return;

        // Remove a classe 'active' de todas as abas e conteúdos
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.filho-content').forEach(content => content.classList.remove('active'));

        // Adiciona a classe 'active' ao botão da aba e ao conteúdo selecionado
        const selectedTabButton = document.querySelector(`.tab-button[data-filho-index="${filhoIndex}"]`);
        const selectedFilhoContent = document.getElementById(`filho-${filhoIndex}-content`);

        if (selectedTabButton) selectedTabButton.classList.add('active');
        if (selectedFilhoContent) selectedFilhoContent.classList.add('active');

        // Atualiza as variáveis de estado globais
        currentFilhoIndex = filhoIndex;
        currentFilhoDocId = filhosDoUsuario[filhoIndex].id;

        // Atualiza o ano de exibição atual baseado no que está no display do filho ativo
        currentYearToDisplay = selectedFilhoContent.querySelector('.current-year') ?
                                parseInt(selectedFilhoContent.querySelector('.current-year').textContent.replace('Ano: ', '')) :
                                new Date().getFullYear();

        // Re-renderiza os meses para o filho ativo para garantir que os listeners estejam corretos
        // e que o ano de exibição esteja consistente.
        renderizarMesesParaFilho(filhosDoUsuario[currentFilhoIndex], selectedFilhoContent, currentYearToDisplay, currentFilhoIndex);

        // Atualiza o texto do botão de toggle de meses para o ano correto
        const toggleButton = selectedFilhoContent.querySelector('.toggle-meses-btn');
        const mesesGrid = selectedFilhoContent.querySelector('.meses-grid');
        if (toggleButton && mesesGrid) {
             toggleButton.textContent = mesesGrid.classList.contains('hidden') ? `Mostrar Meses (${currentYearToDisplay})` : `Esconder Meses (${currentYearToDisplay})`;
        }

        // Atualiza os anos e nomes no checkbox de habilitação
        const displayYearForToggle = selectedFilhoContent.querySelector('.display-year-for-toggle');
        if(displayYearForToggle) displayYearForToggle.textContent = currentYearToDisplay;
        const displayNameForToggle = selectedFilhoContent.querySelector('.display-name-for-toggle');
        if(displayNameForToggle) displayNameForToggle.textContent = filhosDoUsuario[currentFilhoIndex].nome;
    }

    /**
     * Adiciona todos os event listeners dinâmicos para um bloco de conteúdo de filho.
     * Isso é chamado após a renderização ou re-renderização do conteúdo do filho.
     * @param {HTMLElement} filhoContentDiv O div de conteúdo do filho.
     */
    function addFilhoContentEventListeners(filhoContentDiv) {
        // Botão de toggle meses
        filhoContentDiv.querySelectorAll('.toggle-meses-btn').forEach(button => {
            button.removeEventListener('click', toggleMeses); // Remove para evitar duplicação
            button.addEventListener('click', toggleMeses);
        });

        // Botões de Adicionar Pagamento
        filhoContentDiv.querySelectorAll('.adicionar-pagamento').forEach(button => {
            button.removeEventListener('click', adicionarPagamentoHandler);
            button.addEventListener('click', adicionarPagamentoHandler);
        });

        // Botões de Editar Pagamento
        filhoContentDiv.querySelectorAll('.btn-editar-pagamento').forEach(button => {
            button.removeEventListener('click', editarPagamentoHandler);
            button.addEventListener('click', editarPagamentoHandler);
        });

        // Botões de Excluir Pagamento
        filhoContentDiv.querySelectorAll('.btn-excluir-pagamento').forEach(button => {
            button.removeEventListener('click', excluirPagamentoHandler);
            button.addEventListener('click', excluirPaguirPagamentoHandler);
        });

        // Botões de Navegação de Ano
        filhoContentDiv.querySelectorAll('.prev-year-btn, .next-year-btn').forEach(button => {
            button.removeEventListener('click', handleYearNavigation);
            button.addEventListener('click', handleYearNavigation);
        });
        
        // Checkbox de Habilitar Ano para Cálculo
        filhoContentDiv.querySelectorAll('.enable-year-checkbox').forEach(checkbox => {
            checkbox.removeEventListener('change', handleEnableYearChange);
            checkbox.addEventListener('change', handleEnableYearChange);
        });
    }

    /**
     * Lida com a navegação entre os anos (anterior/próximo).
     * @param {Event} e O evento de clique.
     */
    async function handleYearNavigation(e) {
        const filhoIndex = parseInt(e.currentTarget.dataset.filhoIndex);
        const filhoAtual = filhosDoUsuario[filhoIndex];
        const filhoContentDiv = document.getElementById(`filho-${filhoIndex}-content`);
        let yearInViewElement = filhoContentDiv.querySelector('.current-year');
        let yearInView = parseInt(yearInViewElement.textContent.replace('Ano: ', ''));

        if (e.currentTarget.classList.contains('prev-year-btn')) {
            yearInView--;
        } else if (e.currentTarget.classList.contains('next-year-btn')) {
            yearInView++;
        }

        yearInViewElement.textContent = `Ano: ${yearInView}`;
        currentYearToDisplay = yearInView; // Atualiza o ano atual globalmente para o filho ativo
        renderizarMesesParaFilho(filhoAtual, filhoContentDiv, yearInView, filhoIndex);

        // Atualiza o estado do checkbox de habilitação do ano e seus textos descritivos
        const enableYearCheckbox = filhoContentDiv.querySelector('.enable-year-checkbox');
        if (enableYearCheckbox) {
            enableYearCheckbox.checked = filhoAtual.anosCalculoHabilitados.includes(yearInView);
            enableYearCheckbox.closest('label').querySelector('.display-year-for-toggle').textContent = yearInView;
            enableYearCheckbox.closest('label').querySelector('.display-name-for-toggle').textContent = filhoAtual.nome;
        }

        // Atualiza o texto do botão "Esconder/Mostrar Meses"
        const toggleButton = filhoContentDiv.querySelector('.toggle-meses-btn');
        // Verifica se mesesGrid existe antes de verificar sua classe
        const mesesGridCheck = filhoContentDiv.querySelector('.meses-grid');
        if (toggleButton && mesesGridCheck) {
            toggleButton.textContent = mesesGridCheck.classList.contains('hidden') ? `Mostrar Meses (${yearInView})` : `Esconder Meses (${yearInView})`;
        }
    }

    /**
     * Lida com a mudança do checkbox de habilitação de ano para cálculo de dívida.
     * @param {Event} e O evento de mudança do checkbox.
     */
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
                    filho.anosCalculoHabilitados.sort((a, b) => a - b); // Mantém anos em ordem
                    await salvarFilhoNoFirestore(filho);
                    atualizarMontanteDevedorDisplay(filhoIndex);
                }
            } else {
                e.target.checked = false; // Reverte o estado do checkbox se o usuário cancelar
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
                e.target.checked = true; // Reverte o estado do checkbox se o usuário cancelar
            }
        }
    }

    /**
     * Atualiza o display do montante devedor para um filho específico.
     * @param {number} filhoIndex O índice do filho.
     */
    function atualizarMontanteDevedorDisplay(filhoIndex) {
        const filho = filhosDoUsuario[filhoIndex];
        const { totalDevido, status } = calcularMontanteDevido(filho);
        const filhoContentDiv = document.getElementById(`filho-${filhoIndex}-content`);
        const montanteDevedorElem = filhoContentDiv.querySelector('.montante-devedor');

        if (montanteDevedorElem) { // Garante que o elemento exista
            montanteDevedorElem.textContent = `Montante Devedor: R$ ${totalDevido.toFixed(2).replace('.', ',')}`;
            montanteDevedorElem.classList.remove('verde', 'amarelo', 'vermelho'); // Remove todas as classes de status
            montanteDevedorElem.classList.add(status); // Adiciona a classe de status correta
        }
    }

    /**
     * Alterna a visibilidade do grid de meses.
     */
    function toggleMeses() {
        const mesesGrid = this.closest('.filho-bloco').querySelector('.meses-grid');
        if (mesesGrid) {
            mesesGrid.classList.toggle('hidden');
            const filhoContentDiv = this.closest('.filho-content');
            const yearDisplay = filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', '');
            this.textContent = mesesGrid.classList.contains('hidden') ? `Mostrar Meses (${yearDisplay})` : `Esconder Meses (${yearDisplay})`;
        }
    }

    /**
     * Abre o modal de pagamento para adicionar ou editar.
     * @param {number} filhoIndexParaModal O índice do filho.
     * @param {number} mesIdx O índice do mês (0-11).
     * @param {number} anoPagamento O ano do pagamento.
     * @param {number} [pagamentoIdx=-1] O índice do pagamento a ser editado (se for edição).
     */
    function openModal(filhoIndexParaModal, mesIdx, anoPagamento, pagamentoIdx = -1) {
        // Atualiza as variáveis de estado globais do modal
        currentFilhoIndex = parseInt(filhoIndexParaModal);
        currentFilhoDocId = filhosDoUsuario[currentFilhoIndex].id; // Doc ID do filho
        currentMesIndex = parseInt(mesIdx);
        currentYearToDisplay = parseInt(anoPagamento);
        currentPagamentoIndex = parseInt(pagamentoIdx);

        modalValorInput.value = ''; // Limpa os campos do formulário
        modalDataInput.value = '';
        modalDataInput.classList.remove('invalid'); // Remove qualquer estilo de validação

        // Se for edição de pagamento, preenche os campos do modal
        if (currentPagamentoIndex !== -1) {
            const filho = filhosDoUsuario[currentFilhoIndex];
            const pagamento = filho.pagamentos[currentYearToDisplay][currentMesIndex][currentPagamentoIndex];
            modalValorInput.value = pagamento.valor;
            modalDataInput.value = pagamento.data;
            pagamentoModal.querySelector('h2').textContent = 'Editar Pagamento';
        } else {
            pagamentoModal.querySelector('h2').textContent = 'Registrar Pagamento';
        }
        pagamentoModal.style.display = 'flex'; // Exibe o modal
    }

    /**
     * Fecha o modal de pagamento e reseta as variáveis de estado.
     */
    function closeModal() {
        pagamentoModal.style.display = 'none';
        currentFilhoIndex = -1;
        currentFilhoDocId = null;
        currentMesIndex = -1;
        currentYearToDisplay = new Date().getFullYear(); // Reseta para o ano atual
        currentPagamentoIndex = -1;
        pagamentoForm.reset(); // Reseta o formulário
    }

    // Event listeners para o modal
    closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        if (event.target === pagamentoModal) { // Fecha o modal se clicar fora dele
            closeModal();
        }
    });

    /**
     * Formata a entrada de data para DD/MM/AAAA.
     * @param {HTMLInputElement} input O elemento input da data.
     */
    function formatarDataInput(input) {
        let value = input.value.replace(/\D/g, ''); // Remove tudo que não é dígito
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
        this.classList.remove('invalid'); // Remove a validação ao digitar
    });

    /**
     * Valida se uma string de data está no formato DD/MM/AAAA e é uma data real.
     * @param {string} dateString A string de data.
     * @returns {boolean} True se a data for válida, false caso contrário.
     */
    function isValidDate(dateString) {
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false; // Verifica o formato DD/MM/AAAA
        const parts = dateString.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        // Cria um objeto Date. O mês é 0-indexed no construtor Date.
        const date = new Date(year, month - 1, day);

        // Verifica se os valores obtidos do objeto Date correspondem aos valores originais,
        // garantindo que não houve "rolagem" de data (ex: 31 de fevereiro vira 2 de março).
        return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
    }

    /**
     * Handler para o clique no botão "Adicionar Pagamento".
     * Abre o modal de pagamento para um novo registro.
     * @param {Event} e O evento de clique.
     */
    function adicionarPagamentoHandler(e) {
        const filhoIndex = e.currentTarget.dataset.filhoIndex;
        const mesIndex = e.currentTarget.dataset.mesIndex;
        const anoPagamento = e.currentTarget.dataset.ano;
        openModal(filhoIndex, mesIndex, anoPagamento);
    }

    /**
     * Handler para o clique no botão "Editar Pagamento".
     * Abre o modal de pagamento preenchido para edição.
     * @param {Event} e O evento de clique.
     */
    function editarPagamentoHandler(e) {
        const filhoIndex = e.currentTarget.dataset.filhoIndex;
        const mesIndex = e.currentTarget.dataset.mesIndex;
        const pagamentoIndex = e.currentTarget.dataset.pagamentoIndex;
        const anoPagamento = e.currentTarget.dataset.ano;
        openModal(filhoIndex, mesIndex, anoPagamento, pagamentoIndex);
    }

    /**
     * Handler para o clique no botão "Excluir Pagamento".
     * Remove o pagamento e atualiza a interface e o Firestore.
     * @param {Event} e O evento de clique.
     */
    async function excluirPagamentoHandler(e) {
        const filhoIndex = parseInt(e.currentTarget.dataset.filhoIndex);
        const mesIndex = parseInt(e.currentTarget.dataset.mesIndex);
        const pagamentoIndex = parseInt(e.currentTarget.dataset.pagamentoIndex);
        const anoPagamento = parseInt(e.currentTarget.dataset.ano);

        if (confirm("Tem certeza que deseja excluir este pagamento?")) {
            const filho = filhosDoUsuario[filhoIndex];
            
            // Remove o pagamento do array interno do filho
            filho.pagamentos[anoPagamento][mesIndex].splice(pagamentoIndex, 1);
            
            // Salva a estrutura atualizada do filho no Firestore
            await salvarFilhoNoFirestore(filho);

            // Re-renderiza a seção de meses para refletir a mudança
            const filhoContentDiv = document.getElementById(`filho-${filhoIndex}-content`);
            const yearInView = parseInt(filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', ''));
            renderizarMesesParaFilho(filho, filhoContentDiv, yearInView, filhoIndex);
            // Atualiza o montante devedor geral
            atualizarMontanteDevedorDisplay(filhoIndex);

            // alert("Pagamento excluído."); // feedback visual mais suave é preferível
        }
    }

    /**
     * Lida com o submit do formulário de pagamento (adicionar/editar).
     * @param {Event} e O evento de submit.
     */
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

        // Garante que a estrutura de pagamentos para o ano e mês existe
        if (!filho.pagamentos[currentYearToDisplay]) {
            filho.pagamentos[currentYearToDisplay] = Array(12).fill().map(() => []);
        }
        if (!filho.pagamentos[currentYearToDisplay][currentMesIndex]) {
            filho.pagamentos[currentYearToDisplay][currentMesIndex] = [];
        }

        // Adiciona ou atualiza o pagamento
        if (currentPagamentoIndex !== -1) {
            filho.pagamentos[currentYearToDisplay][currentMesIndex][currentPagamentoIndex] = {
                valor: valor,
                data: data
            };
            // alert("Pagamento atualizado com sucesso!"); // feedback visual mais suave é preferível
        } else {
            filho.pagamentos[currentYearToDisplay][currentMesIndex].push({
                valor: valor,
                data: data
            });
            // alert(`Pagamento de R$ ${valor.toFixed(2)} em ${data} adicionado.`); // feedback visual mais suave é preferível
        }

        // Salva as alterações no Firestore
        await salvarFilhoNoFirestore(filho);

        // Re-renderiza a seção de meses para refletir a mudança
        const filhoContentDiv = document.getElementById(`filho-${currentFilhoIndex}-content`);
        const yearInView = parseInt(filhoContentDiv.querySelector('.current-year').textContent.replace('Ano: ', ''));
        renderizarMesesParaFilho(filho, filhoContentDiv, yearInView, currentFilhoIndex);
        // Atualiza o montante devedor geral
        atualizarMontanteDevedorDisplay(currentFilhoIndex);

        closeModal(); // Fecha o modal
    });

    // Inicia o carregamento da gestão quando o estado de autenticação muda.
    // Isso garante que a página só é renderizada para usuários logados.
    auth.onAuthStateChanged((user) => {
        if (user) {
            renderizarGestaoCompleta();
        } else {
            // O common.js já lida com redirecionamento de pages protegidas.
            // Aqui apenas garantimos que se por algum motivo auth.currentUser estiver nulo,
            // o usuário será redirecionado para a página inicial.
            console.warn("Usuário não autenticado na página de gestão. Redirecionando.");
            window.location.href = "index.html"; 
        }
    });
});
