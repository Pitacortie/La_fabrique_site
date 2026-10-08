import Link from "next/link";
import { getTextesEnVigueur } from "@/lib/textes";
import FormulaireAdhesion from "./FormulaireAdhesion";

export const metadata = { title: "Adhérer" };

export default async function Adherer() {
  // ADH-2 : les trois textes en vigueur sont affichés en entier au-dessus de leur case
  const textes = await getTextesEnVigueur(["CHARTE_NEUTRALITE", "STATUTS", "REGLEMENT_INTERIEUR"]);
  const versions = Object.fromEntries(
    Object.entries(textes).map(([type, t]) => [type, { id: t.id, version: t.version, contenu: t.contenu }]),
  );

  return (
    <div className="conteneur section">
      <h1>Adhérer</h1>
      <p className="accroche">Bulletin d'adhésion {new Date().getFullYear()}</p>

      {/* ADH-13 : parcours d'inscription */}
      <ol className="etapes">
        <li><strong>Je dépose ma demande</strong> en ligne avec ce formulaire.</li>
        <li><strong>Je règle ma cotisation</strong> hors du site (1 € minimum) : aucun paiement en ligne.</li>
        <li><strong>Un membre du Bureau valide</strong> mon adhésion ; je reçois mon code et un lien pour créer mon mot de passe.</li>
      </ol>

      <p className="refs" style={{ margin: "1.5rem 0" }}>
        Avant d'adhérer, prenez connaissance des <Link href="/documents">statuts, du règlement intérieur et de la charte</Link>.
        Une question ? <Link href="/contact">Contactez-nous</Link>.
      </p>

      <FormulaireAdhesion textes={versions} />
    </div>
  );
}
