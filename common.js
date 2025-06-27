// common.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js"; // Importa doc e getDoc

// Suas credenciais do Firebase - PREENCHIDAS
const firebaseConfig = {
    apiKey: "AIzaSyADrEtzjmdX5A2yq_S5Hp0QzojAgWlClU4",
    authDomain: "pensaoemdiaapp.firebaseapp.com",
    projectId: "pensaoemdiaapp",
    storageBucket: "pensaoemdiaapp.firebasestorage.app",
    messagingSenderId: "322478168070",
    appId: "1:322478168070:web:494318199ac307c7868b87",
    measurementId: "G-WZ5ZGMWJJH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", function() {
    const nomeUsuarioLogado = document.getElementById("nomeUsuarioLogado");
    const logoutBtn = document.getElementById("logoutBtn");

    onAuthStateChanged(auth, async (user) => { // Tornar a função async
        const currentPath = window.location.pathname;

        if (user) {
            // Usuário está logado
            if (nomeUsuarioLogado) {
                // Tenta buscar o nome do usuário no Firestore
                const userProfileRef = doc(db, "users", user.uid, "profile", "data");
                try {
                    const docSnap = await getDoc(userProfileRef);
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        nomeUsuarioLogado.textContent = `Olá, ${userData.nome}!`; // Exibe o nome
                    } else {
                        console.warn("Documento de perfil do usuário não encontrado no Firestore.");
                        nomeUsuarioLogado.textContent = `Olá, ${user.email}!`; // Fallback para email
                    }
                } catch (error) {
                    console.error("Erro ao buscar perfil do usuário:", error);
                    nomeUsuarioLogado.textContent = `Olá, ${user.email}!`; // Fallback para email em caso de erro
                }
            }

            if (currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('/cadastro.html')) {
                window.location.href = "gestao.html";
            }
        } else {
            // Usuário NÃO está logado
            if (nomeUsuarioLogado) {
                nomeUsuarioLogado.textContent = "";
            }
            if (!currentPath.endsWith('/index.html') && !currentPath.endsWith('/cadastro.html')) {
                window.location.href = "index.html";
            }
            localStorage.removeItem("usuarioLogadoEmail");
            localStorage.removeItem("filhosPorUsuario");
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                localStorage.removeItem("usuarioLogadoEmail");
                localStorage.removeItem("filhosPorUsuario");
                window.location.href = "index.html";
            }).catch((error) => {
                console.error("Erro ao fazer logout:", error);
                alert("Erro ao fazer logout. Tente novamente.");
            });
        });
    }
});
