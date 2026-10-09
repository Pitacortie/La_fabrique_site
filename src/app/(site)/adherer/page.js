import Link from "next/link";
import BlocEditable from "@/components/edition/BlocEditable";
import { TEXTES_ADHESION } from "@/lib/adhesion";
import { getMembreConnecte } from "@/lib/auth";
import { getContenus } from "@/lib/contenus";
import { getTextesEnVigueur } from "@/lib/textes";
import FormulaireAdhesion from "./FormulaireAdhesion";

export const metadata = { title: "Adhérer" };

export default async function Adherer({ searchParams }) {
  const { raison } = await searchParams;
  const membre = await getMembreConnecte();
  // ADH-2 : les trois textes en vigueur sont affichés en entier au-dessus de leur case
  const [textes, contenus] = await Promise.all([getTextesEnVigueur(TEXTES_ADHESION), getContenus(["adhesion.paiement"])]);
  const versions = Object.fromEntries(
    Object.entries(textes).map(([type, t]) => [type, { id: t.id, version: t.version, contenu: t.contenu }]),
  );

  return (
    <div className="conteneur section">
      <h1>Adhérer</h1>
      <p className="accroche">Bulletin d'adhésion {new Date().getFullYear()}</p>

      {raison === "sel" && (
        <div className="message-erreur" role="alert" style={{ marginBottom: "1.5rem" }}>
          {membre
            ? "Le SEL est réservé aux adhérents à jour de leur cotisation : la vôtre n'est plus à jour. Réglez votre cotisation (modalités ci-dessous) ; un membre du Bureau l'enregistrera et le SEL vous sera de nouveau ouvert."
            : "Le SEL est réservé aux adhérents de La Fabrique : adhérez pour y accéder."}
        </div>
      )}

      {/* ADH-13 : parcours d'inscription */}
      <ol className="etapes">
        <li><strong>Je dépose ma demande</strong> en ligne avec ce formulaire.</li>
        <li><strong>Je règle ma cotisation</strong> hors du site (1 € minimum) : aucun paiement en ligne.</li>
        <li><strong>Un membre du Bureau valide</strong> mon adhésion ; je reçois mon code et un lien pour créer mon mot de passe.</li>
      </ol>

      <section className="carte carte-ocre" style={{ margin: "1.5rem 0" }}>
        <h2>Comment payer la cotisation ?</h2>
        <BlocEditable cle="adhesion.paiement" texte={contenus["adhesion.paiement"]} />
      </section>

      <p className="refs" style={{ margin: "1.5rem 0" }}>
        Avant d'adhérer, prenez connaissance des <Link href="/documents">statuts, du règlement intérieur et de la charte</Link>.
        Une question ? <Link href="/contact">Contactez-nous</Link>.
      </p>

      {membre ? (
        <div className="encart">
          Vous êtes déjà membre de La Fabrique, {membre.prenom}. Pour renouveler votre adhésion, réglez simplement votre
          cotisation selon les modalités ci-dessus. <Link href="/espace">Mon espace</Link>
        </div>
      ) : (
        <FormulaireAdhesion textes={versions} />
      )}
    </div>
  );
}
