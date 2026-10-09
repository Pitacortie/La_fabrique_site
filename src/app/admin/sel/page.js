import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCreneau } from "@/lib/heure-paris";
import { ALERTE_BRIQUES, duree } from "@/lib/sel/regles";
import { DecisionLitige } from "./Formulaires";

export const metadata = { title: "SEL" };

// Tableau de bord du SEL : à vérifier, à modérer, litiges, soldes à surveiller (ADM-6, ADM-7, ADM-14)
export default async function TableauSel() {
  await exigerAdmin();
  const [attestations, signalements, inscrits, annonces, litiges, soldesHauts, soldesBas] = await Promise.all([
    prisma.attestationRc.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.signalementSel.count({ where: { statut: "NOUVEAU" } }),
    prisma.inscriptionSel.count({ where: { statut: "ACTIVE" } }),
    prisma.annonce.count({ where: { statut: "PUBLIEE" } }),
    prisma.echange.findMany({
      where: { statut: "LITIGE" },
      include: { conversation: { select: { id: true, annonce: { select: { titre: true } } } }, beneficiaire: { select: { code: true } }, prestataire: { select: { code: true } } },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.alias.findMany({ where: { soldeBriques: { gt: ALERTE_BRIQUES } }, select: { code: true, soldeBriques: true }, orderBy: { soldeBriques: "desc" } }),
    prisma.alias.findMany({ where: { soldeBriques: { lt: -100 } }, select: { code: true, soldeBriques: true, plancherBriques: true }, orderBy: { soldeBriques: "asc" } }),
  ]);

  return (
    <>
      <div className="coque-entete">
        <h1>SEL</h1>
        <Link href="/sel">Ouvrir le SEL →</Link>
      </div>
      <div className="stats">
        <Link href="/admin/sel/inscriptions" className="stat" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="valeur">{attestations}</div><div className="libelle">Attestations d'assurance à vérifier</div>
        </Link>
        <Link href="/admin/sel/signalements" className="stat" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="valeur">{signalements}</div><div className="libelle">Signalements à traiter</div>
        </Link>
        <div className="stat"><div className="valeur">{litiges.length}</div><div className="libelle">Litiges en médiation</div></div>
        <div className="stat"><div className="valeur">{inscrits}</div><div className="libelle">Membres inscrits au SEL</div></div>
        <Link href="/admin/sel/annonces" className="stat" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="valeur">{annonces}</div><div className="libelle">Annonces en ligne</div>
        </Link>
      </div>

      <section className="section-admin">
        <h2>Litiges à régler par une médiation du CA</h2>
        {litiges.length === 0 && <p>Aucun litige. 🎉</p>}
        {litiges.map((e) => (
          <article key={e.id} className="carte carte-terracotta">
            <p className="meta">{formatCreneau(e.creneau)} · {e.lieu}</p>
            <p>
              <strong>{e.conversation.annonce.titre}</strong>
              <br />
              {e.prestataire.code} a déclaré {e.dureeMinutes ? duree(e.dureeMinutes) : ""} ({e.briques ?? 0} briques) ; {e.beneficiaire.code} conteste :
              « {e.motifAnnulation} »
            </p>
            <p><Link href={`/admin/sel/conversations/${e.conversation.id}`}>Lire la conversation (accès journalisé) →</Link></p>
            <DecisionLitige id={e.id} />
          </article>
        ))}
      </section>

      <section className="section-admin">
        <h2>Soldes à surveiller</h2>
        <p className="meta">Au-delà de {ALERTE_BRIQUES} briques : concertation du CA, sans sanction. Sous -100 : proche du minimum de -120.</p>
        {soldesHauts.length + soldesBas.length === 0 ? (
          <p>Aucun solde à surveiller.</p>
        ) : (
          <ul>
            {soldesHauts.map((a) => <li key={a.code}>{a.code} : <strong>+{a.soldeBriques}</strong> briques</li>)}
            {soldesBas.map((a) => <li key={a.code}>{a.code} : <strong>{a.soldeBriques}</strong> briques{a.plancherBriques != null && ` (dérogation : ${a.plancherBriques})`}</li>)}
          </ul>
        )}
      </section>
    </>
  );
}
