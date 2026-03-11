import styles from "./StaticPage.module.css";

export default function AboutPage() {
  return (
    <div class={styles.page}>
      <h1>Om kryssa.nu</h1>
      <p>
        kryssa.nu är en tjänst för fågelskådare som vill hålla koll på sina
        observationer och dela dem med andra.
      </p>
    </div>
  );
}
