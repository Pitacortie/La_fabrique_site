import { changerInscription, changerPlancher } from "@/app/admin/sel/actions";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, versChampDate } from "@/lib/format";
import { PLANCHER_BRIQUES } from "@/lib/sel/regles";
import { VerificationAttestation } from "../Formulaires";

export const metadata = { title: "Inscriptions au SEL" };

export default async function Inscriptions() {
  await exigerAdmin();
  const [aVerifier, inscriptions] = await Promise.all([
    prisma.attestationRc.findMany({
      where: { statut: "EN_ATTENTE" },
      orderBy: { createdAt: "asc" },
      include: { membre: { select: { prenom: true, nom: true, email: true, alias: { select: { code: true } } } } },
    }),
    prisma.inscriptionSel.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        membre: {
          select: {
            prenom: true,
            nom: true,
            alias: { select: { id: true, code: true, soldeBriques: true, plancherBriques: true } },
            attestationsRc: { orderBy: { createdAt: "desc" }, take: 1, include: { verifiePar: { select: { prenom: true, nom: true } } } },
          },
        },
      },
    }),
  ]);
  const demain = versChampDate(new Date(Date.now() + 86_400_000));

  return (
    <>
      <div className="coque-entete">
        <h1>Inscriptions au SEL</h1>
      </div>

      <section className="section-admin">
        <h2>Attestations d'assurance à vérifier ({aVerifier.length})</h2>
        <p className="meta">
          Ouvrez l'attestation, vérifiez qu'elle est au nom du membre et en cours de validité, puis saisissez la date de
          fin lue sur le document. Le fichier est supprimé dès la décision.
        </p>
        {aVerifier.length === 0 && <p>Aucune attestation en attente.</p>}
        {aVerifier.map((a) => (
          <article key={a.id} className="carte">
            <p>
              <strong>{a.membre.prenom} {a.membre.nom}</strong> ({a.membre.alias?.code}) · {a.membre.email}
              <br />
              Assureur : {a.assureur} · validité déclarée : {formatDate(a.valideJusquau)} · déposée le {formatDate(a.createdAt)}
            </p>
            {a.fichier && (
              <p>
                <a href={`/admin/sel/attestations/${a.id}/fichier`} target="_blank" rel="noopener">Ouvrir l'attestation (accès journalisé) ↗</a>
              </p>
            )}
            <VerificationAttestation id={a.id} dateDeclaree={versChampDate(a.valideJusquau)} demain={demain} />
          </article>
        ))}
      </section>

      <section className="section-admin">
        <h2>Membres inscrits ({inscriptions.length})</h2>
        <div className="tableau-conteneur">
          <table>
            <thead>
              <tr>
                <th scope="col">Membre</th>
                <th scope="col">Assurance</th>
                <th scope="col">Solde</th>
                <th scope="col">Solde minimum</th>
                <th scope="col">Accès</th>
              </tr>
            </thead>
            <tbody>
              {inscriptions.map((i) => {
                const rc = i.membre.attestationsRc[0];
                const alias = i.membre.alias;
                return (
                  <tr key={i.id}>
                    <td>{i.membre.prenom} {i.membre.nom} <span className="meta">{alias?.code}</span></td>
                    <td>
                      {rc ? (
                        <>
                          {rc.statut === "VALIDEE" ? `jusqu'au ${formatDate(rc.valideJusquau)}` : rc.statut === "EN_ATTENTE" ? "à vérifier" : "refusée"}
                          {rc.verifiePar && <span className="meta"> · par {rc.verifiePar.prenom} {rc.verifiePar.nom}</span>}
                        </>
                      ) : "—"}
                    </td>
                    <td>{alias?.soldeBriques}</td>
                    <td>
                      <form action={changerPlancher} className="actions">
                        <input type="hidden" name="aliasId" value={alias?.id} />
                        <input type="number" name="plancher" min="-1440" max="0" defaultValue={alias?.plancherBriques ?? PLANCHER_BRIQUES} style={{ width: "6rem" }} aria-label="Solde minimum" />
                        <BoutonEnvoi className="lien-action" enCours="…">OK</BoutonEnvoi>
                      </form>
                    </td>
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
                <tr><td className="vide" colSpan={5}>Aucun membre inscrit au SEL.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
