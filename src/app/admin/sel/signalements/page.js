import Link from "next/link";
import { traiterSignalementSel } from "@/app/admin/sel/actions";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatHorodatage } from "@/lib/heure-paris";
import { libellesMotifSignalement } from "@/lib/sel/regles";

export const metadata = { title: "Signalements du SEL" };

// MSG-7, NEU-4 : signalements de messages et d'annonces
export default async function SignalementsSel({ searchParams }) {
  await exigerAdmin();
  const { tous } = await searchParams;
  const signalements = await prisma.signalementSel.findMany({
    where: tous ? {} : { statut: "NOUVEAU" },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      signaleur: { select: { code: true } },
      annonce: { select: { id: true, titre: true, auteur: { select: { code: true } } } },
      message: { select: { texte: true, emetteur: { select: { code: true } } } },
    },
  });

  return (
    <>
      <div className="coque-entete">
        <h1>Signalements du SEL</h1>
        <nav className="filtres" aria-label="Filtrer">
          <Link href="/admin/sel/signalements" aria-current={!tous ? "true" : undefined}>À traiter</Link>
          <Link href="/admin/sel/signalements?tous=1" aria-current={tous ? "true" : undefined}>Tous</Link>
        </nav>
      </div>
      <p className="chapo">
        Un signalement conduit d'abord au dialogue, puis à la médiation si besoin. La conversation d'un message
        signalé peut être lue ; chaque lecture est journalisée.
      </p>
      {signalements.length === 0 && <p>Aucun signalement à traiter.</p>}
      <div className="pile">
        {signalements.map((s) => (
          <article key={s.id} className="carte">
            <p className="meta">
              <span className={`badge ${s.statut === "NOUVEAU" ? "badge-terracotta" : ""}`}>{s.statut === "NOUVEAU" ? "Nouveau" : "Traité"}</span>{" "}
              {formatHorodatage(s.createdAt)} · {libellesMotifSignalement[s.motif]} · signalé par {s.signaleur.code}
            </p>
            {s.message && (
              <blockquote className="encart">
                <p className="meta">Message de {s.message.emetteur.code} :</p>
                <p className="texte-complet" style={{ margin: 0, maxHeight: "none" }}>{s.message.texte}</p>
              </blockquote>
            )}
            {s.annonce && (
              <p>Annonce : <Link href={`/sel/annonces/${s.annonce.id}`}>{s.annonce.titre}</Link> ({s.annonce.auteur.code}) · <Link href="/admin/sel/annonces">modérer</Link></p>
            )}
            {s.details && <p>Précisions : {s.details}</p>}
            {s.conversationId && <p><Link href={`/admin/sel/conversations/${s.conversationId}`}>Lire la conversation (accès journalisé) →</Link></p>}
            {s.statut === "NOUVEAU" ? (
              <form action={traiterSignalementSel} className="actions">
                <input type="hidden" name="id" value={s.id} />
                <input type="text" name="note" maxLength={1000} placeholder="Suite donnée (note interne)" aria-label="Note" style={{ flex: "1 1 16rem", width: "auto" }} />
                <BoutonEnvoi className="bouton bouton-secondaire">Marquer comme traité</BoutonEnvoi>
              </form>
            ) : (
              s.note && <p className="meta">Suite donnée : {s.note}</p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
