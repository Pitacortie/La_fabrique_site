import Link from "next/link";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { changerStatutMessage } from "./actions";
import FormulaireReponse from "./FormulaireReponse";

const horodatage = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

const STATUTS = {
  NOUVEAU: { texte: "Nouveau", classe: "badge-terracotta" },
  EN_COURS: { texte: "En cours", classe: "badge-ocre" },
  TRAITE: { texte: "Traité", classe: "" },
};

// ADM-4 : messages reçus via la page Contacts (dont les propositions « Vos attentes, vos projets »).
export default async function Messages({ searchParams }) {
  await exigerAdmin();
  const { tous, id, repondu } = await searchParams;
  const messages = await prisma.messageContact.findMany({
    where: tous || id ? {} : { statut: { in: ["NOUVEAU", "EN_COURS"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { reponduPar: { select: { prenom: true, nom: true } } },
  });

  return (
    <>
      <div className="coque-entete">
        <h1>Messages reçus</h1>
        <nav className="filtres" aria-label="Filtrer les messages">
          <Link href="/admin/messages" aria-current={!tous ? "true" : undefined}>À traiter</Link>
          <Link href="/admin/messages?tous=1" aria-current={tous ? "true" : undefined}>Tous</Link>
        </nav>
      </div>
      <p className="chapo">Messages envoyés depuis la page Contacts. L'expéditeur a reçu un accusé de réception.</p>
      {repondu && (
        <div className="message-info" role="status" style={{ marginBottom: "1rem" }}>
          Réponse envoyée.
        </div>
      )}

      {messages.length === 0 && <p>Aucun message à traiter.</p>}
      <div className="pile">
        {messages.map((m) => (
          <article key={m.id} id={m.id} className={`carte${m.id === id ? " carte-bleu" : ""}`}>
            <p className="meta">
              <span className={`badge ${STATUTS[m.statut].classe}`}>{STATUTS[m.statut].texte}</span>{" "}
              {horodatage.format(m.createdAt)} · <strong>{m.sujet}</strong>
            </p>
            <p>
              <strong>{m.nom}</strong> · <a href={`mailto:${m.email}`}>{m.email}</a>
              {m.telephone && ` · ${m.telephone}`}
            </p>
            <p className="texte-complet" style={{ maxHeight: "none" }}>{m.texte}</p>

            {m.reponse ? (
              <div className="encart">
                <p className="meta">
                  Réponse envoyée le {horodatage.format(m.reponduLe)}
                  {m.reponduPar && ` par ${m.reponduPar.prenom} ${m.reponduPar.nom}`}
                </p>
                <p className="texte-complet" style={{ maxHeight: "none", margin: 0 }}>{m.reponse}</p>
              </div>
            ) : (
              <FormulaireReponse id={m.id} nom={m.nom} />
            )}

            <form action={changerStatutMessage} className="actions" style={{ marginTop: "0.75rem" }}>
              <input type="hidden" name="id" value={m.id} />
              <select name="statut" defaultValue={m.statut} aria-label="Statut" style={{ width: "auto" }}>
                {Object.entries(STATUTS).map(([v, { texte }]) => (
                  <option key={v} value={v}>{texte}</option>
                ))}
              </select>
              <BoutonEnvoi className="bouton bouton-secondaire">Changer le statut</BoutonEnvoi>
            </form>
          </article>
        ))}
      </div>
    </>
  );
}
