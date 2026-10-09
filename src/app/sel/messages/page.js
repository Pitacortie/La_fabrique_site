import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatHorodatage } from "@/lib/heure-paris";
import { exigerAccesSel } from "@/lib/sel/acces";
import { filtreMesConversations } from "@/lib/sel/donnees";
import { libellesStatutEchange } from "@/lib/sel/regles";

export const metadata = { title: "Mes messages" };

export default async function Messages() {
  const { alias } = await exigerAccesSel("/sel/messages");
  const conversations = await prisma.conversation.findMany({
    where: filtreMesConversations(alias.id),
    orderBy: { dernierMessageLe: "desc" },
    take: 100,
    include: {
      annonce: { select: { titre: true, type: true } },
      auteur: { select: { code: true } },
      interlocuteur: { select: { code: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      echanges: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: { where: { luLe: null, emetteurId: { not: alias.id } } } } },
    },
  });

  return (
    <>
      <h1>Mes messages</h1>
      {conversations.length === 0 ? (
        <div className="encart">
          <p>Pas encore de conversation. Trouvez une annonce qui vous intéresse et cliquez sur « Contacter ».</p>
          <Link href="/sel" className="bouton">Voir les services proposés</Link>
        </div>
      ) : (
        <ul className="sel-liste-conv">
          {conversations.map((c) => {
            const autre = c.auteurId === alias.id ? c.interlocuteur.code : c.auteur.code;
            const dernier = c.messages[0];
            const echange = c.echanges[0];
            const nonLus = c._count.messages;
            return (
              <li key={c.id}>
                <Link href={`/sel/messages/${c.id}`} className={`sel-conv-ligne${nonLus ? " sel-conv-non-lue" : ""}`}>
                  <span className="sel-conv-ligne-haut">
                    <strong>{c.annonce.titre}</strong>
                    {nonLus > 0 && <span className="pastille">{nonLus}</span>}
                  </span>
                  <span className="meta">
                    avec <span className="sel-code-inline">{autre}</span>
                    {echange && <> · <span className={`badge ${libellesStatutEchange[echange.statut].classe}`}>{libellesStatutEchange[echange.statut].texte}</span></>}
                    {c.statut === "FERMEE" && <> · <span className="badge badge-neutre">Fermée</span></>}
                  </span>
                  {dernier && (
                    <span className="sel-conv-apercu">
                      {dernier.emetteurId === alias.id ? "Vous : " : ""}
                      {dernier.texte.length > 90 ? `${dernier.texte.slice(0, 90)}…` : dernier.texte}
                      <span className="meta"> · {formatHorodatage(dernier.createdAt)}</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
