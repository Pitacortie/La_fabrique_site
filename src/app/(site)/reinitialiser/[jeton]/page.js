import Link from "next/link";
import { lireJeton } from "@/lib/jetons";
import FormulaireNouveau from "./FormulaireNouveau";

export const metadata = { title: "Nouveau mot de passe", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Reinitialiser({ params }) {
  const { jeton } = await params;
  const ligne = await lireJeton(jeton, "REINITIALISATION");

  return (
    <div className="conteneur section" style={{ maxWidth: "32rem" }}>
      <h1>Nouveau mot de passe</h1>
      {ligne ? (
        <>
          <p>Bonjour {ligne.membre.prenom}, choisissez votre nouveau mot de passe.</p>
          <FormulaireNouveau jeton={jeton} email={ligne.membre.email} />
        </>
      ) : (
        <>
          <div className="message-erreur" role="alert">
            Ce lien n'est plus valable : il a déjà servi ou il a expiré (validité : 1 heure).
          </div>
          <p style={{ marginTop: "1.5rem" }}>
            <Link href="/mot-de-passe-oublie" className="bouton">Faire une nouvelle demande</Link>
          </p>
        </>
      )}
    </div>
  );
}
