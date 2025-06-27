const CACHE_NAME = 'pensao-em-dia-cache-v1';
const urlsToCache = [
  './', // Representa a raiz do seu aplicativo (ex: /pensao-em-dia/)
  './index.html',
  './cadastro.html',
  './cadastrofilho.html',
  './dicas.html',
  './gestao.html',
  './style.css',
  './login.js',
  './cadastro.js',
  './cadastrofilho.js',
  './gestao.js',
  './common.js',
  // Se 'script.js' não existir ou não for usado, você pode removê-lo.
  // Assumi que você o mencionou em gestao.html e mantive aqui.
  './script.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// Evento de instalação: instala o Service Worker e guarda os assets no cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de fetch: intercepta requisições e serve do cache, se disponível
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retorna a resposta do cache
        if (response) {
          return response;
        }
        // Não está no cache - busca na rede
        return fetch(event.request);
      })
  );
});

// Evento de ativação: limpa caches antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName); // Deleta caches antigos
          }
        })
      );
    })
  );
});
