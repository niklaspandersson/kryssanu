import { Show } from 'solid-js';
import { isOnline } from '../lib/useOnlineStatus';
import { pendingCount } from '../lib/offlineSync';
import Icon from './Icon';
import styles from './OfflineBanner.module.css';

export default function OfflineBanner() {
  return (
    <Show when={!isOnline()}>
      <div class={styles.banner}>
        <Icon name="cloud_off" class={styles.icon} />
        <span>
          Du är offline.
          <Show when={pendingCount() > 0}>
            {' '}
            {pendingCount()} observation{pendingCount() === 1 ? '' : 'er'} väntar
            på att synkas.
          </Show>
        </span>
      </div>
    </Show>
  );
}
