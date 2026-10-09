import Link from "next/link";
import { notFound } from "next/navigation";
import { fermerConversation, revelerIdentite } from "@/app/sel/actions/messagerie";
import { FormulaireEtape, FormulaireSignalement } from "@/app/sel/Formulaires";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { prisma } from "@/lib/db";
import { formatHorodatage } from "@/lib/heure-paris";
import { exigerAccesSel } from "@/lib/sel/acces";
import { conversationDe } from "@/lib/sel/conversations";
import { anonymatLeve, libellesType, roles } from "@/lib/sel/regles";
import Echange from "./Echange";
import { DefilerEnBas, FormulaireMessage, Rafraichir } from "./Fil";

export const metadata = { title: "Conversation" };

export default async function Conversation({ params }) {
  const { id } = await params;
  const { alias } = await exigerAccesSel(`/sel/messages/${id}`);
  const conversation = await conversationDe(id, alias.id);
  if (!conversation) notFound(); // MSG-11 : seuls les deux alias lisent le fil

  const suisAuteur = conversation.auteurId === alias.id;
  const autreId = suisAuteur ? conversation.interlocuteurId : conversation.auteurId;
  const r = roles(conversation.annonce, conversation);
  const suis = r.prestataireId === alias.id ? "prestataire" : "beneficiaire";

  const [autre, messages, echanges] = await Promise.all([
    prisma.alias.findUnique({ where: { id: autreId }, select: { code: true } }),
    prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" }, take: 500 }),
    prisma.echange.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } }),
  ]);
  // Messages reçus marqués comme lus
  await prisma.message.updateMany({ where: { conversationId: id, emetteurId: autreId, luLe: null }, data: { luLe: new Date() } });

  // Section 6.5 : identités visibles seulement quand les deux ont donné leur accord
  const leve = anonymatLeve(conversation);
  const monAccord = suisAuteur ? conversation.accordAuteurLe : conversation.accordInterlocuteurLe;
  const sonAccord = suisAuteur ? conversation.accordInterlocuteurLe : conversation.accordAuteurLe;
  const identite = leve
    ? await prisma.alias.findUnique({ where: { id: autreId }, select: { membre: { select: { prenom: true, nom: true, telephone: true, commune: true } } } })
    : null;

  const actif = echanges.findLast((e) => ["PROPOSE", "CONFIRME", "DECLARE"].includes(e.statut));
  const passes = echanges.filter((e) => e !== actif);
  const ouverte = conversation.statut === "OUVERTE";
  const demain = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Rafraichir />
      <p><Link href="/sel/messages">← Mes messages</Link></p>

      {/* MSG-5 : l'annonce concernée est rappelée en tête du fil */}
      <header className="carte sel-conv-entete">
        <p className="meta">{libellesType[conversation.annonce.type]} · {suis === "prestataire" ? "vous rendez le service" : "vous recevez le service"}</p>
        <h1 className="sel-conv-titre"><Link href={`/sel/annonces/${conversation.annonce.id}`}>{conversation.annonce.titre}</Link></h1>
        <p>Avec <span className="sel-code-inline">{autre.code}</span>{identite && <> : <strong>{identite.membre.prenom} {identite.membre.nom}</strong></>}</p>
      </header>

      <div className="sel-conv">
        <div className="sel-conv-fil">
          {!ouverte && <p className="encart">Cette conversation est fermée : plus aucun message ne peut être envoyé.</p>}
          <ol className="sel-messages" id="fil">
            {messages.map((m) => {
              const moi = m.emetteurId === alias.id;
              return (
                <li key={m.id} className={`sel-message${moi ? " sel-message-moi" : ""}`}>
                  <p className="sel-message-texte">{m.texte}</p>
                  <div className="sel-message-meta">
                    {moi ? "Vous" : autre.code} · {formatHorodatage(m.createdAt)}
                    {moi && m.luLe && " · lu"}
                    {!moi && <> · <FormulaireSignalement messageId={m.id} libelle="signaler" /></>}
                  </div>
                </li>
              );
            })}
          </ol>
          <DefilerEnBas cible="fil" />
          {ouverte && (
            <>
              <p className="aide">Ne donnez ni nom, ni adresse, ni numéro de téléphone avant la levée d'anonymat.</p>
              <FormulaireMessage conversationId={id} />
            </>
          )}
        </div>

        <aside className="sel-conv-cote">
          {/* Levée d'anonymat (section 6.5) */}
          <section className="sel-etape">
            <h2>Identités</h2>
            {leve ? (
              <dl className="liste-def">
                <dt>Nom</dt><dd>{identite.membre.prenom} {identite.membre.nom}</dd>
                <dt>Téléphone</dt><dd>{identite.membre.telephone ?? "—"}</dd>
                <dt>Commune</dt><dd>{identite.membre.commune ?? "—"}</dd>
              </dl>
            ) : monAccord ? (
              <p className="meta">Vous avez accepté de révéler votre identité. Elle sera visible, comme celle de {autre.code}, quand {autre.code} aura accepté aussi.</p>
            ) : (
              <FormulaireEtape action={revelerIdentite} className="formulaire sel-etape-formulaire">
                <input type="hidden" name="conversationId" value={id} />
                <p className="meta">
                  {sonAccord ? `${autre.code} a accepté de révéler son identité. ` : ""}
                  Pour vous rencontrer, échangez vos identités : prénom, nom, téléphone et commune. C'est définitif.
                </p>
                <label className="case">
                  <input type="checkbox" name="confirmation" required />
                  <span>J'accepte de révéler mon identité à {autre.code}.</span>
                </label>
                <BoutonEnvoi className="bouton bouton-secondaire">Révéler mon identité</BoutonEnvoi>
              </FormulaireEtape>
            )}
          </section>

          {ouverte && (
            <Echange
              conversation={conversation}
              echange={actif}
              suis={suis}
              autreCode={autre.code}
              peutProposer={conversation.annonce.modalite !== "PRESENTIEL" || leve}
              alias={alias}
              demain={demain}
            />
          )}
          {passes.length > 0 && (
            <details className="sel-historique">
              <summary>Échanges précédents ({passes.length})</summary>
              {passes.map((e) => (
                <Echange key={e.id} conversation={conversation} echange={e} suis={suis} autreCode={autre.code} alias={alias} />
              ))}
            </details>
          )}

          {ouverte && (
            <details className="sel-annuler">
              <summary className="lien-danger">Bloquer {autre.code}</summary>
              <form action={fermerConversation} className="sel-etape-formulaire">
                <input type="hidden" name="conversationId" value={id} />
                <p className="meta">La conversation sera fermée pour vous deux, et les rendez-vous en cours annulés.</p>
                <BoutonEnvoi className="bouton bouton-danger" enCours="…">Fermer la conversation</BoutonEnvoi>
              </form>
            </details>
          )}
        </aside>
      </div>
    </>
  );
}
