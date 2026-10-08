import Link from "next/link";
import { notFound } from "next/navigation";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { exigerPublication } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, versChampDate } from "@/lib/format";
import { libellesStatutArticle as LIBELLES_STATUT } from "@/lib/site";
import { supprimerArticle } from "../actions";
import FormulaireArticle from "../FormulaireArticle";
import Photos from "../Photos";

export default async function ModifierArticle({ params, searchParams }) {
  await exigerPublication();
  const { id } = await params;
  const { cree } = await searchParams;
  const article = await prisma.article.findUnique({
    where: { id },
    include: { medias: { orderBy: { ordre: "asc" } }, auteur: { select: { prenom: true, nom: true } } },
  });
  if (!article) notFound();
  const statut = LIBELLES_STATUT[article.statut];

  return (
    <>
      <p><Link href="/admin/articles">← Tous les articles</Link></p>
      <div className="coque-entete">
        <h1>{article.titre}</h1>
        <span className={`badge ${statut.classe}`}>{statut.texte}</span>
      </div>
      <p className="meta">
        Créé par {article.auteur.prenom} {article.auteur.nom} · modifié le {formatDate(article.updatedAt)}
        {article.publieLe && ` · publié le ${formatDate(article.publieLe)}`}
        {article.statut === "PUBLIE" && (
          <> · <Link href={`/actualites/${article.slug}`}>Voir sur le site →</Link></>
        )}
      </p>
      {cree && <div className="message-info" role="status">Brouillon créé. Ajoutez des photos, puis publiez.</div>}

      <FormulaireArticle article={article} dateActivite={versChampDate(article.dateActivite)} />
      <Photos articleId={article.id} medias={article.medias} />

      {article.statut !== "PUBLIE" && (
        <section className="section-admin">
          <h2>Supprimer</h2>
          <form action={supprimerArticle} className="actions">
            <input type="hidden" name="id" value={article.id} />
            <span className="meta">Supprime l'article et ses photos, définitivement.</span>
            <BoutonEnvoi className="bouton bouton-danger" enCours="Suppression…">Supprimer l'article</BoutonEnvoi>
          </form>
        </section>
      )}
    </>
  );
}
