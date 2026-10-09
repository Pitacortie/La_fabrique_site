import Link from "next/link";
import { exigerAccesSel } from "@/lib/sel/acces";
import { listerAnnonces, rubriquesActives } from "@/lib/sel/donnees";
import { libellesModalite, libellesNature } from "@/lib/sel/regles";
import CarteAnnonce from "./CarteAnnonce";

// Bibliothèque Offres ou Demandes (SEL-3, SEL-4), avec recherche et filtres (SEL-6).
export default async function BibliothequeAnnonces({ type, searchParams, chemin }) {
  const { alias } = await exigerAccesSel(chemin);
  const filtres = await searchParams;
  const [annonces, rubriques] = await Promise.all([listerAnnonces({ type, ...filtres }), rubriquesActives()]);
  const actifs = ["q", "rubrique", "nature", "modalite", "zone"].some((k) => filtres[k]);

  return (
    <>
      <h1 className="sr-only">{type === "OFFRE" ? "Services proposés" : "Services demandés"}</h1>
      <form className="sel-recherche" role="search" action={chemin}>
        <div className="sel-recherche-principale">
          <label htmlFor="q" className="sr-only">Rechercher</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filtres.q ?? ""}
            maxLength={100}
            placeholder={type === "OFFRE" ? "Rechercher un service proposé : tonte, couture, informatique…" : "Rechercher une demande…"}
          />
          <button type="submit" className="bouton">Rechercher</button>
        </div>
        <div className="sel-filtres">
          <select name="rubrique" defaultValue={filtres.rubrique ?? ""} aria-label="Catégorie">
            <option value="">Toutes les catégories</option>
            {rubriques.map((r) => (
              <option key={r.id} value={r.code}>{r.libelle}</option>
            ))}
          </select>
          <select name="nature" defaultValue={filtres.nature ?? ""} aria-label="Nature">
            <option value="">Services et objets</option>
            {Object.entries(libellesNature).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select name="modalite" defaultValue={filtres.modalite ?? ""} aria-label="Modalité">
            <option value="">En personne ou à distance</option>
            {Object.entries(libellesModalite).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input name="zone" type="text" defaultValue={filtres.zone ?? ""} placeholder="Commune" aria-label="Commune" maxLength={60} />
          {actifs && <Link href={chemin}>Effacer les filtres</Link>}
        </div>
      </form>

      {/* Raccourcis par catégorie */}
      <nav className="filtres sel-rubriques" aria-label="Catégories">
        {rubriques.map((r) => (
          <Link key={r.id} href={`${chemin}?rubrique=${r.code}`} aria-current={filtres.rubrique === r.code ? "true" : undefined}>
            {r.libelle}
          </Link>
        ))}
      </nav>

      <p className="meta" role="status">
        {annonces.length} annonce{annonces.length > 1 ? "s" : ""}
        {actifs ? " correspondant à votre recherche" : ""}
      </p>
      {annonces.length ? (
        <div className="grille">
          {annonces.map((a) => (
            <CarteAnnonce key={a.id} annonce={a} mienne={a.auteurId === alias.id} />
          ))}
        </div>
      ) : (
        <div className="encart">
          <p>Aucune annonce pour le moment{actifs ? " avec ces critères" : ""}.</p>
          <Link href="/sel/annonces/nouvelle" className="bouton">
            {type === "OFFRE" ? "Proposer un service" : "Faire une demande"}
          </Link>
        </div>
      )}
    </>
  );
}
