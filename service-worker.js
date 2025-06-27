const CACHE_NAME = 'pensao-em-dia-cache-v3'; // Aumente a versão para forçar atualização
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
  './script.js', 
  './recuperar-senha.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  // Adicionar as URLs dos SDKs do Firebase para cache offline (recomendado)
  'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js' // NOVO: Firestore SDK
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to cache:', error);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
