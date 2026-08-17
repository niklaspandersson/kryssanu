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

      <h2>Vilka fåglar kan jag kryssa?</h2>
      <p>
        Fågellistan på kryssa.nu följer{" "}
        <a
          href="https://birdlife.se/tk/vastpalearktislistan/sverige-underarter/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Förteckning över Sveriges fågeltaxa
        </a>{" "}
        - Sverigelistan - som ges ut av BirdLife Sveriges taxonomikommitté (TK)
        och raritetskommitté (RK). Därifrån kommer arterna, underarterna, de
        svenska namnen, fyndkategorierna och statusen.
      </p>
      <p>
        Systematik och taxonomi i Sverigelistan följer i sin tur{" "}
        <a
          href="https://www.avilist.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          AviList
        </a>
        , den globala checklistan över världens fåglar. Listan uppdateras en
        gång om året, när TK och RK publicerar en ny version.
      </p>
      <p>
        Sverigelistan innehåller alla fåglar som någon gång setts i Sverige. Har
        du sett något som inte finns i listan? Rapportera fyndet i{" "}
        <a href="https://artportalen.se" target="_blank" rel="noopener noreferrer">
          Artportalen
        </a>{" "}
        så granskas det av Raritetskommittén.
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
