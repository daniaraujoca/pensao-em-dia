// Importa as funções necessárias do Firestore
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function () {
    const auth = window.auth;
    const db = window.db;

    const filhoTabsContainer = document.getElementById("filhoTabs");
    const filhosContentContainer = document.getElementById("filhosContent");
    const pagamentoModal = document.getElementById("pagamentoModal");
    const closeButton = pagamentoModal.querySelector(".close-button");
    const pagamentoForm = document.getElementById("pagamentoForm");
    const modalValor = document.getElementById("modalValor");
    const modalData = document.getElementById("modalData");
    let currentFilhoId = null; // Para saber qual filho está sendo pago

    // Redireciona se não estiver logado
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = "./index.html";
        } else {
            loadFilhos(user.uid);
        }
    });

    closeButton.addEventListener("click", () => {
        pagamentoModal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
        if (event.target == pagamentoModal) {
            pagamentoModal.style.display = "none";
        }
    });

    // Função para carregar filhos do Firestore
    async function loadFilhos(userId) {
        filhoTabsContainer.innerHTML = "";
        filhosContentContainer.innerHTML = "";
        try {
            const q = query(collection(db, "filhos"), where("userId", "==", userId));
            const querySnapshot = await getDocs(q);
            const filhos = [];
            querySnapshot.forEach((doc) => {
                filhos.push({ id: doc.id, ...doc.data() });
            });

            if (filhos.length === 0) {
                filhosContentContainer.innerHTML = "<p>Nenhum filho cadastrado. <a href='./cadastrofilho.html'>Cadastre um filho</a> para começar.</p>";
                return;
            }

            filhos.forEach((filho, index) => {
                const tab = document.createElement("button");
                tab.classList.add("tab-button");
                tab.textContent = filho.nome;
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
    async function showFilhoDetails(filhoId, filhos) {
        filhoTabsContainer.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
        document.querySelector(`.tab-button:nth-child(${filhos.findIndex(f => f.id === filhoId) + 1})`).classList.add("active");

        const filho = filhos.find(f => f.id === filhoId);
        if (!filho) {
            filhosContentContainer.innerHTML = "<p>Detalhes do filho não encontrados.</p>";
            return;
        }

        let totalPago = filho.pagamentos ? filho.pagamentos.reduce((sum, p) => sum + p.valor, 0) : 0;
        let totalDevido = calcularTotalDevido(filho.valorMensal, filho.diaVencimento);
        let saldoDevedor = totalDevido - totalPago;

        filhosContentContainer.innerHTML = `
            <div class="filho-details">
                <h3>${filho.nome}</h3>
                <p>Data de Nascimento: ${filho.dataNascimento}</p>
                <p>Valor Mensal: R$ ${filho.valorMensal.toFixed(2)}</p>
                <p>Dia de Vencimento: Dia ${filho.diaVencimento}</p>
                <p>Total Devido: R$ ${totalDevido.toFixed(2)}</p>
                <p>Total Pago: R$ ${totalPago.toFixed(2)}</p>
                <p class="saldo ${saldoDevedor > 0 ? 'devedor' : 'em-dia'}">
                    Saldo Devedor: R$ ${saldoDevedor.toFixed(2)}
                </p>
                <button class="register-payment-btn" data-filho-id="${filho.id}">Registrar Pagamento</button>
                <button class="delete-filho-btn" data-filho-id="${filho.id}">Excluir Filho</button>

                <h4>Histórico de Pagamentos:</h4>
                <ul class="payment-history">
                    ${filho.pagamentos && filho.pagamentos.length > 0 ?
                        filho.pagamentos.map(p => `
                            <li>
                                R$ ${p.valor.toFixed(2)} em ${formatarData(p.data)}
                                <i class="fas fa-trash-alt delete-payment-icon" data-filho-id="${filho.id}" data-timestamp="${p.timestamp}"></i>
                            </li>
                        `).join('')
                        : '<li>Nenhum pagamento registrado ainda.</li>'
                    }
                </ul>
            </div>
        `;

        document.querySelector(".register-payment-btn").addEventListener("click", (e) => {
            currentFilhoId = e.target.dataset.filhoId;
            pagamentoModal.style.display = "block";
            modalValor.value = '';
            modalData.value = '';
        });

        document.querySelector(".delete-filho-btn").addEventListener("click", (e) => {
            const idParaDeletar = e.target.dataset.filhoId;
            if (confirm(`Tem certeza que deseja excluir ${filho.nome} e todos os seus pagamentos? Esta ação é irreversível.`)) {
                deleteFilho(idParaDeletar);
            }
        });

        document.querySelectorAll(".delete-payment-icon").forEach(icon => {
            icon.addEventListener("click", (e) => {
                const idFilho = e.target.dataset.filhoId;
                const timestampPagamento = parseInt(e.target.dataset.timestamp);
                if (confirm("Tem certeza que deseja excluir este pagamento?")) {
                    deletePagamento(idFilho, timestampPagamento);
                }
            });
        });
    }

    // Função para calcular o total devido até o mês atual
    function calcularTotalDevido(valorMensal, diaVencimento) {
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1; // Mês atual (1-12)

        // Assumindo que a pensão é devida desde o início do registro.
        // Em um app real, você teria uma "data de início da obrigação".
        // Para simplificar, vamos considerar a obrigação desde o início do ano atual
        // ou desde o mês de cadastro do filho, se for neste ano.
        let mesesDevidos = 0;
        for (let m = 1; m <= mesAtual; m++) {
            // Se o dia de hoje for maior ou igual ao dia de vencimento,
            // ou se o mês já passou, o mês é considerado devido.
            if (hoje.getDate() >= diaVencimento || m < mesAtual) {
                 mesesDevidos++;
            }
        }
        return mesesDevidos * valorMensal;
    }

    // Função para formatar data (DD/MM/AAAA)
    function formatarData(dataString) {
        const [ano, mes, dia] = dataString.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    // Adicionar novo pagamento
    pagamentoForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const valor = parseFloat(modalValor.value);
        const dataStr = modalData.value;

        // Validação básica da data no formato DD/MM/AAAA
        const regexData = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!regexData.test(dataStr)) {
            alert("Formato de data inválido. Use DD/MM/AAAA.");
            return;
        }

        const [dia, mes, ano] = dataStr.split('/').map(Number);
        const dataObjeto = new Date(ano, mes - 1, dia); // Mês é 0-indexed

        if (isNaN(valor) || valor <= 0) {
            alert("Por favor, insira um valor de pagamento válido.");
            return;
        }
        if (isNaN(dataObjeto.getTime())) {
             alert("Data inválida. Por favor, use DD/MM/AAAA.");
             return;
        }
        
        // Verifica se o ano da data de pagamento está dentro de um limite razoável (ex: ano atual ou ano anterior)
        const anoAtual = new Date().getFullYear();
        if (dataObjeto.getFullYear() < (anoAtual - 2) || dataObjeto.getFullYear() > (anoAtual + 1)) {
            alert("Por favor, insira uma data de pagamento mais recente ou válida.");
            return;
        }

        const novoPagamento = {
            valor: valor,
            data: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`, // Salva como YYYY-MM-DD
            timestamp: Date.now() // Timestamp para identificador único e ordenação
        };

        try {
            const filhoRef = doc(db, "filhos", currentFilhoId);
            await updateDoc(filhoRef, {
                pagamentos: arrayUnion(novoPagamento) // Adiciona o pagamento à array
            });

            alert("Pagamento registrado com sucesso!");
            pagamentoModal.style.display = "none";
            loadFilhos(auth.currentUser.uid); // Recarrega os dados para atualizar a interface

        } catch (error) {
            console.error("Erro ao registrar pagamento:", error);
            alert("Erro ao registrar pagamento. Tente novamente.");
        }
    });

    // Excluir pagamento
    async function deletePagamento(filhoId, timestampPagamento) {
        try {
            const filhoRef = doc(db, "filhos", filhoId);
            const filhoDoc = await getDocs(query(collection(db, "filhos"), where("__name__", "==", filhoId)));
            const filhoData = filhoDoc.docs[0].data();
            
            const pagamentosAtuais = filhoData.pagamentos || [];
            const pagamentoParaRemover = pagamentosAtuais.find(p => p.timestamp === timestampPagamento);

            if (pagamentoParaRemover) {
                await updateDoc(filhoRef, {
                    pagamentos: arrayRemove(pagamentoParaRemover) // Remove o pagamento específico da array
                });
                alert("Pagamento excluído com sucesso!");
                loadFilhos(auth.currentUser.uid); // Recarrega os dados
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
            loadFilhos(auth.currentUser.uid); // Recarrega os filhos
        } catch (error) {
            console.error("Erro ao excluir filho:", error);
            alert("Erro ao excluir filho. Tente novamente.");
        }
    }
});
