import Link from "next/link";
import { notFound } from "next/navigation";
import { age, finAnneeCivile } from "@/lib/adhesion";
import { journaliser } from "@/lib/audit";
import { exigerBureau } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, versChampDate } from "@/lib/format";
import { libellesModeReglement, libellesStatutDemande, libellesTypeTexte } from "@/lib/site";
import { BoutonRenvoyer, FormulaireRefus, FormulaireValidation } from "./Decisions";

const horodatage = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

export default async function Demande({ params, searchParams }) {
  const bureau = await exigerBureau();
  const { id } = await params;
  const { valide } = await searchParams;
  const d = await prisma.demandeAdhesion.findUnique({
    where: { id },
    include: {
      acceptations: { include: { texte: true }, orderBy: { accepteLe: "asc" } },
      decidePar: { select: { prenom: true, nom: true } },
      membre: { include: { alias: true } },
    },
  });
  if (!d) notFound();
  // RG-9 : tout accès d'un administrateur à une identité est journalisé
  await journaliser({ acteurId: bureau.id, action: "demande.consultee", cibleType: "DemandeAdhesion", cibleId: id });

  const a = age(d.dateNaissance);
  const statut = libellesStatutDemande[d.statut];

  return (
    <>
      <p><Link href="/admin/demandes">← Toutes les demandes</Link></p>
      <div className="coque-entete">
        <h1>{d.prenom} {d.nom}</h1>
        <span className={`badge ${statut.classe}`}>{statut.texte}</span>
      </div>
      {valide && (
        <div className="message-info" role="status" style={{ marginBottom: "1rem" }}>
          Adhésion validée. Le compte est créé (code {d.membre?.alias?.code}) et le lien d'activation a été envoyé à {d.email}.
        </div>
      )}

      <div className="grille" style={{ alignItems: "start" }}>
        <section className="carte">
          <h2>Bulletin d'adhésion</h2>
          <dl className="liste-def">
            <dt>Reçu le</dt><dd>{horodatage.format(d.createdAt)}</dd>
            <dt>E-mail</dt><dd>{d.email}</dd>
            <dt>Téléphone</dt><dd>{d.telephone}</dd>
            <dt>Naissance</dt><dd>{formatDate(d.dateNaissance)} ({a} ans)</dd>
            <dt>Adresse</dt><dd>{d.adresse}, {d.codePostal} {d.commune}</dd>
            {d.responsableNom && (
              <>
                <dt>Responsable légal</dt>
                <dd>{d.responsableNom} ({d.responsableLien}), {d.responsableTelephone}</dd>
              </>
            )}
            <dt>Droit à l'image</dt><dd>{d.droitImage ? "Autorise" : "N'autorise pas"}</dd>
            <dt>Cotisation annoncée</dt><dd>{Number(d.montantPropose)} € · {libellesModeReglement[d.modeReglement]}</dd>
          </dl>
        </section>

        <section className="carte">
          <h2>Acceptations et consentements</h2>
          <ul>
            {d.acceptations.map((acc) => (
              <li key={acc.id}>
                {libellesTypeTexte[acc.texte.type]}, version {acc.texte.version}, le {horodatage.format(acc.accepteLe)}
              </li>
            ))}
            <li>Levée d'anonymat : {d.consentementLeveeAnonymat ? "accepte" : "refuse"}</li>
            <li>Certification et signature électronique : {horodatage.format(d.certifieLe)}</li>
            <li>Conservation des données (RGPD) : {horodatage.format(d.consentementRgpdLe)}</li>
          </ul>
        </section>
      </div>

      {d.statut === "EN_ATTENTE" ? (
        <div className="section-admin">
          {a < 18 && <div className="encart">Postulant mineur : vérifiez l'accord du responsable légal avant de valider.</div>}
          <FormulaireValidation
            demande={{ id: d.id, montant: Number(d.montantPropose), modeReglement: d.modeReglement }}
            aujourdhui={versChampDate(new Date())}
            finAnnee={versChampDate(finAnneeCivile())}
          />
          <FormulaireRefus id={d.id} />
        </div>
      ) : (
        <section className="carte section-admin">
          <h2>Décision</h2>
          <p>
            {statut.texte} le {d.decideLe ? horodatage.format(d.decideLe) : "—"}
            {d.decidePar && ` par ${d.decidePar.prenom} ${d.decidePar.nom}`}.
          </p>
          {d.motifRefus && <p>Motif : {d.motifRefus}</p>}
          {d.membre && (
            <p>
              Compte : code <strong>{d.membre.alias?.code}</strong> ·{" "}
              {d.membre.statut === "EN_ATTENTE_ACTIVATION" ? "en attente d'activation par le membre" : "activé"}
            </p>
          )}
          {d.membre?.statut === "EN_ATTENTE_ACTIVATION" && <BoutonRenvoyer membreId={d.membre.id} />}
        </section>
      )}
    </>
  );
}
