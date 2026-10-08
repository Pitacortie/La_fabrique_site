import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const horodatage = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default async function Journal() {
  await exigerAdmin();
  const entrees = await prisma.journalAudit.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { acteur: { select: { prenom: true, nom: true } } },
  });

  return (
    <>
      <div className="coque-entete">
        <h1>Journal d'audit</h1>
      </div>
      <p className="chapo">
        Décisions d'adhésion, accès aux identités, publications et modifications : qui, quoi, quand. Les 200 dernières
        entrées.
      </p>
      <div className="tableau-conteneur">
        <table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Acteur</th>
              <th scope="col">Action</th>
              <th scope="col">Cible</th>
              <th scope="col">Détails</th>
            </tr>
          </thead>
          <tbody>
            {entrees.length ? (
              entrees.map((e) => (
                <tr key={e.id}>
                  <td>{horodatage.format(e.createdAt)}</td>
                  <td>{e.acteur ? `${e.acteur.prenom} ${e.acteur.nom}` : "Système"}</td>
                  <td><code>{e.action}</code></td>
                  <td>{e.cibleType}</td>
                  <td>{e.motif ?? (e.details ? Object.values(e.details).join(" · ") : "")}</td>
                </tr>
              ))
            ) : (
              <tr><td className="vide" colSpan={5}>Le journal est vide.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
