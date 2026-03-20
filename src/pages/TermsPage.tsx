import styles from "./StaticPage.module.css";

export default function TermsPage() {
  return (
    <div class={styles.page}>
      <h1>Villkor</h1>
      <p>
        Genom att använda kryssa.nu godkänner du dessa villkor. Senast
        uppdaterad: 2026-03-19.
      </p>

      <h2>Om tjänsten</h2>
      <p>
        Kryssa.nu är en ideell tjänst som drivs av frivilliga på fritiden.
        Tjänsten erbjuds i befintligt skick utan några garantier. Vi förbehåller
        oss rätten att när som helst ändra, begränsa eller avsluta tjänsten utan
        förvarning.
      </p>

      <h2>Konto och inloggning</h2>
      <p>
        Du loggar in via Google. Vi lagrar den information som behövs för att
        tjänsten ska fungera, såsom ditt namn, e-postadress och profilbild från
        Google. Du ansvarar för att hålla ditt konto säkert och för all aktivitet
        som sker via ditt konto.
      </p>

      <h2>Ditt innehåll</h2>
      <p>
        Du äger det innehåll du skapar, till exempel observationer och
        anteckningar. Genom att använda tjänsten ger du oss rätt att lagra och
        visa ditt innehåll inom ramen för tjänstens funktioner, exempelvis i
        event och statistik. Vi säljer aldrig dina uppgifter till tredje part.
      </p>

      <h2>Uppföranderegler</h2>
      <p>
        Använd tjänsten på ett schysst sätt. Missbruk, spam eller beteende som
        förstör upplevelsen för andra användare kan leda till att ditt konto
        stängs av.
      </p>

      <h2>Ansvarsbegränsning</h2>
      <p>
        Eftersom tjänsten drivs ideellt och utan betalning tar vi inget ansvar
        för eventuella avbrott, dataförlust eller andra problem som kan uppstå
        vid användning av tjänsten. Vi gör vårt bästa men kan inte garantera att
        tjänsten alltid är tillgänglig eller felfri.
      </p>

      <h2>Personuppgifter</h2>
      <p>
        Vi samlar in och lagrar personuppgifter i enlighet med GDPR. De
        uppgifter vi lagrar är: namn, e-postadress, profilbild (från Google),
        samt information du själv väljer att ange, som ort och biografi. Du kan
        när som helst begära att få dina uppgifter raderade genom att kontakta
        oss.
      </p>

      <h2>Cookies</h2>
      <p>
        Vi använder cookies som är nödvändiga för inloggning och för att tjänsten
        ska fungera. Vi använder inga spårningscookies eller tredjepartscookies
        för marknadsföring.
      </p>

      <h2>Ändringar av villkoren</h2>
      <p>
        Vi kan uppdatera dessa villkor vid behov. Väsentliga ändringar meddelas
        via tjänsten. Fortsatt användning efter en ändring innebär att du
        godkänner de uppdaterade villkoren.
      </p>

      <h2>Kontakt</h2>
      <p>
        Har du frågor om villkoren eller vill radera ditt konto? Kontakta oss
        via e-post: <a href="mailto:hej@kryssa.nu">hej@kryssa.nu</a>.
      </p>
    </div>
  );
}
