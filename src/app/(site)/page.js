import Link from "next/link";
import ArticleCard from "@/components/ArticleCard";
import FabricationCard from "@/components/FabricationCard";
import BlocEditable from "@/components/edition/BlocEditable";
import FabricationsEditables from "@/components/edition/FabricationsEditables";
import { getArticlesPublies, getFabricationsVisibles, getToutesFabrications } from "@/lib/articles";
import { getMembreConnecte, peutEditerSite, peutPublier } from "@/lib/auth";
import { getContenus } from "@/lib/contenus";
import { site } from "@/lib/site";

const actions = [
  { titre: "Porter la parole des habitants", texte: "Recueillir les attentes et les idées, et les faire vivre collectivement.", couleur: "bleu" },
  { titre: "Dynamiser la vie locale", texte: "Événements, ateliers et rencontres pour le « vivre ensemble ».", couleur: "terracotta" },
  { titre: "Solidarité et entraide", texte: "Actions d'entraide, accès aux droits et liens entre générations.", couleur: "vert" },
  { titre: "Soutenir les initiatives", texte: "Accompagner les projets citoyens portés par les habitants.", couleur: "ocre" },
];

export default async function Accueil() {
  const edition = await peutEditerSite();
  const [textes, derniers, fabrications, membre] = await Promise.all([
    getContenus(["accueil.intro", "accueil.fabrications", "accueil.encart"]),
    getArticlesPublies({ take: 3 }), // ACC-5 : les trois derniers articles publiés
    edition ? getToutesFabrications() : getFabricationsVisibles(),
    getMembreConnecte(),
  ]);

  return (
    <>
      <section className="heros conteneur">
        <h1>{site.nom}</h1>
        <p className="accroche">{site.accroche}</p>
        <BlocEditable cle="accueil.intro" texte={textes["accueil.intro"]} className="chapo" />
        <div className="actions">
          <Link href="/adherer" className="bouton">Rejoindre l'association</Link>
          <Link href="/presentation">→ Découvrir La Fabrique</Link>
        </div>
      </section>

      <section className="section section-alt">
        <div className="conteneur">
          <h2>Ce que nous faisons</h2>
          <div className="grille">
            {actions.map((a) => (
              <div key={a.titre} className={`carte carte-${a.couleur}`}>
                <h3>{a.titre}</h3>
                <p>{a.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section conteneur">
        <div className="coque-entete">
          <h2>Dernières actualités</h2>
          <span className="actions">
            {edition && peutPublier(membre) && (
              <Link href="/admin/articles/nouveau" className="bouton bouton-secondaire">+ Nouvel article</Link>
            )}
            <Link href="/actualites">Toutes les actualités et la galerie →</Link>
          </span>
        </div>
        {derniers.length ? (
          <div className="grille">
            {derniers.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        ) : (
          <p>Les premières actualités arrivent bientôt.</p>
        )}
      </section>

      {(fabrications.length > 0 || edition) && (
        <section className="section section-alt">
          <div className="conteneur">
            <h2>Nos « Fabrications »</h2>
            <BlocEditable cle="accueil.fabrications" texte={textes["accueil.fabrications"]} className="chapo" />
            {edition ? (
              <FabricationsEditables fabrications={fabrications} />
            ) : (
              <div className="grille">
                {fabrications.map((f) => (
                  <FabricationCard key={f.id} fabrication={f} />
                ))}
              </div>
            )}
            <div className="actions" style={{ marginTop: "1.5rem" }}>
              <Link href="/espace/fabrications" className="bouton bouton-secondaire">Accéder à mes services</Link>
            </div>
          </div>
        </section>
      )}

      <section className="section conteneur">
        <div className="encart">
          <strong>Vos attentes, vos projets.</strong>
          <BlocEditable cle="accueil.encart" texte={textes["accueil.encart"]} />
          <Link href="/contact">Nous écrire →</Link>
        </div>
      </section>
    </>
  );
}
