import Link from "next/link";
import TexteSimple from "@/components/TexteSimple";
import { decalerMois, evenementsAVenir, evenementsDuMois, moisCourant, moisValide, nomDuMois, semainesDuMois } from "@/lib/agenda";
import { peutEditerSite } from "@/lib/auth";
import { formatCreneau, formatHeure, partiesParis } from "@/lib/heure-paris";

export const metadata = { title: "Agenda" };

const JOURS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

function Horaire({ e }) {
  return (
    <>
      {formatCreneau(e.debut)}
      {e.fin && <> – {partiesParis(e.fin).jour === partiesParis(e.debut).jour ? formatHeure(e.fin) : formatCreneau(e.fin)}</>}
    </>
  );
}

// P10, AGE-1 à AGE-5 : événements et rencontres à venir. Pas d'inscription en ligne.
export default async function Agenda({ searchParams }) {
  const { vue, mois: demande } = await searchParams;
  const calendrier = vue === "mois";
  const mois = moisValide(demande) ?? moisCourant();
  const [edition, evenements] = await Promise.all([peutEditerSite(), calendrier ? evenementsDuMois(mois) : evenementsAVenir()]);

  const parJour = {};
  for (const e of evenements) (parJour[partiesParis(e.debut).jour] ??= []).push(e);
  const aujourdhui = partiesParis(new Date()).jour;

  return (
    <div className="conteneur section">
      <div className="coque-entete">
        <h1>Agenda</h1>
        {edition && <Link href="/admin/agenda" className="bouton">+ Ajouter un événement</Link>}
      </div>
      <p className="chapo">Les événements et rencontres à venir de l'association. Ils sont ouverts à tous, sans inscription en ligne.</p>

      <nav className="filtres" aria-label="Affichage">
        <Link href="/agenda" aria-current={!calendrier ? "true" : undefined}>Liste</Link>
        <Link href={`/agenda?vue=mois&mois=${mois}`} aria-current={calendrier ? "true" : undefined}>Calendrier du mois</Link>
      </nav>

      {calendrier ? (
        <section aria-labelledby="titre-mois">
          <div className="agenda-mois-entete">
            <Link href={`/agenda?vue=mois&mois=${decalerMois(mois, -1)}`} aria-label="Mois précédent">←</Link>
            <h2 id="titre-mois">{nomDuMois(mois)}</h2>
            <Link href={`/agenda?vue=mois&mois=${decalerMois(mois, 1)}`} aria-label="Mois suivant">→</Link>
          </div>
          <div className="tableau-conteneur">
            <table className="agenda-calendrier">
              <thead>
                <tr>{JOURS.map((j) => <th key={j} scope="col">{j}</th>)}</tr>
              </thead>
              <tbody>
                {semainesDuMois(mois).map((semaine, i) => (
                  <tr key={i}>
                    {semaine.map((jour, k) => (
                      <td key={k} className={jour === aujourdhui ? "agenda-aujourdhui" : undefined}>
                        {jour && (
                          <>
                            <span className="agenda-numero">{Number(jour.slice(8))}</span>
                            {(parJour[jour] ?? []).map((e) => (
                              <a key={e.id} href={`#e-${e.id}`} className="agenda-pastille">
                                {formatHeure(e.debut)} {e.titre}
                              </a>
                            ))}
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {evenements.length ? (
        <ol className="agenda-liste">
          {evenements.map((e) => (
            <li key={e.id} id={`e-${e.id}`} className="carte">
              <p className="meta"><Horaire e={e} /></p>
              <h2>{e.titre}</h2>
              <p>📍 {e.lieu}</p>
              {e.description && <TexteSimple texte={e.description} />}
            </li>
          ))}
        </ol>
      ) : (
        <p>{calendrier ? "Aucun événement ce mois-ci." : "Aucun événement prévu pour le moment. Revenez bientôt !"}</p>
      )}
    </div>
  );
}
