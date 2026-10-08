import Link from "next/link";
import ArticleCard from "@/components/ArticleCard";
import { getArticlesPublies, getCategoriesPubliees } from "@/lib/articles";
import { getMembreConnecte, peutEditerSite, peutPublier } from "@/lib/auth";
import { estAVenir } from "@/lib/format";

export const metadata = { title: "Actualités et galerie" };

const periodes = [
  { cle: "toutes", label: "Toutes" },
  { cle: "a-venir", label: "À venir" },
  { cle: "passees", label: "Passées" },
];

function lien(periode, categorie) {
  const p = new URLSearchParams();
  if (periode !== "toutes") p.set("filtre", periode);
  if (categorie) p.set("categorie", categorie);
  const q = p.toString();
  return q ? `/actualites?${q}` : "/actualites";
}

// ACT-3 : du plus récent au plus ancien, filtres « à venir » / « passées » et par catégorie.
export default async function Actualites({ searchParams }) {
  const { filtre = "toutes", categorie } = await searchParams;
  const [tous, categories, membre, edition] = await Promise.all([
    getArticlesPublies({ categorie }),
    getCategoriesPubliees(),
    getMembreConnecte(),
    peutEditerSite(),
  ]);
  const articles = tous.filter((a) => {
    if (filtre === "a-venir") return estAVenir(a.dateActivite);
    if (filtre === "passees") return !estAVenir(a.dateActivite);
    return true;
  });

  return (
    <div className="conteneur section">
      <div className="coque-entete">
        <h1>Actualités et galerie</h1>
        {edition && peutPublier(membre) && (
          <span className="actions">
            <Link href="/admin/articles/nouveau" className="bouton">+ Nouvel article</Link>
            <Link href="/admin/articles">Brouillons et articles retirés →</Link>
          </span>
        )}
      </div>
      <p className="chapo">Les activités passées et à venir de l'association, en textes et en photos.</p>

      <nav className="filtres" aria-label="Filtrer par période">
        {periodes.map((f) => (
          <Link key={f.cle} href={lien(f.cle, categorie)} aria-current={filtre === f.cle ? "true" : undefined}>
            {f.label}
          </Link>
        ))}
      </nav>
      {categories.length > 1 && (
        <nav className="filtres" aria-label="Filtrer par catégorie">
          <Link href={lien(filtre)} aria-current={!categorie ? "true" : undefined}>Toutes catégories</Link>
          {categories.map((c) => (
            <Link key={c} href={lien(filtre, c)} aria-current={categorie === c ? "true" : undefined}>{c}</Link>
          ))}
        </nav>
      )}

      {articles.length ? (
        <div className="grille">
          {articles.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      ) : (
        <p>Aucune actualité pour le moment.</p>
      )}
    </div>
  );
}
