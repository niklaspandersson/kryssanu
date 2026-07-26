import styles from "./StaticPage.module.css";

export default function AboutPage() {
  return (
    <div class={styles.page}>
      <h1>Om kryssa.nu</h1>
      <p>
        På kryssa.nu loggar du dina fågelobservationer och följer dina
        framsteg — hur många arter du sett totalt, i år och den här veckan.
      </p>
      <p>
        Det roligaste händer i event: skapa ett, bjud in vänner med en QR-kod
        och se vem som hittar flest arter — under eftermiddagen, helgen,
        eller varför inte hela semestern. Alla kryss räknas automatiskt och
        topplistan uppdateras direkt.
      </p>
      <p>
        kryssa.nu är ett fritidsprojekt, byggt och drivet av frivilliga
        fågelintresserade — utan reklam och utan vinstintresse.
      </p>
      <p>
        Frågor eller feedback? Mejla{" "}
        <a href="mailto:hej@kryssa.nu">hej@kryssa.nu</a>.
      </p>
    </div>
  );
}
