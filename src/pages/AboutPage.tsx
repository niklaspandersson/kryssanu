import styles from "./StaticPage.module.css";

export default function AboutPage() {
  return (
    <div class={styles.page}>
      <h1>Om kryssa.nu</h1>
      <p>
        Kryssa.nu är en social fågelskådartjänst som låter dig logga dina observationer och jämföra dig med vänner i så kallade events.
      </p>
      <p>
        Du följer enkelt dina egna framsteg - hur många arter du sett: totalt, under innevarande år eller i ett givet event.
      </p>
      <p>
        kryssa.nu är ett fritidsprojekt, byggt och drivet utan reklam och utan vinstintresse.
      </p>

      <h2>Vem ligger bakom sajten?</h2>
      <p>
        Kryssa.nu är skapad av Niklas Andersson, efter ett behov av ett enkelt sätt att logga egna observationer och samtidigt göra fågelskådningen mer social.
      </p>

      <h2>Kontakt</h2>
      <p>
        Frågor eller feedback? Mejla{" "}
        <a href="mailto:hej@kryssa.nu">hej@kryssa.nu</a>.
      </p>
    </div>
  );
}
