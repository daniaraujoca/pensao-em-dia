// cadastrofilho.js

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formCadastro");
    const listaFilhosDiv = document.getElementById("listaFilhos"); // Alterado para evitar conflito com nome de variável
    const nomeFilhoInput = document.getElementById("nomeFilho");
    const sexoFilhoSelect = document.getElementById("sexoFilho");
    const dataNascimentoFilhoInput = document.getElementById("dataNascimentoFilho");
    const valorPensaoFilhoInput = document.getElementById("valorPensaoFilho");
    const childIdEdicaoInput = document.getElementById("childIdEdicao"); // Para armazenar o ID do filho em edição

    // Função auxiliar para formatar a data (opcional, apenas para exibição)
    const formatarDataParaExibicao = (dataISO) => {
        if (!dataISO) return "";
        const [ano, mes, dia] = dataISO.split("-");
        return `${dia}/${mes}/${ano}`;
    };

    // --- FUNÇÕES DE INTERAÇÃO COM O BACKEND (API) ---

    // Função para buscar e renderizar os filhos
    const buscarErenderizarFilhos = async () => {
        listaFilhosDiv.innerHTML = '<div class="carregando">Carregando filhos...</div>';
        try {
            const response = await fetch('/api/children', { method: 'GET' });
            if (!response.ok) {
                if (response.status === 401) {
                    alert("Sessão expirada ou não autorizado. Faça login novamente.");
                    window.location.href = './index.html'; // Redireciona para o login
                    return;
                }
                throw new Error('Falha ao buscar filhos: ' + response.statusText);
            }
            const filhos = await response.json(); // Seus filhos do banco de dados

            listaFilhosDiv.innerHTML = ""; // Limpa antes de renderizar

            if (filhos.length === 0) {
                listaFilhosDiv.innerHTML = '<div class="sem-filhos">Nenhum filho cadastrado ainda.</div>';
                return;
            }

            filhos.forEach(filho => {
                const div = document.createElement("div");
                div.className = "filho-item";
                div.innerHTML = `
                    <div class="info-filho">
                        <strong>${filho.full_name}</strong>
                        <span>Sexo: ${filho.gender}</span>
                        <span>Nascimento: ${formatarDataParaExibicao(filho.date_of_birth)}</span>
                        <span>Pensão: R$ ${Number(filho.monthly_alimony_value).toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div class="botoes-acao">
                        <button class="btn-editar" data-id="${filho.id}">Editar</button>
                        <button class="btn-excluir" data-id="${filho.id}">Excluir</button>
                    </div>
                `;
                listaFilhosDiv.appendChild(div);
            });

            // Adiciona event listeners aos botões de editar e excluir
            document.querySelectorAll(".btn-editar").forEach(btn => {
                btn.addEventListener("click", (e) => editarFilho(e.target.dataset.id));
            });

            document.querySelectorAll(".btn-excluir").forEach(btn => {
                btn.addEventListener("click", (e) => excluirFilho(e.target.dataset.id));
            });

        } catch (error) {
            console.error("Erro ao carregar filhos:", error);
            listaFilhosDiv.innerHTML = '<div class="erro-carregamento">Erro ao carregar filhos. Tente novamente.</div>';
        }
    };

    // Função para preencher o formulário para edição
    const editarFilho = async (childId) => {
        try {
            const response = await fetch(`/api/children/${childId}`, { method: 'GET' }); // Busca dados de um filho específico (você pode implementar essa rota GET /api/children/<id> no Flask se ainda não tiver)
            if (!response.ok) throw new Error('Falha ao buscar filho para edição: ' + response.statusText);
            const filho = await response.json();
            
            // Popula o formulário com os dados do filho
            nomeFilhoInput.value = filho.full_name;
            sexoFilhoSelect.value = filho.gender;
            dataNascimentoFilhoInput.value = filho.date_of_birth;
            valorPensaoFilhoInput.value = filho.monthly_alimony_value;
            childIdEdicaoInput.value = filho.id; // Armazena o ID do filho sendo editado

            // Scroll para o formulário e foca no primeiro campo
            document.querySelector(".form-section").scrollIntoView({ behavior: "smooth" });
            nomeFilhoInput.focus();

        } catch (error) {
            console.error("Erro ao carregar dados do filho para edição:", error);
            alert("Não foi possível carregar os dados do filho para edição.");
        }
    };

    // Função para excluir um filho
    const excluirFilho = async (childId) => {
        if (confirm("Tem certeza que deseja excluir este filho?")) {
            try {
                const response = await fetch(`/api/children/${childId}`, { method: 'DELETE' });
                if (!response.ok) {
                    if (response.status === 404) { // Filho não encontrado
                        alert("Filho não encontrado para exclusão.");
                    } else if (response.status === 401) { // Não autorizado
                        alert("Sessão expirada ou não autorizado. Faça login novamente.");
                        window.location.href = './index.html';
                        return;
                    }
                    throw new Error('Falha ao excluir filho: ' + response.statusText);
                }
                const data = await response.json();
                alert(data.message); // Exibe a mensagem de sucesso do backend
                buscarErenderizarFilhos(); // Recarrega a lista
                
                // Se o formulário estava em modo de edição para o filho excluído, reseta
                if (childIdEdicaoInput.value === String(childId)) {
                    form.reset();
                    childIdEdicaoInput.value = "";
                }

            } catch (error) {
                console.error("Erro ao excluir filho:", error);
                alert("Não foi possível excluir o filho. Tente novamente.");
            }
        }
    };

    // --- EVENT LISTENER DO FORMULÁRIO (ADICIONAR/EDITAR) ---
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const childId = childIdEdicaoInput.value; // Pega o ID (se estiver editando)

        const payload = {
            // Nomes das chaves aqui devem corresponder ao que o Flask espera (nomes das colunas do DB)
            full_name: nomeFilhoInput.value.trim(),
            gender: sexoFilhoSelect.value,
            date_of_birth: dataNascimentoFilhoInput.value,
            monthly_alimony_value: parseFloat(valorPensaoFilhoInput.value),
        };

        // Validação frontend básica (restaurada)
        if (!payload.full_name || !payload.gender || !payload.date_of_birth || isNaN(payload.monthly_alimony_value) || payload.monthly_alimony_value < 0) {
            alert("Por favor, preencha todos os campos corretamente.");
            return;
        }

        try {
            let response;
            let method;
            let url;

            if (childId) { // Se há um ID, é uma edição (PUT)
                method = 'PUT';
                url = `/api/children/${childId}`;
            } else { // Se não há ID, é um novo cadastro (POST)
                method = 'POST';
                url = '/api/children';
            }

            response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message); // Exibe a mensagem de sucesso do backend
                form.reset(); // Limpa o formulário
                childIdEdicaoInput.value = ""; // Reseta o campo de ID de edição
                buscarErenderizarFilhos(); // Recarrega a lista após sucesso
            } else {
                let errorMessage = data.message || "Ocorreu um erro. Tente novamente.";
                if (response.status === 401) { // Caso de não autorizado
                    errorMessage = "Sessão expirada ou não autorizado. Faça login novamente.";
                    window.location.href = './index.html';
                }
                alert(errorMessage);
                console.error("Erro no backend:", data.message);
            }
        } catch (error) {
            console.error("Erro na requisição:", error);
            alert("Não foi possível conectar ao servidor. Verifique sua conexão.");
        }
    });

    // --- CHAMA A FUNÇÃO PARA CARREGAR OS FILHOS AO INICIAR A PÁGINA ---
    buscarErenderizarFilhos();
});