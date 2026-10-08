import Link from "next/link";
import { estAVenir, formatDate } from "@/lib/format";

export default function ArticleCard({ article }) {
  const aVenir = estAVenir(article.dateActivite);
  const couverture = article.medias?.[0];
  return (
    <article className="carte">
      {couverture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="vignette vignette-photo" src={couverture.url} alt={couverture.texteAlternatif} loading="lazy" />
      ) : (
        <div className="vignette" aria-hidden="true" />
      )}
      <p className="meta">
        <span className={`badge ${aVenir ? "badge-ocre" : "badge-neutre"}`}>{aVenir ? "À venir" : "Passée"}</span>{" "}
        {article.categorie}
        {article.dateActivite && <> · {formatDate(article.dateActivite)}</>}
      </p>
      <h3>
        <Link href={`/actualites/${article.slug}`}>{article.titre}</Link>
      </h3>
      {article.extrait && <p>{article.extrait}</p>}
    </article>
  );
}
