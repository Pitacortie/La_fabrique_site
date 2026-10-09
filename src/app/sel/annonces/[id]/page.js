import Link from "next/link";
import { notFound } from "next/navigation";
import { changerStatutAnnonce } from "@/app/sel/actions/annonces";
import { FormulaireContacter, FormulaireSignalement } from "@/app/sel/Formulaires";
import { valeurAnnonce } from "@/app/sel/CarteAnnonce";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import TexteSimple from "@/components/TexteSimple";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { exigerAccesSel } from "@/lib/sel/acces";
import { filtreAnnoncesVisibles, selectAnnonce } from "@/lib/sel/donnees";
import { libellesModalite, libellesNature, libellesType } from "@/lib/sel/regles";

export default async function Annonce({ params, searchParams }) {
  const { id } = await params;
  const { publiee } = await searchParams;
  const { alias } = await exigerAccesSel(`/sel/annonces/${id}`);

  const annonce = await prisma.annonce.findUnique({ where: { id }, select: selectAnnonce });
  if (!annonce) notFound();
  const mienne = annonce.auteurId === alias.id;
  // Une annonce close, masquée ou expirée n'est visible que de son auteur
  const visible = mienne || (await prisma.annonce.count({ where: { id, ...filtreAnnoncesVisibles() } })) === 1;
  if (!visible) notFound();

  const [conversation, nbConversations] = await Promise.all([
    mienne ? null : prisma.conversation.findUnique({ where: { annonceId_interlocuteurId: { annonceId: id, interlocuteurId: alias.id } } }),
    mienne ? prisma.conversation.count({ where: { annonceId: id } }) : 0,
  ]);
  const valeur = valeurAnnonce(annonce);

  return (
    <>
      <p><Link href={annonce.type === "OFFRE" ? "/sel" : "/sel/demandes"}>← {annonce.type === "OFFRE" ? "Services proposés" : "Services demandés"}</Link></p>
      {publiee && <div className="message-info" role="status" style={{ marginBottom: "1rem" }}>Votre annonce est publiée.</div>}

      <article className="sel-fiche">
        <p className="meta">
          <span className="badge badge-neutre">{annonce.rubrique.libelle}</span> <span className="badge">{libellesNature[annonce.nature]}</span>{" "}
          <span className="badge badge-ocre">{libellesType[annonce.type]}</span>
          {annonce.statut !== "PUBLIEE" && <> <span className="badge badge-terracotta">{annonce.statut === "MASQUEE" ? "Masquée par la modération" : "Close"}</span></>}
        </p>
        <h1>{annonce.titre}</h1>
        <p className="meta">
          Par <span className="sel-code-inline">{annonce.auteur.code}</span> · publiée le {formatDate(annonce.createdAt)}
        </p>

        <div className="grille sel-fiche-grille">
          <div className="sel-fiche-texte">
            <TexteSimple texte={annonce.description} />
            {annonce.rubrique.rappel && <p className="encart">⚠️ {annonce.rubrique.rappel}</p>}
          </div>
          <dl className="liste-def carte">
            <dt>Où</dt><dd>📍 {annonce.zone}</dd>
            <dt>Comment</dt><dd>{libellesModalite[annonce.modalite]}</dd>
            {valeur && (<><dt>Valeur</dt><dd>{valeur}</dd></>)}
            {annonce.disponibilites && (<><dt>Disponibilités</dt><dd>{annonce.disponibilites}</dd></>)}
            {annonce.dateFin && (<><dt>Jusqu'au</dt><dd>{formatDate(annonce.dateFin)}</dd></>)}
            {annonce.motsCles && (<><dt>Mots-clés</dt><dd>{annonce.motsCles}</dd></>)}
          </dl>
        </div>
      </article>

      {mienne ? (
        <section className="carte carte-bleu section-admin">
          <h2>C'est votre annonce</h2>
          <p>{nbConversations ? <Link href="/sel/messages">{nbConversations} conversation(s) à son sujet →</Link> : "Personne ne vous a encore écrit à son sujet."}</p>
          {annonce.statut !== "MASQUEE" && (
            <div className="actions">
              <Link href={`/sel/annonces/${id}/modifier`} className="bouton bouton-secondaire">Modifier</Link>
              <form action={changerStatutAnnonce}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="statut" value={annonce.statut === "PUBLIEE" ? "CLOTUREE" : "PUBLIEE"} />
                <BoutonEnvoi className="bouton bouton-secondaire">{annonce.statut === "PUBLIEE" ? "Clore l'annonce" : "Republier l'annonce"}</BoutonEnvoi>
              </form>
            </div>
          )}
        </section>
      ) : (
        <section className="carte section-admin">
          {conversation ? (
            <p>
              Vous êtes déjà en contact avec {annonce.auteur.code} à propos de cette annonce.{" "}
              <Link href={`/sel/messages/${conversation.id}`} className="bouton">Voir la conversation</Link>
            </p>
          ) : (
            <>
              <h2>Contacter {annonce.auteur.code}</h2>
              <FormulaireContacter annonceId={id} code={annonce.auteur.code} />
            </>
          )}
          <div className="refs" style={{ marginTop: "1rem" }}>
            <FormulaireSignalement annonceId={id} libelle="Signaler cette annonce" />
          </div>
        </section>
      )}
    </>
  );
}
