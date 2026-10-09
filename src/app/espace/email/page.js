import Link from "next/link";
import { exigerMembre } from "@/lib/auth";
import FormulaireEmail from "./FormulaireEmail";

export const metadata = { title: "Adresse e-mail" };

export default async function AdresseEmail() {
  const membre = await exigerMembre("/espace/email");
  return (
    <>
      <p><Link href="/espace">← Mon profil</Link></p>
      <div className="coque-entete">
        <h1>Changer d'adresse e-mail</h1>
      </div>
      <p className="chapo">
        Votre adresse e-mail est aussi votre identifiant de connexion. La nouvelle adresse ne sera utilisée qu'après
        confirmation, par un lien envoyé à cette adresse.
      </p>
      <FormulaireEmail email={membre.email} />
    </>
  );
}
