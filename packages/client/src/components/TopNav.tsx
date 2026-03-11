import { A } from "@solidjs/router";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";
import styles from "./TopNav.module.css";

const tabs = [
  { href: "/", icon: "home", label: "Hem" },
  { href: "/feed", icon: "dynamic_feed", label: "Flöde" },
  { href: "/events", icon: "event", label: "Event" },
  { href: "/stats", icon: "bar_chart", label: "Stats" },
] as const;

type Props = {
  onSearchOpen: () => void;
};

export default function TopNav(props: Props) {
  const { user } = useAuth();

  return (
    <nav class={styles.nav}>
      <A href="/" class={styles.brand}>
        <span class={`md-icon ${styles.brandIcon}`}>park</span>
        Kryssanu
      </A>

      <div class={styles.links}>
        {tabs.map((tab) => (
          <A href={tab.href} class={styles.tab} activeClass={styles.active} end>
            <span class="md-icon">{tab.icon}</span>
            <span class={styles.tabLabel}>{tab.label}</span>
          </A>
        ))}
      </div>

      <div class={styles.actions}>
        <button class={styles.iconBtn} onClick={() => props.onSearchOpen()} aria-label="Sök">
          <span class="md-icon">search</span>
        </button>
        <A href="/profile" class={styles.profileBtn}>
          {user() ? (
            <Avatar name={user()!.name} image={user()!.image} size={28} />
          ) : (
            <span class="md-icon">person</span>
          )}
        </A>
      </div>
    </nav>
  );
}
