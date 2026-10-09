import Link from "next/link";
import { exigerMembre } from "@/lib/auth";
import FormulaireCoordonnees from "./FormulaireCoordonnees";

export const metadata = { title: "Mes coordonnées" };

export default async function Coordonnees() {
  const membre = await exigerMembre("/espace/coordonnees");

  return (
    <>
      <p><Link href="/espace">← Mon profil</Link></p>
      <div className="coque-entete">
        <h1>Modifier mes coordonnées</h1>
      </div>
      <div className="encart" style={{ marginBottom: "1.5rem", maxWidth: "46rem" }}>
        <p style={{ margin: 0 }}>
          <strong>{membre.prenom} {membre.nom}</strong> · {membre.email}
          <br />
          Pour changer d'adresse e-mail : <Link href="/espace/email">Adresse e-mail</Link>. Pour corriger votre nom ou votre date de naissance, <Link href="/contact">contactez l'association</Link>.
        </p>
      </div>
      <FormulaireCoordonnees membre={membre} />
    </>
  );
}
