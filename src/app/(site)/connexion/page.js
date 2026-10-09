import Link from "next/link";
import { redirect } from "next/navigation";
import { getMembreConnecte } from "@/lib/auth";
import FormulaireConnexion from "./FormulaireConnexion";

export const metadata = { title: "Connexion" };

// CON-1 à CON-5.
export default async function Connexion({ searchParams }) {
  const { suite, reinitialise, email } = await searchParams;
  if (await getMembreConnecte()) redirect("/espace");

  return (
    <div className="conteneur section" style={{ maxWidth: "32rem" }}>
      <h1>Connexion</h1>
      <p>Espace réservé aux adhérents dont l'adhésion a été validée.</p>
      {suite?.startsWith("/sel") && (
        <div className="encart" style={{ marginBottom: "1rem" }}>
          Le SEL est réservé aux adhérents : connectez-vous pour y accéder. <Link href="/le-sel">Découvrir le SEL →</Link>
        </div>
      )}
      {reinitialise && (
        <div className="message-info" role="status" style={{ marginBottom: "1rem" }}>
          Votre mot de passe a été changé. Connectez-vous avec le nouveau.
        </div>
      )}
      {email === "modifie" && (
        <div className="message-info" role="status" style={{ marginBottom: "1rem" }}>
          Votre nouvelle adresse e-mail est confirmée. Connectez-vous avec elle.
        </div>
      )}
      <FormulaireConnexion suite={suite} />
      <p style={{ marginTop: "2rem" }}>
        Pas encore membre ? <Link href="/adherer">Adhérer à La Fabrique</Link>
      </p>
    </div>
  );
}
