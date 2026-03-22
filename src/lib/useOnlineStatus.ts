import { createSignal } from 'solid-js';

const [isOnline, setIsOnline] = createSignal(navigator.onLine);

window.addEventListener('online', () => setIsOnline(true));
window.addEventListener('offline', () => setIsOnline(false));

export { isOnline };
