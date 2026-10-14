import BoutonEnvoi from "@/components/BoutonEnvoi";
import { ALERTES, alertesPossibles } from "@/lib/alertes";
import { exigerBureau } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enregistrerAlertes } from "./actions";

export const metadata = { title: "Alertes par e-mail" };

const ROLES = { ADMINISTRATEUR: "Administrateur", BUREAU: "Bureau" };

export default async function Alertes({ searchParams }) {
  await exigerBureau();
  const { enregistre } = await searchParams;
  const membres = await prisma.membre.findMany({
    where: { role: { in: ["BUREAU", "ADMINISTRATEUR"] }, statut: { not: "CLOTURE" } },
    orderBy: [{ role: "desc" }, { nom: "asc" }],
    select: { id: true, nom: true, prenom: true, email: true, role: true, statut: true, alertes: true },
  });

  return (
    <>
      <div className="coque-entete">
        <h1>Alertes par e-mail</h1>
      </div>
      <p>
        Choisissez qui est prévenu par e-mail, et pour quoi. Sans alerte, rien n'est perdu : tout reste visible dans
        la console (demandes, inscriptions, messages, signalements).
      </p>

      {membres.map((m) => {
        const possibles = alertesPossibles(m.role);
        return (
          <section key={m.id} className="carte section-admin" id={`m-${m.id}`}>
            <h2>
              {m.prenom} {m.nom} <span className="meta">· {ROLES[m.role]} · {m.email}</span>
            </h2>
            {enregistre === m.id && <div className="message-info" role="status">Alertes enregistrées.</div>}
            {m.statut !== "ACTIF" && <p className="meta">Compte inactif : aucune alerte ne lui est envoyée.</p>}
            <form action={enregistrerAlertes}>
              <input type="hidden" name="id" value={m.id} />
              {possibles.map((type) => (
                <label key={type} className="case">
                  <input type="checkbox" name={type} defaultChecked={m.alertes.includes(type)} />
                  <span>{ALERTES[type].libelle}</span>
                </label>
              ))}
              <div className="actions" style={{ marginTop: "1rem" }}>
                <BoutonEnvoi className="bouton bouton-secondaire">Enregistrer</BoutonEnvoi>
              </div>
            </form>
          </section>
        );
      })}
      {membres.length === 0 && <p>Aucun administrateur.</p>}
    </>
  );
}
