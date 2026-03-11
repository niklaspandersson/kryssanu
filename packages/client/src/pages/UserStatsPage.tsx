import { createResource, Show } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { stats as statsApi, users as usersApi } from "../lib/api";
import StatCard from "../components/StatCard";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import styles from "./StatsPage.module.css";

export default function UserStatsPage() {
  const params = useParams();

  const [userInfo] = createResource(() => params.userId, usersApi.getOne);
  const [userStats] = createResource(() => params.userId, statsApi.user);

  return (
    <div class={styles.page}>
      <A href="/stats" style={{ display: "flex", "align-items": "center", gap: "4px", "margin-bottom": "16px", color: "var(--color-text-secondary)", "font-size": "var(--font-size-sm)" }}>
        <Icon name="arrow_back" size={18} />
        Tillbaka
      </A>

      <Show when={userInfo()}>
        {(u) => (
          <div style={{ display: "flex", "align-items": "center", gap: "12px", "margin-bottom": "20px" }}>
            <Avatar name={u().name} image={u().image} size={48} />
            <h1 class={styles.heading} style={{ margin: "0" }}>{u().name}</h1>
          </div>
        )}
      </Show>

      <Show
        when={userStats()}
        fallback={<EmptyState icon="bar_chart" message="Laddar statistik..." />}
      >
        {(s) => (
          <div class={styles.grid}>
            <StatCard value={s().uniqueSpeciesLifetime} label="Arter totalt" highlight />
            <StatCard value={s().uniqueSpeciesThisYear} label="Arter i ar" />
            <StatCard value={s().totalObservations} label="Observationer" />
            <StatCard value={s().observationsThisWeek} label="Denna vecka" />
            <StatCard value={s().observationsThisMonth} label="Denna manad" />
          </div>
        )}
      </Show>
    </div>
  );
}
