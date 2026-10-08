import Link from "next/link";
import { exigerPublication } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { libellesStatutArticle as LIBELLES_STATUT } from "@/lib/site";

export default async function Articles() {
  await exigerPublication();
  const articles = await prisma.article.findMany({
    orderBy: { updatedAt: "desc" },
    include: { auteur: { select: { prenom: true, nom: true } }, _count: { select: { medias: true } } },
  });

  return (
    <>
      <div className="coque-entete">
        <h1>Actualités et galerie</h1>
        <Link href="/admin/articles/nouveau" className="bouton">Nouvel article</Link>
      </div>
      <p className="chapo">Articles sur les activités passées et à venir. Seuls les articles publiés apparaissent sur le site.</p>
      <div className="tableau-conteneur">
        <table>
          <thead>
            <tr>
              <th scope="col">Titre</th>
              <th scope="col">Catégorie</th>
              <th scope="col">Activité</th>
              <th scope="col">Statut</th>
              <th scope="col">Photos</th>
              <th scope="col">Auteur</th>
              <th scope="col">Modifié le</th>
            </tr>
          </thead>
          <tbody>
            {articles.length ? (
              articles.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/admin/articles/${a.id}`}>{a.titre}</Link></td>
                  <td>{a.categorie}</td>
                  <td>{a.dateActivite ? formatDate(a.dateActivite) : "—"}</td>
                  <td><span className={`badge ${LIBELLES_STATUT[a.statut].classe}`}>{LIBELLES_STATUT[a.statut].texte}</span></td>
                  <td>{a._count.medias}</td>
                  <td>{a.auteur.prenom} {a.auteur.nom}</td>
                  <td>{formatDate(a.updatedAt)}</td>
                </tr>
              ))
            ) : (
              <tr><td className="vide" colSpan={7}>Aucun article. Créez le premier !</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
