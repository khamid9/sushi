self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(self.registration.showNotification(payload.title || 'Новый заказ', {
    body: payload.body || 'Поступил новый заказ',
    icon: '/sushi-icon.svg',
    badge: '/sushi-icon.svg',
    tag: payload.tag || 'sushi-lab-order',
    data: { url: payload.url || '/admin?section=orders' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data.url || '/admin?section=orders', self.location.origin);
  if (target.origin !== self.location.origin) return;

  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    for (const windowClient of windows) {
      if (windowClient.url.startsWith(self.location.origin)) {
        return windowClient.navigate(target.href).then(() => windowClient.focus());
      }
    }
    return clients.openWindow(target.href);
  }));
});
