import Link from "next/link";
import { lireJeton } from "@/lib/jetons";
import FormulaireConfirmation from "./FormulaireConfirmation";

export const metadata = { title: "Confirmer mon adresse e-mail", robots: { index: false, follow: false }, referrer: "no-referrer" };

// La simple visite du lien ne change rien : certaines messageries ouvrent les liens toutes seules
// pour les analyser. Le changement n'a lieu qu'au clic sur le bouton.
export default async function ConfirmerEmail({ params }) {
  const { jeton } = await params;
  const ligne = await lireJeton(jeton, "CHANGEMENT_EMAIL");

  return (
    <div className="conteneur section" style={{ maxWidth: "34rem" }}>
      <h1>Nouvelle adresse e-mail</h1>
      {ligne?.nouvelEmail ? (
        <>
          <p className="chapo">
            Bonjour {ligne.membre.prenom}, confirmez-vous l'utilisation de <strong>{ligne.nouvelEmail}</strong> pour
            votre compte ? Elle deviendra votre identifiant de connexion.
          </p>
          <FormulaireConfirmation jeton={jeton} />
        </>
      ) : (
        <>
          <div className="message-erreur" role="alert">Ce lien n'est plus valable : il a déjà servi ou il a expiré (validité : 1 heure).</div>
          <p style={{ marginTop: "1.5rem" }}>
            <Link href="/espace/email">Refaire la demande depuis mon espace</Link>
          </p>
        </>
      )}
    </div>
  );
}
