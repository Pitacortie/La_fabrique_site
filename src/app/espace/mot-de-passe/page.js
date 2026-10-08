import Link from "next/link";
import { exigerMembre } from "@/lib/auth";
import FormulaireMotDePasse from "./FormulaireMotDePasse";

export const metadata = { title: "Mot de passe" };

export default async function MotDePasse() {
  const membre = await exigerMembre("/espace/mot-de-passe");
  return (
    <>
      <p><Link href="/espace">← Mon profil</Link></p>
      <div className="coque-entete">
        <h1>Mot de passe</h1>
      </div>
      <FormulaireMotDePasse email={membre.email} />
    </>
  );
}
