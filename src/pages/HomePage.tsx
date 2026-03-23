import { openSearch } from "../components/AppShell";
import styles from "./HomePage.module.css";

export default function HomePage() {
  return (
    <div class={styles.page}>
      {/* Hero */}
      <section class={styles.hero}>
        <div class={styles.heroContent}>
          <h1 class={styles.heroTitle}>kryssa.nu</h1>
          <img src="/logo-v2.webp" alt="Kryssa.nu" class={styles.heroLogo} />
          <p class={styles.heroSubtitle}>
            Din personliga fågeljournal — kryssa arter, tävla med vänner och följ din statistik.
          </p>
          <button class={styles.heroCta} onClick={() => openSearch()}>
            <span class="md-icon">search</span>
            Sök fåglar
          </button>
        </div>
      </section>

      {/* Features */}
      <div class={styles.features}>
        <div class={styles.featureCard}>
          <div class={styles.featureIconWrapper}>
            <span class="md-icon">checklist</span>
          </div>
          <div class={styles.featureText}>
            <span class={styles.featureTitle}>Kryssa fåglar</span>
            <span class={styles.featureDesc}>
              Håll koll på vilka arter du sett. Sök bland alla svenska fåglar och logga dina observationer.
            </span>
          </div>
        </div>
        <div class={styles.featureCard}>
          <div class={styles.featureIconWrapper}>
            <span class="md-icon">emoji_events</span>
          </div>
          <div class={styles.featureText}>
            <span class={styles.featureTitle}>Tävla med vänner</span>
            <span class={styles.featureDesc}>
              Skapa event och bjud in vänner. Se vem som kryssar flest arter under en helg eller semester.
            </span>
          </div>
        </div>
        <div class={styles.featureCard}>
          <div class={styles.featureIconWrapper}>
            <span class="md-icon">bar_chart</span>
          </div>
          <div class={styles.featureText}>
            <span class={styles.featureTitle}>Följ din statistik</span>
            <span class={styles.featureDesc}>
              Se hur många arter du kryssat totalt, i år och denna vecka. Jämför dig med andra.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
