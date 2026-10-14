import Link from "next/link";
import TexteSimple from "@/components/TexteSimple";
import { peutEditerSite } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata = { title: "La gazette de la Fabrique" };

// P11, GAZ-1 à GAZ-5 : numéros du plus récent au plus ancien, les plus anciens dans les archives
export default async function Gazette() {
  const [edition, numeros] = await Promise.all([
    peutEditerSite(),
    prisma.numeroGazette.findMany({ where: { publie: true }, orderBy: [{ parution: "desc" }, { createdAt: "desc" }] }).catch(() => []),
  ]);
  const [dernier, ...archives] = numeros;
  const parAnnee = {};
  for (const n of archives) (parAnnee[n.parution.getUTCFullYear()] ??= []).push(n);

  const Lien = ({ n }) =>
    n.fichier ? (
      <a href={n.fichier} target="_blank" rel="noopener" className="bouton bouton-secondaire">Lire le numéro (PDF)</a>
    ) : null;

  return (
    <div className="conteneur section">
      <div className="coque-entete">
        <h1>La gazette de la Fabrique</h1>
        {edition && <Link href="/admin/gazette" className="bouton">+ Publier un numéro</Link>}
      </div>
      <p className="chapo">Le journal de l'association : la vie de La Fabrique et de Ménesplet, numéro après numéro.</p>

      {dernier ? (
        <section className="carte carte-ocre section-admin">
          <p className="meta">Dernier numéro{dernier.numero ? ` · n° ${dernier.numero}` : ""} · {formatDate(dernier.parution)}</p>
          <h2>{dernier.titre}</h2>
          {dernier.resume && <TexteSimple texte={dernier.resume} />}
          <Lien n={dernier} />
        </section>
      ) : (
        <p>Le premier numéro arrive bientôt.</p>
      )}

      {archives.length > 0 && (
        <section className="section-admin">
          <h2>Archives</h2>
          {Object.keys(parAnnee)
            .sort((a, b) => b - a)
            .map((annee) => (
              <div key={annee}>
                <h3>{annee}</h3>
                <ul className="gazette-archives">
                  {parAnnee[annee].map((n) => (
                    <li key={n.id}>
                      {n.fichier ? <a href={n.fichier} target="_blank" rel="noopener">{n.titre}</a> : n.titre}
                      <span className="meta"> · {n.numero ? `n° ${n.numero} · ` : ""}{formatDate(n.parution)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </section>
      )}
    </div>
  );
}
