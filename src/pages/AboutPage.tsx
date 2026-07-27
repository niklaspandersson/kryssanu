import styles from "./StaticPage.module.css";

export default function AboutPage() {
  return (
    <div class={styles.page}>
      <h1>Om kryssa.nu</h1>
      <p>
        På kryssa.nu loggar du dina fågelobservationer och följer dina
        framsteg - hur många arter du sett, totalt och under innevarande år.
      </p>
      <p>
        Det roligaste händer i event: skapa, bjud in vänner, 
        och se vem som hittar flest arter - under eftermiddagen, helgen,
        eller varför inte hela semestern. Alla kryss räknas automatiskt och
        topplistan uppdateras direkt.
      </p>
      <p>
        kryssa.nu är ett fritidsprojekt, byggt och drivet utan reklam och utan vinstintresse.
      </p>

      <h2>Vem ligger bakom sajten?</h2>
      <p>
        Kryssa.nu är skapad av Niklas An 
        Jag har byggt sajten för att jag själv vill ha ett enkelt sätt att logga mina observationer och tävla med vänner.
      </p>

      <h2>Kontakt</h2>
      <p>
        Frågor eller feedback? Mejla{" "}
        <a href="mailto:hej@kryssa.nu">hej@kryssa.nu</a>.
      </p>
    </div>
  );
}
