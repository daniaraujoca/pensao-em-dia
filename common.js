// common.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Sua configuração do Firebase (substituída pelos seus dados reais)
const firebaseConfig = {
  apiKey: "AIzaSyADrEtzjmdX5A2yq_S5Hp0QzojAgWlClU4",
  authDomain: "pensaoemdiaapp.firebaseapp.com",
  projectId: "pensaoemdiaapp",
  storageBucket: "pensaoemdiaapp.firebasestorage.app",
  messagingSenderId: "322478168070",
  appId: "1:322478168070:web:494318199ac307c7868b87",
  measurementId: "G-WZ5ZGMWJJH"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Exporta as instâncias para serem usadas em outros módulos
export { app, auth, db };

// Função para verificar o estado da autenticação e gerenciar o perfil do usuário
// Esta função agora GARANTE que o perfil do usuário existe no Firestore
auth.onAuthStateChanged(async (user) => {
    const navLinks = document.getElementById("navLinks");
    const loginLink = document.getElementById("loginLink");
    const logoutLink = document.getElementById("logoutLink");

    if (user) {
        // Usuário logado
        if (loginLink) loginLink.style.display = "none";
        if (logoutLink) logoutLink.style.display = "block";
        if (navLinks) navLinks.classList.add("logged-in"); // Adiciona classe para estilizar links logado

        const userProfileRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(userProfileRef);

            if (!docSnap.exists()) {
                // Se o documento do perfil do usuário NÃO EXISTE, cria um
                console.warn("Documento de perfil do usuário não encontrado no Firestore. Criando agora...");
                await setDoc(userProfileRef, {
                    email: user.email,
                    createdAt: new Date(), // Adiciona um timestamp de criação
                    // Você pode adicionar outros campos iniciais aqui se necessário
                }, { merge: true }); // Use merge:true para não sobrescrever acidentalmente se o documento for criado externamente.
                console.log("Documento de perfil do usuário criado com sucesso para:", user.email);
            } else {
                console.log("Documento de perfil do usuário encontrado:", docSnap.data().email);
            }

            // Lógica para redirecionar páginas protegidas
            const protectedPages = ["dashboard.html", "gestao.html", "cadastrofilho.html", "dicas.html", "perfil.html"];
            const currentPage = window.location.pathname.split("/").pop(); // Obtém o nome do arquivo atual

            if (protectedPages.includes(currentPage) && window.location.href.includes("index.html?logout=true")) {
                // Caso especial: se o usuário acabou de fazer logout e está em uma página protegida, redireciona para a home
                window.location.href = "index.html";
            }
            // Se o usuário está logado e em uma página que *não deveria* acessar logado (ex: login/registro)
            // if (currentPage === "index.html" || currentPage === "registro.html") {
            //     window.location.href = "dashboard.html"; // Redireciona para o dashboard
            // }

        } catch (e) {
            console.error("Erro ao gerenciar o perfil do usuário no Firestore:", e);
            alert("Ocorreu um erro ao carregar seu perfil. Por favor, tente novamente ou entre em contato com o suporte.");
            signOut(auth); // Força o logout se houver um erro crítico
            window.location.href = "index.html";
        }

    } else {
        // Usuário deslogado
        if (loginLink) loginLink.style.display = "block";
        if (logoutLink) logoutLink.style.display = "none";
        if (navLinks) navLinks.classList.remove("logged-in");

        // Redireciona para a página inicial (ou login) se tentar acessar uma página protegida
        const protectedPages = ["dashboard.html", "gestao.html", "cadastrofilho.html", "dicas.html", "perfil.html"];
        const currentPage = window.location.pathname.split("/").pop();

        if (protectedPages.includes(currentPage) && currentPage !== "index.html") {
            console.warn(`Usuário não autenticado. Redirecionando de ${currentPage} para index.html`);
            window.location.href = "index.html";
        }
    }
});

// Lógica de Logout
if (document.getElementById("logoutLink")) {
    document.getElementById("logoutLink").addEventListener("click", async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            console.log("Usuário deslogado com sucesso!");
            // Adiciona um parâmetro para que o common.js saiba que foi um logout
            window.location.href = "index.html?logout=true";
        } catch (error) {
            console.error("Erro ao deslogar:", error);
            alert("Erro ao deslogar. Por favor, tente novamente.");
        }
    });
}
