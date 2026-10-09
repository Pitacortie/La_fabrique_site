import Link from "next/link";
import FormulaireDemande from "./FormulaireDemande";

export const metadata = { title: "Mot de passe oublié" };

// CON-3 : réinitialisation du mot de passe par courriel.
export default function MotDePasseOublie() {
  return (
    <div className="conteneur section" style={{ maxWidth: "32rem" }}>
      <h1>Mot de passe oublié</h1>
      <p>Indiquez l'adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <FormulaireDemande />
      <p style={{ marginTop: "2rem" }}>
        <Link href="/connexion">← Retour à la connexion</Link>
      </p>
      <p className="refs">
        Vous n'avez plus accès à cette adresse e-mail ? <Link href="/contact">Contactez l'association</Link>.
      </p>
    </div>
  );
}
