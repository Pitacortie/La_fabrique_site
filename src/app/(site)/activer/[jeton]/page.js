import Link from "next/link";
import { prisma } from "@/lib/db";
import { lireJeton } from "@/lib/jetons";
import FormulaireActivation from "./FormulaireActivation";

export const metadata = { title: "Activer mon compte", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Activer({ params }) {
  const { jeton } = await params;
  const ligne = await lireJeton(jeton, "ACTIVATION");
  const valide = ligne && ligne.membre.statut === "EN_ATTENTE_ACTIVATION";
  const alias = valide ? await prisma.alias.findUnique({ where: { membreId: ligne.membreId } }) : null;

  return (
    <div className="conteneur section" style={{ maxWidth: "34rem" }}>
      <h1>Bienvenue !</h1>
      {valide ? (
        <>
          <p className="chapo">
            Bonjour {ligne.membre.prenom}, votre adhésion à La Fabrique de Ménesplet est validée. Votre code personnel
            est <strong>{alias?.code}</strong>.
          </p>
          <p>Choisissez votre mot de passe pour activer votre compte :</p>
          <FormulaireActivation jeton={jeton} email={ligne.membre.email} />
        </>
      ) : (
        <>
          <div className="message-erreur" role="alert">
            Ce lien n'est plus valable : il a déjà servi ou il a expiré.
          </div>
          <p style={{ marginTop: "1.5rem" }}>
            Votre compte est déjà activé ? <Link href="/connexion">Connectez-vous</Link>. Sinon, demandez un nouveau lien
            avec <Link href="/mot-de-passe-oublie">« Mot de passe oublié »</Link>.
          </p>
        </>
      )}
    </div>
  );
}
