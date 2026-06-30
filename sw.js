

const NOME_CACHE = 'lie-accessories-v1';

const ARQUIVOS_PARA_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/offline.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Lato:wght@300;400;700&display=swap',
];


self.addEventListener('install', (evento) => {
  console.log('[SW] Instalando Service Worker...');

  evento.waitUntil(
    caches.open(NOME_CACHE).then((cache) => {
      console.log('[SW] Salvando arquivos no cache...');
      return cache.addAll(ARQUIVOS_PARA_CACHE);
    })
  );

  self.skipWaiting();
});


self.addEventListener('activate', (evento) => {
  console.log('[SW] Service Worker ativado!');

  evento.waitUntil(
    caches.keys().then((nomes_cache) => {
      return Promise.all(
        nomes_cache.map((nome) => {
          if (nome !== NOME_CACHE) {
            console.log('[SW] Removendo cache antigo:', nome);
            return caches.delete(nome);
          }
        })
      );
    })
  );

  self.clients.claim();
});


self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);


  if (
    evento.request.destination === 'style' ||
    evento.request.destination === 'script' ||
    evento.request.destination === 'font' ||
    evento.request.destination === 'image'
  ) {
    evento.respondWith(estrategiaCacheFirst(evento.request));
    return;
  }

  if (url.pathname.includes('/wp-json/wc/')) {
    evento.respondWith(estrategiaNetworkFirst(evento.request));
    return;
  }

  if (evento.request.mode === 'navigate') {
    evento.respondWith(estrategiaPaginas(evento.request));
    return;
  }

  evento.respondWith(fetch(evento.request));
});


async function estrategiaCacheFirst(requisicao) {
  const respostaCache = await caches.match(requisicao);

  if (respostaCache) {
    return respostaCache;
  }

  try {
    const respostaRede = await fetch(requisicao);
    const cache = await caches.open(NOME_CACHE);
    cache.put(requisicao, respostaRede.clone());
    return respostaRede;
  } catch (erro) {
    console.log('[SW] Sem cache e sem rede para:', requisicao.url);
  }
}


async function estrategiaNetworkFirst(requisicao) {
  try {
    const respostaRede = await fetch(requisicao);
    const cache = await caches.open(NOME_CACHE);
    cache.put(requisicao, respostaRede.clone());
    return respostaRede;
  } catch (erro) {
    const respostaCache = await caches.match(requisicao);
    if (respostaCache) {
      return respostaCache;
    }
  }
}


async function estrategiaPaginas(requisicao) {
  try {
    return await fetch(requisicao);
  } catch (erro) {
    const respostaCache = await caches.match(requisicao);
    if (respostaCache) {
      return respostaCache;
    }
    return caches.match('/offline.html');
  }
}