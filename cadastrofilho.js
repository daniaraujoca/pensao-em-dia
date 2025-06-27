document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formCadastro");
    const listaFilhos = document.getElementById("listaFilhos");
    let editandoIndex = null; // Mantém o controle do índice do filho sendo editado

    // OBS: A verificação de login foi movida para common.js.
    // Manter aqui apenas a lógica específica da página de cadastro de filhos.
    const usuarioLogadoEmail = localStorage.getItem("usuarioLogadoEmail");

    const getFilhosDoUsuario = () => {
        const filhosPorUsuario = JSON.parse(localStorage.getItem("filhosPorUsuario")) || {};
        return filhosPorUsuario[usuarioLogadoEmail] || [];
    };

    const salvarFilhosDoUsuario = (filhos) => {
        const filhosPorUsuario = JSON.parse(localStorage.getItem("filhosPorUsuario")) || {};
        filhosPorUsuario[usuarioLogadoEmail] = filhos;
        localStorage.setItem("filhosPorUsuario", JSON.stringify(filhosPorUsuario));
    };

    // Carrega os filhos do usuário logado ao iniciar
    let filhos = getFilhosDoUsuario();

    const formatarData = (dataISO) => {
        if (!dataISO) return "";
        const [ano, mes, dia] = dataISO.split("-");
        return `${dia}/${mes}/${ano}`;
    };

    const renderizarFilhos = () => {
        listaFilhos.innerHTML = ""; // Limpa a lista antes de renderizar

        if (filhos.length === 0) {
            listaFilhos.innerHTML = '<div class="sem-filhos">Nenhum filho cadastrado ainda.</div>';
            return;
        }

        filhos.forEach((filho, index) => {
            const div = document.createElement("div");
            div.className = "filho-item";
            div.innerHTML = `
                <div class="info-filho">
                    <strong>${filho.nome}</strong>
                    <span>Sexo: ${filho.sexo}</span>
                    <span>Nascimento: ${formatarData(filho.dataNascimento)}</span>
                    <span>Pensão: R$ ${Number(filho.valorPensao).toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="botoes-acao">
                    <button class="btn-editar" data-index="${index}">Editar</button>
                    <button class="btn-excluir" data-index="${index}">Excluir</button>
                </div>
            `;
            listaFilhos.appendChild(div);
        });

        // Adiciona event listeners aos botões de editar e excluir
        document.querySelectorAll(".btn-editar").forEach(btn => {
            btn.addEventListener("click", (e) => editarFilho(e.target.dataset.index));
        });

        document.querySelectorAll(".btn-excluir").forEach(btn => {
            btn.addEventListener("click", (e) => excluirFilho(e.target.dataset.index));
        });
    };

    const editarFilho = (index) => {
        const filho = filhos[index];
        document.getElementById("nomeFilho").value = filho.nome;
        document.getElementById("sexoFilho").value = filho.sexo;
        document.getElementById("dataNascimentoFilho").value = filho.dataNascimento;
        document.getElementById("valorPensaoFilho").value = filho.valorPensao;
        document.getElementById("indiceEdicao").value = index; // Armazena o índice para edição
        editandoIndex = index; // Atualiza a variável de controle

        // Scroll para o formulário e foca no primeiro campo
        document.querySelector(".form-section").scrollIntoView({ behavior: "smooth" });
        document.getElementById("nomeFilho").focus();
    };

    const excluirFilho = (index) => {
        if (confirm("Tem certeza que deseja excluir este filho?")) {
            filhos.splice(index, 1); // Remove o filho do array
            salvarFilhosDoUsuario(filhos); // Salva o array atualizado no localStorage
            renderizarFilhos(); // Renderiza a lista novamente

            // Se o item excluído era o que estava sendo editado, reseta o formulário
            if (editandoIndex === Number(index)) { // Comparar como número
                form.reset();
                document.getElementById("indiceEdicao").value = "";
                editandoIndex = null;
            }
        }
    };

    // Event listener para o envio do formulário
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const novoFilho = {
            nome: document.getElementById("nomeFilho").value.trim(),
            sexo: document.getElementById("sexoFilho").value,
            dataNascimento: document.getElementById("dataNascimentoFilho").value,
            valorPensao: parseFloat(document.getElementById("valorPensaoFilho").value).toFixed(2),
            // Inicializa a estrutura de pagamentos para 12 meses, cada um com um array vazio
            // Isso é importante para a página de gestão
            pagamentos: Array(12).fill().map(() => [])
        };

        const index = document.getElementById("indiceEdicao").value;

        if (index === "") { // Se o índice de edição estiver vazio, é um novo cadastro
            filhos.push(novoFilho);
        } else { // Caso contrário, é uma edição
            // Preserva os pagamentos existentes ao editar
            novoFilho.pagamentos = filhos[index].pagamentos || Array(12).fill().map(() => []);
            filhos[index] = novoFilho;
        }

        salvarFilhosDoUsuario(filhos); // Salva os filhos atualizados
        form.reset(); // Limpa o formulário
        document.getElementById("indiceEdicao").value = ""; // Reseta o campo de índice de edição
        editandoIndex = null; // Reseta a variável de controle
        renderizarFilhos(); // Atualiza a lista exibida

        // Mensagem de feedback
        const feedback = document.createElement("div");
        feedback.className = "feedback-message";
        feedback.textContent = index === "" ? "Filho cadastrado com sucesso!" : "Filho atualizado com sucesso!";
        form.appendChild(feedback);

        setTimeout(() => feedback.remove(), 3000); // Remove a mensagem após 3 segundos
    });

    // Renderiza a lista de filhos ao carregar a página
    renderizarFilhos();
});