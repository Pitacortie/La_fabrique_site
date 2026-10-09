import Link from "next/link";
import { getContenus } from "@/lib/contenus";
import { site } from "@/lib/site";

export default async function Footer() {
  const c = await getContenus(["site.siege", "site.facebook", "site.instagram"]);
  // ACT-11 : simples liens, sans widget de réseau social ; affichés seulement s'ils sont renseignés
  const reseaux = [
    { nom: "Facebook", url: c["site.facebook"] },
    { nom: "Instagram", url: c["site.instagram"] },
  ].filter((r) => r.url?.startsWith("https://"));
  return (
    <footer className="pied">
      <div className="conteneur">
        <div className="pied-grille">
          <div>
            <h2>{site.nom}</h2>
            <p>
              {site.forme}
              <br />
              Siège social : {c["site.siege"].replace(/\n/g, ", ")}
            </p>
            <p>Association indépendante, non partisane et non confessionnelle.</p>
          </div>
          <div>
            <h2>Le site</h2>
            <ul>
              <li><Link href="/presentation">Présentation</Link></li>
              <li><Link href="/documents">Statuts, règlement et charte</Link></li>
              <li><Link href="/actualites">Actualités et galerie</Link></li>
              <li><Link href="/adherer">Adhérer</Link></li>
              <li><Link href="/contact">Contacts</Link></li>
            </ul>
          </div>
          {reseaux.length > 0 && (
            <div>
              <h2>Nous suivre</h2>
              <ul>
                {reseaux.map((r) => (
                  <li key={r.nom}>
                    <a href={r.url} rel="noopener noreferrer">{r.nom}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="pied-bas">
          <span>© {new Date().getFullYear()} {site.nom}</span>
          <span>
            <Link href="/mentions-legales">Mentions légales</Link> ·{" "}
            <Link href="/confidentialite">Données personnelles</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
