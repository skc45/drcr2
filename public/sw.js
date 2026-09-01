self.addEventListener('install', (event) => {
  event.waitUntil(caches.open('drcr2-expire-v1').then((c) => c.addAll(['/', '/index.html'])));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request))
  );
});
