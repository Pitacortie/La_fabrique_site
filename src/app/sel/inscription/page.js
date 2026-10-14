import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerAdherentAJour } from "@/lib/sel/acces";
import { TEXTES_SEL } from "@/lib/sel/regles";
import { getTextesEnVigueur } from "@/lib/textes";
import { FormulaireAssurance, FormulaireInscription, FormulaireTextesSel } from "./Formulaires";

export const metadata = { title: "Inscription au SEL" };

const versClient = (t) => ({ id: t.id, type: t.type, titre: t.titre, version: t.version, contenu: t.contenu });

// SEL-2, SEL-18 : inscription au SEL d'un adhérent à jour de cotisation
export default async function Inscription() {
  const etat = await exigerAdherentAJour();
  if (etat.code === "ok") redirect("/sel");
  const prenom = etat.membre.prenom;

  if (etat.code === "inscription") {
    const textes = Object.values(await getTextesEnVigueur(TEXTES_SEL)).map(versClient);
    return (
      <>
        <h1>Bienvenue dans le SEL, {prenom} !</h1>
        <p className="chapo">
          Le SEL est un système d'échange local : on s'entraide sans argent, en briques (1 minute = 1 brique). Pour vous
          inscrire, acceptez la Charte et le Règlement du SEL et déclarez votre assurance responsabilité civile.
        </p>
        <FormulaireInscription textes={textes} />
      </>
    );
  }

  if (etat.code === "textes") {
    return (
      <>
        <h1>Nouvelle version des textes du SEL</h1>
        <p className="chapo">La Charte ou le Règlement du SEL ont changé. Merci de lire la nouvelle version et de l'accepter pour continuer.</p>
        <FormulaireTextesSel textes={etat.textes.map(versClient)} />
      </>
    );
  }

  if (etat.code === "suspendu") {
    return (
      <>
        <h1>Accès au SEL suspendu</h1>
        <div className="message-erreur" role="alert">
          Votre accès au SEL est suspendu{etat.inscription.motifSuspension ? ` : ${etat.inscription.motifSuspension}` : "."} Votre solde de
          briques est conservé.
        </div>
        <p style={{ marginTop: "1rem" }}><Link href="/contact">Contacter l'association</Link></p>
      </>
    );
  }

  // Inscription sans assurance déclarée
  return (
    <>
      <h1>Votre assurance responsabilité civile</h1>
      <p className="chapo">Pour échanger dans le SEL, déclarez votre assurance responsabilité civile. Aucun document n'est demandé.</p>
      <FormulaireAssurance />
    </>
  );
}
