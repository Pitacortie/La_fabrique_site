import Link from "next/link";
import { modererAnnonce } from "@/app/admin/sel/actions";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { libellesNature, libellesType } from "@/lib/sel/regles";

export const metadata = { title: "Annonces du SEL" };

// ADM-6, NEU-3 : modération des annonces (critères : Charte de La Fabrique, principes 1, 2 et 6)
export default async function AnnoncesSel({ searchParams }) {
  await exigerAdmin();
  const { masquees } = await searchParams;
  const annonces = await prisma.annonce.findMany({
    where: masquees ? { statut: "MASQUEE" } : { statut: { not: "MASQUEE" } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { auteur: { select: { code: true } }, rubrique: { select: { libelle: true } }, _count: { select: { signalements: true } } },
  });

  return (
    <>
      <div className="coque-entete">
        <h1>Annonces du SEL</h1>
        <nav className="filtres" aria-label="Filtrer">
          <Link href="/admin/sel/annonces" aria-current={!masquees ? "true" : undefined}>En ligne et closes</Link>
          <Link href="/admin/sel/annonces?masquees=1" aria-current={masquees ? "true" : undefined}>Masquées</Link>
        </nav>
      </div>
      <p className="chapo">Une annonce partisane, discriminatoire, agressive ou contraire au règlement peut être masquée, avec un motif journalisé.</p>
      <div className="pile">
        {annonces.map((a) => (
          <article key={a.id} className="carte">
            <p className="meta">
              {libellesType[a.type]} · {libellesNature[a.nature]} · {a.rubrique.libelle} · {a.auteur.code} · {formatDate(a.createdAt)}
              {a._count.signalements > 0 && <> · <span className="badge badge-terracotta">{a._count.signalements} signalement(s)</span></>}
              {a.statut === "CLOTUREE" && <> · <span className="badge badge-neutre">Close</span></>}
            </p>
            <p><Link href={`/sel/annonces/${a.id}`}><strong>{a.titre}</strong></Link></p>
            <p className="meta">{a.description.slice(0, 200)}{a.description.length > 200 ? "…" : ""}</p>
            <form action={modererAnnonce} className="actions">
              <input type="hidden" name="id" value={a.id} />
              {a.statut === "MASQUEE" ? (
                <>
                  <span className="meta">Motif : {a.motifModeration}</span>
                  <BoutonEnvoi name="action" value="reafficher" className="bouton bouton-secondaire">Réafficher</BoutonEnvoi>
                </>
              ) : (
                <>
                  <input type="text" name="motif" required maxLength={500} placeholder="Motif (obligatoire)" aria-label="Motif" style={{ flex: "1 1 14rem", width: "auto" }} />
                  <BoutonEnvoi name="action" value="masquer" className="bouton bouton-danger">Masquer</BoutonEnvoi>
                </>
              )}
            </form>
          </article>
        ))}
        {annonces.length === 0 && <p>Aucune annonce.</p>}
      </div>
    </>
  );
}
