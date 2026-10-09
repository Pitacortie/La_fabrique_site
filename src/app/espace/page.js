import Link from "next/link";
import { exigerMembre } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { libellesCategorie } from "@/lib/site";

export default async function Profil({ searchParams }) {
  const membre = await exigerMembre();
  const { bienvenue, email } = await searchParams;
  const derniereCotisation = await prisma.cotisation.findFirst({
    where: { membreId: membre.id },
    orderBy: { valideJusquau: "desc" },
  });
  const cotisationAJour = derniereCotisation && derniereCotisation.valideJusquau >= new Date();

  return (
    <>
      <div className="coque-entete">
        <h1>Bonjour {membre.prenom}</h1>
        <span className="badge">Adhésion active</span>
      </div>

      {bienvenue && (
        <div className="message-info" role="status" style={{ marginBottom: "1.5rem" }}>
          Votre compte est activé, bienvenue à La Fabrique de Ménesplet ! Votre identifiant de connexion est votre adresse
          e-mail.
        </div>
      )}
      {email === "modifie" && (
        <div className="message-info" role="status" style={{ marginBottom: "1.5rem" }}>
          Votre nouvelle adresse e-mail est confirmée : c'est désormais votre identifiant de connexion.
        </div>
      )}
      <div className="stats">
        <div className="stat">
          <div className="valeur">{membre.alias?.code ?? "—"}</div>
          <div className="libelle">Mon code personnel (alias dans les services)</div>
        </div>
        <div className="stat">
          <div className="valeur">{cotisationAJour ? "À jour" : "À régler"}</div>
          <div className="libelle">
            {derniereCotisation
              ? `Cotisation valable jusqu'au ${formatDate(derniereCotisation.valideJusquau)}`
              : "Aucune cotisation enregistrée"}
          </div>
        </div>
      </div>

      <section className="carte">
        <h2>Mes informations</h2>
        <dl className="liste-def">
          <dt>Nom</dt>
          <dd>{membre.prenom} {membre.nom}</dd>
          <dt>E-mail (identifiant)</dt>
          <dd>{membre.email}</dd>
          <dt>Téléphone</dt>
          <dd>{membre.telephone ?? "—"}</dd>
          <dt>Adresse</dt>
          <dd>{membre.adresse ? `${membre.adresse}, ${membre.codePostal} ${membre.commune}` : "—"}</dd>
          <dt>Catégorie</dt>
          <dd>{libellesCategorie[membre.categorie]}</dd>
          <dt>Droit à l'image</dt>
          <dd>{membre.droitImage ? "J'autorise l'utilisation de mon image" : "Je n'autorise pas l'utilisation de mon image"}</dd>
          <dt>Membre depuis</dt>
          <dd>{formatDate(membre.createdAt)}</dd>
        </dl>
        <div className="actions" style={{ marginTop: "1.25rem" }}>
          <Link href="/espace/coordonnees" className="bouton bouton-secondaire">Modifier mes coordonnées</Link>
          <Link href="/espace/email" className="bouton bouton-secondaire">Changer d'adresse e-mail</Link>
          <Link href="/espace/mot-de-passe" className="bouton bouton-secondaire">Changer mon mot de passe</Link>
        </div>
      </section>
    </>
  );
}
