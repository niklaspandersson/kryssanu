import { createResource, For, Show } from "solid-js";
import { A, useParams } from "@solidjs/router";
import { birds as birdsApi, observations } from "../lib/api";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import IconHeader from "../components/IconHeader";
import Binoculars from "../components/Icon/Binoculars";
import styles from "./BirdDetail.module.css";

export default function BirdDetail() {
  const params = useParams<{ id: string }>();
  const [bird] = createResource(() => params.id, birdsApi.getOne);
  const [obs] = createResource(() => params.id, observations.getForBird);

  return (
    <Layout>
      <div class={styles.details}>
        <header>
          <A href="/list">
            <Icon name="close" />
          </A>
        </header>
        <Show when={bird()}>
          {(b) => (
            <>
              <h3>{b().swedish}</h3>
              <IconHeader icon={<Binoculars />}>Observationer</IconHeader>
              <ul class="observations">
                <For each={obs()}>
                  {(o) => <li>{new Date(o.date).toLocaleDateString("sv")}</li>}
                </For>
              </ul>
            </>
          )}
        </Show>
      </div>
    </Layout>
  );
}
