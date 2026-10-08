import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, versChampDate } from "@/lib/format";
import { libellesTypeTexte } from "@/lib/site";
import FormulaireTexte from "./FormulaireTexte";

export default async function Textes() {
  const admin = await exigerAdmin();
  const textes = await prisma.texteJuridique.findMany({
    orderBy: [{ type: "asc" }, { enVigueurLe: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { acceptations: true } } },
  });
  const bureau = admin.role === "BUREAU";

  return (
    <>
      <div className="coque-entete">
        <h1>Statuts, règlement, charte</h1>
      </div>
      <p className="chapo">
        Toutes les versions sont conservées : chaque acceptation reste liée à la version que le membre a acceptée. La
        version en vigueur est la plus récente par date d'entrée en vigueur.
      </p>
      {!bureau && <div className="encart">Consultation seule : la modification des textes officiels est réservée au Bureau.</div>}

      {Object.entries(libellesTypeTexte).map(([type, libelle]) => {
        const versions = textes.filter((t) => t.type === type);
        if (!versions.length) return null;
        return (
          <section key={type} className="section-admin">
            <h2>{libelle}</h2>
            {versions.map((t, i) => (
              <details key={t.id} className="carte bloc-edition">
                <summary>
                  <strong>Version {t.version}</strong> · en vigueur le {formatDate(t.enVigueurLe)} ·{" "}
                  {t._count.acceptations} acceptation(s){" "}
                  {i === 0 && <span className="badge">En vigueur</span>}
                </summary>
                {bureau && t._count.acceptations === 0 ? (
                  <FormulaireTexte texte={t} enVigueurLe={versChampDate(t.enVigueurLe)} />
                ) : (
                  <pre className="texte-legal texte-complet">{t.contenu}</pre>
                )}
              </details>
            ))}
          </section>
        );
      })}

      {bureau && (
        <section className="section-admin">
          <h2>Publier une nouvelle version</h2>
          <p className="refs">
            Une nouvelle version sera proposée à l'acceptation des membres à leur prochaine connexion (à venir).
          </p>
          <div className="carte">
            <FormulaireTexte types={libellesTypeTexte} typeParDefaut="STATUTS" />
          </div>
        </section>
      )}
    </>
  );
}
