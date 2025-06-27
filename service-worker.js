const CACHE_NAME = 'pensao-em-dia-cache-v7'; // AUMENTE A VERSÃO AQUI para forçar a nova instalação
const urlsToCache = [
    './',
    './index.html',
    './cadastro.html',
    './cadastrofilho.html',
    './dicas.html',
    './gestao.html',
    './recuperar-senha.html',
    './style.css',
    './login.js',
    './cadastro.js',
    './cadastrofilho.js',
    './gestao.js',
    './common.js',
    './script.js', // VERIFIQUE ESTE ARQUIVO: ELE EXISTE? É USADO?
    './recuperar-senha.js',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Use Promise.all com cache.add para identificar a URL que falha
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(e => {
              console.error(`Falha ao cachear URL: ${url}`, e);
              throw e; // Lança o erro para que o install falhe e mostre no console
            });
          })
        );
      })
      .catch(error => {
        console.error('Falha geral na instalação do cache:', error);
      })
  );
});

// ... (o restante do seu service-worker.js permanece o mesmo)
