import Link from "next/link";
import { notFound } from "next/navigation";
import { journaliser } from "@/lib/audit";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { historiqueMembre } from "@/lib/membres";
import { libellesCategorie, libellesModeReglement, libellesTypeTexte } from "@/lib/site";
import { FormulaireRole, FormulaireStatut, FormulaireSuppression } from "./Formulaires";

export const metadata = { title: "Fiche membre" };

export default async function FicheMembre({ params }) {
  const admin = await exigerAdmin();
  const { id } = await params;
  const m = await prisma.membre.findUnique({
    where: { id },
    include: {
      alias: true,
      cotisations: { orderBy: { valideJusquau: "desc" }, include: { saisiePar: { select: { prenom: true, nom: true } } } },
      acceptations: { include: { texte: true }, orderBy: { accepteLe: "desc" } },
      inscriptionSel: true,
      attestationsRc: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!m) notFound();
  // RG-9 : tout accès d'un administrateur à une identité est journalisé
  await journaliser({ acteurId: admin.id, action: "membre.consulte", cibleType: "Membre", cibleId: id });
  const historique = await historiqueMembre(id);
  const bureau = admin.role === "BUREAU";
  const soi = admin.id === m.id;
  const cloture = m.statut === "CLOTURE";

  return (
    <>
      <p><Link href="/admin/membres">← Tous les membres</Link></p>
      <div className="coque-entete">
        <h1>{m.prenom} {m.nom}</h1>
        <span className="meta">{m.alias?.code}</span>
      </div>

      <div className="grille" style={{ alignItems: "start" }}>
        <section className="carte">
          <h2>Identité et coordonnées</h2>
          <dl className="liste-def">
            <dt>E-mail</dt><dd>{m.email}</dd>
            <dt>Téléphone</dt><dd>{m.telephone ?? "—"}</dd>
            <dt>Adresse</dt><dd>{m.adresse ? `${m.adresse}, ${m.codePostal} ${m.commune}` : "—"}</dd>
            <dt>Naissance</dt><dd>{m.dateNaissance ? formatDate(m.dateNaissance) : "—"}</dd>
            {m.responsableNom && (<><dt>Responsable légal</dt><dd>{m.responsableNom} ({m.responsableLien}), {m.responsableTelephone}</dd></>)}
            <dt>Droit à l'image</dt><dd>{m.droitImage ? "Autorise" : "N'autorise pas"}</dd>
            <dt>Catégorie</dt><dd>{libellesCategorie[m.categorie]}{m.dateAgrement && ` (depuis le ${formatDate(m.dateAgrement)})`}</dd>
            <dt>Membre depuis</dt><dd>{formatDate(m.createdAt)}</dd>
            <dt>Dernière connexion</dt><dd>{m.derniereConnexion ? formatDate(m.derniereConnexion) : "jamais"}</dd>
          </dl>
        </section>

        <section className="carte">
          <h2>Cotisations</h2>
          {m.cotisations.length === 0 ? <p>Aucune cotisation enregistrée.</p> : (
            <ul>
              {m.cotisations.map((c) => (
                <li key={c.id}>
                  {Number(c.montant)} € · {libellesModeReglement[c.modeReglement]} · reçue le {formatDate(c.recueLe)}, valable jusqu'au {formatDate(c.valideJusquau)}
                  {c.saisiePar && <span className="meta"> · saisie par {c.saisiePar.prenom} {c.saisiePar.nom}</span>}
                </li>
              ))}
            </ul>
          )}
          <h2>SEL</h2>
          <p>
            {m.inscriptionSel
              ? `Inscrit (${m.inscriptionSel.statut === "ACTIVE" ? "actif" : "suspendu"}) · solde 🧱 ${m.alias?.soldeBriques ?? 0} · assurance ${m.attestationsRc[0]?.statut === "VALIDEE" ? `jusqu'au ${formatDate(m.attestationsRc[0].valideJusquau)}` : "non validée"}`
              : "Pas inscrit au SEL."}
          </p>
          <h2>Textes acceptés</h2>
          <ul>
            {m.acceptations.map((a) => (
              <li key={a.id}>{libellesTypeTexte[a.texte.type]}, version {a.texte.version}, le {formatDate(a.accepteLe)}</li>
            ))}
            {m.acceptations.length === 0 && <li>Aucun.</li>}
          </ul>
        </section>
      </div>

      {bureau && !cloture && (
        <>
          <section className="carte section-admin">
            <h2>Rôle et catégorie</h2>
            <FormulaireRole membre={{ id: m.id, categorie: m.categorie, role: m.role, peutPublier: m.peutPublier }} />
          </section>
          {!soi && (
            <section className="carte section-admin">
              <h2>Suspendre le compte</h2>
              <p className="meta">Un compte suspendu ne peut plus se connecter ; ses données et son solde sont conservés.</p>
              <FormulaireStatut membre={{ id: m.id, statut: m.statut, motifStatut: m.motifStatut }} />
            </section>
          )}
          {!soi && (
            <section className="carte carte-terracotta section-admin">
              <h2>Supprimer le membre</h2>
              <FormulaireSuppression membre={{ id: m.id, email: m.email }} anonymisation={!historique.vide} />
            </section>
          )}
        </>
      )}
      {cloture && <div className="encart section-admin">Compte clôturé{m.motifStatut ? ` : ${m.motifStatut}` : ""}.</div>}
      {!bureau && <p className="refs section-admin">La modification et la suppression des membres sont réservées au Bureau.</p>}
    </>
  );
}
