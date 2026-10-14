import { changerInscription } from "@/app/admin/sel/actions";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Inscriptions au SEL" };

// SEL-2, SEL-21, ADM-13 : l'assurance est déclarative, l'association ne vérifie pas sa validité
export default async function Inscriptions() {
  await exigerAdmin();
  const inscriptions = await prisma.inscriptionSel.findMany({
    orderBy: { createdAt: "desc" },
    include: { membre: { select: { prenom: true, nom: true, alias: { select: { code: true, soldeBriques: true } } } } },
  });

  return (
    <>
      <div className="coque-entete">
        <h1>Inscriptions au SEL</h1>
        <span className="meta">{inscriptions.length} inscrit{inscriptions.length > 1 ? "s" : ""}</span>
      </div>
      <p className="meta">
        L'assurance responsabilité civile est déclarée sur l'honneur à l'inscription : aucun document n'est déposé et
        l'association n'en vérifie pas la validité.
      </p>
      <div className="tableau-conteneur">
        <table>
          <thead>
            <tr>
              <th scope="col">Membre</th>
              <th scope="col">Assurance déclarée</th>
              <th scope="col">Solde</th>
              <th scope="col">Accès</th>
            </tr>
          </thead>
          <tbody>
            {inscriptions.map((i) => {
              const rc = i.assuranceRc;
              const alias = i.membre.alias;
              return (
                <tr key={i.id}>
                  <td>{i.membre.prenom} {i.membre.nom} <span className="meta">{alias?.code}</span></td>
                  <td>
                    {rc ? (
                      <>
                        {rc.compagnie}, contrat {rc.numeroPolice || "à compléter"}
                        <br />
                        <span className="meta">{rc.adresseCompagnie || "adresse à compléter"} · le {formatDate(rc.declareeLe)}</span>
                      </>
                    ) : (
                      <span className="badge badge-ocre">À déclarer</span>
                    )}
                  </td>
                  <td>{alias?.soldeBriques}</td>
                  <td>
                    <form action={changerInscription} className="actions">
                      <input type="hidden" name="id" value={i.id} />
                      {i.statut === "ACTIVE" ? (
                        <>
                          <input type="text" name="motif" placeholder="Motif" maxLength={500} style={{ width: "10rem" }} aria-label="Motif de suspension" />
                          <BoutonEnvoi name="action" value="suspendre" className="lien-danger" enCours="…">Suspendre</BoutonEnvoi>
                        </>
                      ) : (
                        <>
                          <span className="badge badge-terracotta">Suspendu</span>
                          <BoutonEnvoi name="action" value="reactiver" className="lien-action" enCours="…">Réactiver</BoutonEnvoi>
                        </>
                      )}
                    </form>
                  </td>
                </tr>
              );
            })}
            {inscriptions.length === 0 && (
              <tr><td className="vide" colSpan={4}>Aucun membre inscrit au SEL.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
