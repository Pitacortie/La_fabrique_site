import Link from "next/link";
import { age } from "@/lib/adhesion";
import { exigerBureau } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { libellesModeReglement, libellesStatutDemande } from "@/lib/site";

// ADM-1 : traitement des demandes d'adhésion, réservé au Bureau.
export default async function Demandes({ searchParams }) {
  await exigerBureau();
  const { vue } = await searchParams;
  const traitees = vue === "traitees";
  const demandes = await prisma.demandeAdhesion.findMany({
    where: traitees ? { statut: { not: "EN_ATTENTE" } } : { statut: "EN_ATTENTE" },
    orderBy: traitees ? { decideLe: "desc" } : { createdAt: "asc" },
    take: 200,
  });

  return (
    <>
      <div className="coque-entete">
        <h1>Demandes d'adhésion</h1>
        <nav className="filtres" aria-label="Filtrer les demandes">
          <Link href="/admin/demandes" aria-current={!traitees ? "true" : undefined}>En attente</Link>
          <Link href="/admin/demandes?vue=traitees" aria-current={traitees ? "true" : undefined}>Traitées</Link>
        </nav>
      </div>
      <p className="chapo">
        Validez une demande une fois la cotisation reçue : le compte, le code personnel et le lien d'activation sont
        créés en une seule opération.
      </p>
      <div className="tableau-conteneur">
        <table>
          <thead>
            <tr>
              <th scope="col">Reçue le</th>
              <th scope="col">Nom</th>
              <th scope="col">Commune</th>
              <th scope="col">Âge</th>
              <th scope="col">Cotisation annoncée</th>
              <th scope="col">Statut</th>
              <th scope="col"><span className="sr-only">Ouvrir</span></th>
            </tr>
          </thead>
          <tbody>
            {demandes.length ? (
              demandes.map((d) => {
                const statut = libellesStatutDemande[d.statut];
                const a = age(d.dateNaissance);
                return (
                  <tr key={d.id}>
                    <td>{formatDate(d.createdAt)}</td>
                    <td>{d.prenom} {d.nom}</td>
                    <td>{d.commune}</td>
                    <td>{a < 18 ? <span className="badge badge-ocre">{a} ans · mineur</span> : `${a} ans`}</td>
                    <td>{Number(d.montantPropose)} € · {libellesModeReglement[d.modeReglement]}</td>
                    <td><span className={`badge ${statut.classe}`}>{statut.texte}</span></td>
                    <td><Link href={`/admin/demandes/${d.id}`}>{traitees ? "Voir" : "Traiter"} →</Link></td>
                  </tr>
                );
              })
            ) : (
              <tr><td className="vide" colSpan={7}>{traitees ? "Aucune demande traitée." : "Aucune demande en attente."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
