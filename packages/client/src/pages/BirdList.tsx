import { createResource, createSignal, For, Show } from "solid-js";
import { birds as birdsApi, observations } from "../lib/api";
import { useAuth } from "../lib/auth";
import Layout from "../components/Layout";
import Header from "../components/list/Header";
import BirdListItem from "../components/list/BirdListItem";
import styles from "./BirdList.module.css";

export default function BirdList() {
  const { user } = useAuth();
  const [allBirds] = createResource(() => birdsApi.getAll());
  const [observedBirds, { mutate: setObserved }] = createResource(
    () => user(),
    () => observations.getObserved()
  );

  const registerObservation = (birdId: string) => {
    observations
      .create({ birdId })
      .then(() => {
        setObserved((prev) => ({ ...prev, [birdId]: true }));
      })
      .catch(console.error);
  };

  return (
    <Layout>
      <Header />
      <Show when={allBirds()} fallback={<p>Loading...</p>}>
        <ul class={styles.birds}>
          <For each={allBirds()}>
            {(bird) => (
              <BirdListItem
                bird={bird}
                observed={observedBirds()?.[bird.id] ?? false}
                registerObservation={registerObservation}
              />
            )}
          </For>
        </ul>
      </Show>
    </Layout>
  );
}
