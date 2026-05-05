// emoji is optional — when supplied it is prepended to the title for quick
// visual identification in the notification shade.
export async function fireNotification(title, body, emoji = '') {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return

  const displayTitle = emoji ? `${emoji} ${title}` : title

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      reg.showNotification(displayTitle, {
        body,
        icon:     '/icons/pwa-192x192.png',
        badge:    '/icons/badge-72.svg',
        tag:      title,        // collapses duplicates in the tray
        renotify: false,
      })
    } else {
      new Notification(displayTitle, { body, icon: '/icons/pwa-192x192.png' })
    }
  } catch (e) {
    console.warn('Notification failed', e)
  }
}
