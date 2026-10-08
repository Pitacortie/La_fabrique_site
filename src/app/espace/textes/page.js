import { exigerMembre } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function MesTextes() {
  const membre = await exigerMembre();
  const acceptations = await prisma.acceptation.findMany({
    where: { membreId: membre.id },
    include: { texte: true },
    orderBy: { accepteLe: "desc" },
  });

  return (
    <>
      <div className="coque-entete">
        <h1>Mes textes acceptés</h1>
      </div>
      <p className="chapo">Si un texte change, son acceptation vous sera redemandée à la connexion suivante.</p>
      <div className="tableau-conteneur">
        <table>
          <thead>
            <tr>
              <th scope="col">Texte</th>
              <th scope="col">Version</th>
              <th scope="col">Accepté le</th>
            </tr>
          </thead>
          <tbody>
            {acceptations.length ? (
              acceptations.map((a) => (
                <tr key={a.id}>
                  <td>{a.texte.titre}</td>
                  <td>{a.texte.version}</td>
                  <td>{formatDate(a.accepteLe)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="vide" colSpan={3}>
                  Aucune acceptation enregistrée. Elles sont créées lors de la demande d'adhésion.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
