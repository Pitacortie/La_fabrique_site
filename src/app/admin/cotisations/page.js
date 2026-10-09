import { finAnneeCivile } from "@/lib/adhesion";
import { exigerBureau } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, versChampDate } from "@/lib/format";
import { libellesModeReglement } from "@/lib/site";
import { anneeARenouveler } from "@/lib/taches";
import { BoutonRappels, FormulaireCotisation } from "./Formulaires";

// ADM-12 : cotisations saisies par le Bureau et tableau des échéances ; ADH-10 : rappels.
export default async function Cotisations() {
  await exigerBureau();
  const membres = await prisma.membre.findMany({
    where: { statut: { in: ["ACTIF", "EN_ATTENTE_ACTIVATION", "SUSPENDU"] } },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: {
      alias: true,
      cotisations: { orderBy: { valideJusquau: "desc" }, take: 1, include: { saisiePar: { select: { prenom: true, nom: true } } } },
    },
  });
  const maintenant = new Date();
  const annee = anneeARenouveler(maintenant);
  const anneeReference = annee ?? maintenant.getFullYear();
  const finReference = new Date(Date.UTC(anneeReference, 11, 31));
  const aJour = (m) => m.cotisations[0] && m.cotisations[0].valideJusquau >= finReference;
  const nbAJour = membres.filter(aJour).length;

  return (
    <>
      <div className="coque-entete">
        <h1>Cotisations</h1>
      </div>
      <p className="chapo">
        Aucun paiement en ligne : les cotisations reçues sont enregistrées ici par un membre du Bureau (1 € minimum par
        année civile).
      </p>

      <div className="stats">
        <div className="stat"><div className="valeur">{nbAJour}</div><div className="libelle">Membres à jour pour {anneeReference}</div></div>
        <div className="stat"><div className="valeur">{membres.length - nbAJour}</div><div className="libelle">À renouveler pour {anneeReference}</div></div>
      </div>

      <section className="carte carte-ocre" style={{ marginBottom: "1.5rem" }}>
        <h2>Rappels de renouvellement</h2>
        <p>
          Du 1er décembre au 31 janvier, chaque membre qui n'a pas renouvelé reçoit un rappel par e-mail, au plus une
          fois toutes les deux semaines, avec les modalités de paiement de la page Adhérer.{" "}
          {annee ? <strong>Période en cours : renouvellement {annee}.</strong> : "Nous ne sommes pas en période de renouvellement."}
        </p>
        <BoutonRappels periode={!!annee} />
      </section>

      <FormulaireCotisation
        membres={membres.map((m) => ({ id: m.id, nom: m.nom, prenom: m.prenom, code: m.alias?.code ?? "" }))}
        aujourdhui={versChampDate(maintenant)}
        finAnnee={versChampDate(annee ? finReference : finAnneeCivile(maintenant))}
      />

      <h2 style={{ marginTop: "2rem" }}>Échéances</h2>
      <div className="tableau-conteneur">
        <table>
          <thead>
            <tr>
              <th scope="col">Membre</th>
              <th scope="col">Dernière cotisation</th>
              <th scope="col">Valable jusqu'au</th>
              <th scope="col">Saisie par</th>
              <th scope="col">Dernier rappel</th>
              <th scope="col">État</th>
            </tr>
          </thead>
          <tbody>
            {membres.length ? (
              membres.map((m) => {
                const c = m.cotisations[0];
                return (
                  <tr key={m.id}>
                    <td>{m.nom} {m.prenom} <span className="meta">{m.alias?.code}</span></td>
                    <td>{c ? `${Number(c.montant)} € · ${libellesModeReglement[c.modeReglement]}` : "—"}</td>
                    <td>{c ? formatDate(c.valideJusquau) : "—"}</td>
                    <td>{c?.saisiePar ? `${c.saisiePar.prenom} ${c.saisiePar.nom}` : "—"}</td>
                    <td>{m.dernierRappelCotisation ? formatDate(m.dernierRappelCotisation) : "—"}</td>
                    <td>{aJour(m) ? <span className="badge">À jour</span> : <span className="badge badge-terracotta">À renouveler</span>}</td>
                  </tr>
                );
              })
            ) : (
              <tr><td className="vide" colSpan={6}>Aucun membre.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
