import Link from "next/link";
import { compteursSel } from "@/lib/sel/donnees";
import { etatSel } from "@/lib/sel/acces";
import EnteteSel from "./EnteteSel";

export const metadata = {
  title: { default: "Le SEL", template: "%s · Le SEL · La Fabrique de Ménesplet" },
  robots: { index: false, follow: false },
};

// Espace SEL, à part du site principal (même charte graphique).
// Le contrôle d'accès est fait par chaque page (exigerAccesSel) ; le layout n'adapte que l'en-tête.
export default async function SelLayout({ children }) {
  const etat = await etatSel();
  const ouvert = etat.code === "ok";
  const compteurs = ouvert ? await compteursSel(etat.alias.id) : null;
  const solde = ouvert ? etat.alias.soldeBriques : null;

  return (
    <div className="sel">
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <EnteteSel ouvert={ouvert} compteurs={compteurs} solde={solde} code={etat.membre?.alias?.code} />
      <main id="contenu" className="conteneur sel-contenu">{children}</main>
      <footer className="sel-pied conteneur">
        <span>Le SEL de La Fabrique de Ménesplet · 1 minute = 1 brique, ni grand ni petit savoir.</span>
        <span>
          <Link href="/le-sel">Comment ça marche ?</Link> · <Link href="/documents">Nos textes</Link> · <Link href="/">Site de l'association</Link>
        </span>
      </footer>
    </div>
  );
}
