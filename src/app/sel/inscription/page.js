import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/format";
import { exigerAdherentAJour } from "@/lib/sel/acces";
import { TEXTES_SEL } from "@/lib/sel/regles";
import { getTextesEnVigueur } from "@/lib/textes";
import { FormulaireAttestation, FormulaireInscription, FormulaireTextesSel } from "./Formulaires";

export const metadata = { title: "Inscription au SEL" };

const versClient = (t) => ({ id: t.id, type: t.type, titre: t.titre, version: t.version, contenu: t.contenu });

// SEL-2, SEL-18 : inscription au SEL d'un adhérent à jour de cotisation
export default async function Inscription() {
  const etat = await exigerAdherentAJour();
  if (etat.code === "ok") redirect("/sel");
  const demain = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const prenom = etat.membre.prenom;

  if (etat.code === "inscription") {
    const textes = Object.values(await getTextesEnVigueur(TEXTES_SEL)).map(versClient);
    return (
      <>
        <h1>Bienvenue dans le SEL, {prenom} !</h1>
        <p className="chapo">
          Le SEL est un service d'échange local : on s'entraide sans argent, en briques (1 minute = 1 brique). Pour vous
          inscrire, acceptez la Charte et le Règlement du SEL et déposez votre attestation d'assurance.
        </p>
        <FormulaireInscription textes={textes} demain={demain} />
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

  if (etat.code === "verification") {
    return (
      <>
        <h1>Inscription en cours de vérification</h1>
        <div className="carte carte-ocre">
          <p>
            Merci {prenom} ! Votre attestation d'assurance ({etat.attestation.assureur}, valable jusqu'au{" "}
            {formatDate(etat.attestation.valideJusquau)}) a bien été reçue. Un membre du Bureau va la vérifier : vous
            recevrez un e-mail dès que le SEL vous sera ouvert.
          </p>
          <Link href="/le-sel">En attendant, découvrir comment fonctionne le SEL →</Link>
        </div>
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

  // Attestation refusée, absente ou expirée : en déposer une nouvelle
  const refusee = etat.attestation?.statut === "REFUSEE";
  return (
    <>
      <h1>{etat.code === "attestation_expiree" ? "Votre attestation d'assurance a expiré" : "Attestation d'assurance"}</h1>
      <div className="message-erreur" role="alert" style={{ marginBottom: "1.5rem" }}>
        {etat.code === "attestation_expiree"
          ? `Votre attestation était valable jusqu'au ${formatDate(etat.attestation.valideJusquau)}. Déposez la nouvelle pour retrouver l'accès au SEL : vos annonces et votre solde sont conservés.`
          : refusee
            ? `Votre attestation n'a pas pu être validée${etat.attestation.motifRefus ? ` : ${etat.attestation.motifRefus}` : "."} Merci d'en déposer une nouvelle.`
            : "Déposez votre attestation d'assurance responsabilité civile pour accéder au SEL."}
      </div>
      <FormulaireAttestation demain={demain} />
    </>
  );
}
