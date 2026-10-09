import Link from "next/link";
import { notFound } from "next/navigation";
import { journaliser } from "@/lib/audit";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCreneau, formatHorodatage } from "@/lib/heure-paris";
import { libellesStatutEchange } from "@/lib/sel/regles";

export const metadata = { title: "Conversation signalée" };

// MSG-11 : un administrateur ne lit une conversation qu'après un signalement ou un litige, et c'est journalisé.
// 6.7 : l'association d'un code à une identité est elle aussi journalisée.
export default async function ConversationAdmin({ params }) {
  const admin = await exigerAdmin();
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      annonce: { select: { titre: true } },
      auteur: { select: { code: true, membre: { select: { prenom: true, nom: true } } } },
      interlocuteur: { select: { code: true, membre: { select: { prenom: true, nom: true } } } },
      messages: { orderBy: { createdAt: "asc" }, include: { emetteur: { select: { code: true } } } },
      echanges: { orderBy: { createdAt: "asc" } },
      _count: { select: { signalements: true } },
    },
  });
  if (!conversation) notFound();
  const litige = conversation.echanges.some((e) => e.statut === "LITIGE");
  if (!conversation._count.signalements && !litige) {
    return (
      <div className="message-erreur" role="alert">
        Cette conversation n'a fait l'objet d'aucun signalement ni litige : elle reste privée.
      </div>
    );
  }
  await journaliser({ acteurId: admin.id, action: "sel.conversation_consultee", cibleType: "Conversation", cibleId: id, motif: litige ? "litige" : "signalement" });

  const personne = (a) => `${a.code} (${a.membre.prenom} ${a.membre.nom})`;
  return (
    <>
      <p><Link href="/admin/sel/signalements">← Signalements</Link></p>
      <div className="coque-entete">
        <h1>{conversation.annonce.titre}</h1>
      </div>
      <p className="encart">Accès enregistré au journal d'audit. Entre {personne(conversation.auteur)} et {personne(conversation.interlocuteur)}.</p>
      {conversation.echanges.map((e) => (
        <p key={e.id} className="meta">
          Échange : <span className={`badge ${libellesStatutEchange[e.statut].classe}`}>{libellesStatutEchange[e.statut].texte}</span> · {formatCreneau(e.creneau)} · {e.lieu}
          {e.briques != null && ` · ${e.briques} briques déclarées`}
        </p>
      ))}
      <ol className="sel-messages">
        {conversation.messages.map((m) => (
          <li key={m.id} className="sel-message">
            <p className="sel-message-texte">{m.texte}</p>
            <div className="sel-message-meta">{m.emetteur.code} · {formatHorodatage(m.createdAt)}</div>
          </li>
        ))}
      </ol>
    </>
  );
}
