import styles from "./StaticPage.module.css";

export default function HelpPage() {
  return (
    <div class={styles.page}>
      <h1>Hjälp</h1>
      <p>
        Här hittar du svar på vanliga frågor om hur du använder kryssa.nu. Nedan
        går vi igenom appens funktioner en i taget.
      </p>
      
      <section class={styles.section}>
        <div class={styles.sectionHeader}>
          <span class="md-icon">login</span>
          <h2>Logga in med Google</h2>
        </div>
        <p>
          Tryck på ”Logga in med Google” och välj ditt konto — du behöver varken
          skapa lösenord eller fylla i något formulär. Du förblir inloggad i 30
          dagar och kan logga ut när du vill.
        </p>
      </section>
      <section class={styles.section}>
        <div class={styles.sectionHeader}>
          <span class="md-icon">checklist</span>
          <h2>Kryssa fåglar</h2>
        </div>
        <ul class={styles.list}>
          <li>
            Tryck på sök, förstoringsglaset som du alltid hittar längst nere
            till höger.
          </li>
          <li>
            Fritextsök för att hitta arten — du kan söka både på artnamn och familj.
          </li>
          <li>Bocka i rutan så skapas en observation med dagens datum. Du kan även ange plats, en kort anteckning samt koppla en bild.</li>
          <li>
            Alla observationer går att redigera i efterhand, både enskilt och flera åt gången.
          </li>
        </ul>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionHeader}>
          <span class="md-icon">emoji_events</span>
          <h2>Tävla med vänner</h2>
        </div>
        <p>
          Skapa ett event med start- och slutdatum och bjud in vänner i din närhet med hjälp av en QR-kod. Alla kryss som deltagarna gör under perioden räknas
          automatiskt, och en topplista visar vem som sett flest arter.
        </p>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionHeader}>
          <span class="md-icon">photo_camera</span>
          <h2>Ladda upp bilder</h2>
        </div>
        <p>
          Öppna en observation och välj ”Lägg till bild” för att ladda upp ett
          foto från telefonen eller datorn. Bilden kopplas till observationen
          och syns i din observationshistorik.
        </p>
        <p>Du kan när som helst byta eller ta bort en bild från en observation.</p>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionHeader}>
          <span class="md-icon">bar_chart</span>
          <h2>Följ din statistik</h2>
        </div>
        <p>
          På din profil räknas dina kryss automatiskt ihop till totalt, i år och
          denna vecka. Siffrorna uppdateras direkt när du kryssar en ny art, och
          du kan jämföra dig med andra användare.
        </p>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionHeader}>
          <span class="md-icon">wifi_off</span>
          <h2>Fungerar offline</h2>
        </div>
        <p>
          Ute i fält kan du fortsätta kryssa arter som vanligt även utan
          uppkoppling. Observationerna sparas lokalt på din enhet och synkas
          automatiskt så fort du får internet igen.
        </p>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionHeader}>
          <span class="md-icon">table_chart</span>
          <h2>Exportera till Google Kalkylark</h2>
        </div>
        <p>
          Din data är aldrig låst i appen, utan du kan när som helst exportera den till ett kalkylark.
        </p>
        <p>
          Gå till din profil och tryck på ”Exportera”. Du godkänner åtkomst till
          ditt Google-konto en gång, sedan skapas ett kalkylark automatiskt med
          alla dina observationer och öppnas i en ny flik.
        </p>
      </section>
    </div>
  );
}
