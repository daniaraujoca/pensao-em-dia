const CACHE_VERSION = 'v1';
const CACHE_NAME = 'pensao-em-dia-cache-' + CACHE_VERSION;

const urlsToCache = [
    './',
    './index.html',
    './login.js',
    './manifest.json',
    './recuperar-senha.html',
    './recuperar-senha.js',
    // './script.js', // REMOVIDO: Este arquivo não existe, conforme sua confirmação.
    './style.css',
    './cadastro.html',
    './cadastro.js',
    './cadastrofilho.html',
    './cadastrofilho.js',
    './cadastrousuario.html',
    './cadastrousuario.js',
    './common.js', // Incluir common.js no cache, pois é essencial
    './dicas.html',
    './gestao.html',
    './gestao.js',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // No cache hit - fetch from network
                return fetch(event.request).then(
                    (response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and can only be consumed once. We must consume the response
                        // once in the browser and once in the cache.
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});
