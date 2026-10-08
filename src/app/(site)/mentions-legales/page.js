import { getContenus } from "@/lib/contenus";
import { site } from "@/lib/site";

export const metadata = { title: "Mentions légales" };

export default async function MentionsLegales() {
  const c = await getContenus(["site.siege", "site.email"]);
  return (
    <div className="conteneur section">
      <h1>Mentions légales</h1>
      <dl className="liste-def">
        <dt>Éditeur</dt>
        <dd>{site.nom}, {site.forme.toLowerCase()}</dd>
        <dt>Siège social</dt>
        <dd>{c["site.siege"].replace(/\n/g, ", ")}</dd>
        <dt>Directeur de la publication</dt>
        <dd>À compléter (Président ou co-présidence)</dd>
        <dt>Hébergeur</dt>
        <dd>À compléter</dd>
        <dt>Contact</dt>
        <dd>{c["site.email"]}</dd>
      </dl>
      <p className="refs" style={{ marginTop: "2rem" }}>Texte à rédiger ou à faire relire (cahier des charges, section 13.1).</p>
    </div>
  );
}
