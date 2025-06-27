// gestao.js
// ... (mantenha seus imports existentes e qualquer código ANTES da função getFilhosDoUsuarioFirestore)
// Importe aqui o que for necessário de common.js, ex: { auth, db }
import { auth, db } from "./common.js";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


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

        // --- INÍCIO DA CORREÇÃO PARA O ERRO DE NESTED ARRAYS ---
        const pagamentosParaSalvar = {};
        for (const ano in filho.pagamentos) {
            if (filho.pagamentos.hasOwnProperty(ano) && Array.isArray(filho.pagamentos[ano])) {
                // Para cada ano, achate o array de meses para um único array de pagamentos
                // O Firestore permite arrays de objetos, mas não arrays de arrays de objetos.
                // Então, transformamos [[pag1], [pag2, pag3], []] em [pag1, pag2, pag3]
                pagamentosParaSalvar[ano] = filho.pagamentos[ano].flat();
            }
        }
        // --- FIM DA CORREÇÃO PARA O ERRO DE NESTED ARRAYS ---

        try {
            // setDoc sobrescreve o documento, o que é adequado aqui já que estamos enviando o objeto filho completo.
            await setDoc(filhoDocRef, {
                nome: filho.nome,
                dataNascimento: filho.dataNascimento,
                valorMensal: filho.valorMensal, // <--- AQUI: PADRONIZADO para valorMensal
                diaVencimento: filho.diaVencimento, // Adicionado campo que estava faltando no save
                pagamentos: pagamentosParaSalvar, // Usamos a estrutura achatada aqui
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
                        // Importante: quando normalizando, aqui re-aninhamos os pagamentos de volta em arrays por mês
                        // Primeiro, achata todos os pagamentos existentes para aquele ano
                        const oldPagamentos = Array.isArray(filho.pagamentos[year]) ? filho.pagamentos[year].flat() : [];
                        
                        // Reinicializa com 12 arrays vazios para os meses
                        filho.pagamentos[year] = Array(12).fill().map(() => []); 
                        
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
                    } else {
                        // Se já é um array de 12 meses, precisamos garantir que cada "mês" é um array,
                        // e que não há arrays aninhados DENTRO dos arrays de meses.
                        // Isso é uma medida de segurança, caso dados antigos estejam mal formatados.
                        filho.pagamentos[year] = filho.pagamentos[year].map(monthArray => 
                            Array.isArray(monthArray) ? monthArray.flat() : []
                        );
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

            const pagamentosDoAno = filho.pagamentos[ano] || []; // Agora é um array plano para o ano
            // Precisamos agrupar estes pagamentos por mês novamente para o cálculo
            const pagamentosAgrupadosPorMes = Array(12).fill().map(() => []);
            pagamentosDoAno.forEach(p => {
                if (p && p.data) {
                    const pParts = p.data.split('/');
                    const pMonth = parseInt(pParts[1], 10) - 1;
                    if (pMonth >= 0 && pMonth < 12) {
                        pagamentosAgrupadosPorMes[pMonth].push(p);
                    }
                }
            });

            let limiteMes = 11; // Por padrão, calcula até Dezembro
            if (ano === anoAtual) {
                limiteMes = mesAtual; // Para o ano atual, calcula só até o mês atual
            }

            for (let mes = 0; mes <= limiteMes; mes++) {
                const pagamentosMes = pagamentosAgrupadosPorMes[mes] || [];
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

// ... (o restante do seu código, se houver)
