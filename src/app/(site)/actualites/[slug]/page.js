import Link from "next/link";
import { notFound } from "next/navigation";
import Galerie from "@/components/Galerie";
import TexteSimple from "@/components/TexteSimple";
import { getArticlePublie } from "@/lib/articles";
import { getMembreConnecte, peutEditerSite, peutPublier } from "@/lib/auth";
import { estAVenir, formatDate } from "@/lib/format";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getArticlePublie(slug);
  return { title: article?.titre ?? "Actualité", description: article?.extrait ?? undefined };
}

export default async function Article({ params }) {
  const { slug } = await params;
  const article = await getArticlePublie(slug);
  if (!article) notFound();
  const aVenir = estAVenir(article.dateActivite);
  const edition = (await peutEditerSite()) && peutPublier(await getMembreConnecte());

  return (
    <article className="conteneur section">
      <p><Link href="/actualites">← Actualités</Link></p>
      <h1>{article.titre}</h1>
      {edition && (
        <p>
          <Link href={`/admin/articles/${article.id}`} className="bouton bouton-secondaire crayon-lien">
            ✏️ Modifier cet article et ses photos
          </Link>
        </p>
      )}
      <p className="meta">
        <span className={`badge ${aVenir ? "badge-ocre" : "badge-neutre"}`}>{aVenir ? "À venir" : "Passée"}</span>{" "}
        {article.categorie}
        {article.dateActivite && <> · activité du {formatDate(article.dateActivite)}</>}
        {article.publieLe && <> · publié le {formatDate(article.publieLe)}</>}
      </p>
      {article.extrait && <p className="chapo"><strong>{article.extrait}</strong></p>}
      <div className="texte-article">
        <TexteSimple texte={article.contenu} />
      </div>

      {article.medias.length > 0 && (
        <>
          <h2>Galerie</h2>
          <Galerie medias={article.medias} />
        </>
      )}
    </article>
  );
}
