import Link from "next/link";
import FabricationCard from "@/components/FabricationCard";
import BlocEditable from "@/components/edition/BlocEditable";
import FabricationsEditables from "@/components/edition/FabricationsEditables";
import { getFabricationsVisibles, getToutesFabrications } from "@/lib/articles";
import { peutEditerSite } from "@/lib/auth";
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
  const [textes, fabrications] = await Promise.all([
    getContenus(["accueil.intro", "accueil.fabrications", "accueil.encart"]),
    edition ? getToutesFabrications() : getFabricationsVisibles(),
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

      {(fabrications.length > 0 || edition) && (
        <section className="section section-alt">
          <div className="conteneur">
            <h2>Nos initiatives</h2>
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
              <Link href="/espace/initiatives" className="bouton bouton-secondaire">Accéder aux initiatives (adhérents)</Link>
            </div>
          </div>
        </section>
      )}

      <section className="section conteneur">
        <div className="encart">
          <strong>Boîte à idées.</strong>
          <BlocEditable cle="accueil.encart" texte={textes["accueil.encart"]} />
          <Link href="/contact?sujet=projet">Déposer une idée →</Link>
        </div>
      </section>
    </>
  );
}
