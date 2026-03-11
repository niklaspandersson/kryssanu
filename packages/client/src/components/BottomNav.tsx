import { A } from "@solidjs/router";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";
import styles from "./BottomNav.module.css";

const tabs = [
  { href: "/", icon: "search", label: "Sok" },
  { href: "/feed", icon: "home", label: "Flode" },
  { href: "/events", icon: "event", label: "Event" },
  { href: "/stats", icon: "bar_chart", label: "Stats" },
] as const;

export default function BottomNav() {
  const { user } = useAuth();

  return (
    <nav class={styles.nav}>
      {tabs.map((tab) => (
        <A href={tab.href} class={styles.tab} activeClass={styles.active} end>
          <span class="md-icon">{tab.icon}</span>
          <span class={styles.label}>{tab.label}</span>
        </A>
      ))}
      <A href="/profile" class={styles.tab} activeClass={styles.active}>
        {user() ? (
          <Avatar name={user()!.name} image={user()!.image} size={28} />
        ) : (
          <span class="md-icon">person</span>
        )}
        <span class={styles.label}>Profil</span>
      </A>
    </nav>
  );
}
