import Link from "next/link";
import { redirect } from "next/navigation";
import { getMembreConnecte } from "@/lib/auth";
import FormulaireConnexion from "./FormulaireConnexion";

export const metadata = { title: "Connexion" };

// CON-1 à CON-5. Réinitialisation du mot de passe par courriel (CON-3) : à brancher avec l'envoi d'e-mails.
export default async function Connexion({ searchParams }) {
  const { suite } = await searchParams;
  if (await getMembreConnecte()) redirect("/espace");

  return (
    <div className="conteneur section" style={{ maxWidth: "32rem" }}>
      <h1>Connexion</h1>
      <p>Espace réservé aux adhérents dont l'adhésion a été validée.</p>
      <FormulaireConnexion suite={suite} />
      <p style={{ marginTop: "2rem" }}>
        Pas encore membre ? <Link href="/adherer">Adhérer à La Fabrique</Link>
      </p>
    </div>
  );
}
