import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCreneau } from "@/lib/heure-paris";
import { exigerAccesSel } from "@/lib/sel/acces";
import { duree, libellesStatutEchange } from "@/lib/sel/regles";

export const metadata = { title: "Mes échanges" };

// Ce qui attend une action de ma part, en premier
function action(e, aliasId) {
  const prestataire = e.prestataireId === aliasId;
  if (e.statut === "PROPOSE" && prestataire) return "Confirmer le rendez-vous";
  if (e.statut === "CONFIRME" && prestataire && e.creneau <= new Date()) return "Déclarer le service rendu";
  if (e.statut === "DECLARE" && !prestataire) return "Confirmer la fin de l'échange";
  return null;
}

export default async function Echanges() {
  const { alias } = await exigerAccesSel("/sel/echanges");
  const echanges = await prisma.echange.findMany({
    where: { OR: [{ beneficiaireId: alias.id }, { prestataireId: alias.id }] },
    orderBy: { creneau: "desc" },
    take: 200,
    include: {
      conversation: { select: { id: true, annonce: { select: { titre: true } } } },
      beneficiaire: { select: { code: true } },
      prestataire: { select: { code: true } },
    },
  });
  const aFaire = echanges.filter((e) => action(e, alias.id));
  const autres = echanges.filter((e) => !action(e, alias.id));

  const Ligne = ({ e }) => {
    const prestataire = e.prestataireId === alias.id;
    const statut = libellesStatutEchange[e.statut];
    const a = action(e, alias.id);
    return (
      <li className="carte sel-echange-ligne">
        <p className="meta">
          <span className={`badge ${statut.classe}`}>{statut.texte}</span> · {formatCreneau(e.creneau)}
        </p>
        <p>
          <strong>{e.conversation.annonce.titre}</strong>
          <br />
          {prestataire ? `Vous rendez le service à ${e.beneficiaire.code}` : `${e.prestataire.code} vous rend le service`}
          {e.statut === "TERMINE" && e.briques > 0 && (
            <> · {prestataire ? "+" : "−"}{e.briques} briques{e.dureeMinutes ? ` (${duree(e.dureeMinutes)})` : ""}</>
          )}
        </p>
        <Link href={`/sel/messages/${e.conversation.id}`} className={a ? "bouton" : ""}>{a ?? "Voir la conversation"} →</Link>
      </li>
    );
  };

  return (
    <>
      <h1>Mes échanges</h1>
      {echanges.length === 0 && <p>Aucun échange pour le moment. Les rendez-vous se fixent dans la messagerie.</p>}
      {aFaire.length > 0 && (
        <section className="section-admin">
          <h2>À faire ({aFaire.length})</h2>
          <ul className="pile sans-puces">{aFaire.map((e) => <Ligne key={e.id} e={e} />)}</ul>
        </section>
      )}
      {autres.length > 0 && (
        <section className="section-admin">
          <h2>Historique</h2>
          <ul className="pile sans-puces">{autres.map((e) => <Ligne key={e.id} e={e} />)}</ul>
        </section>
      )}
    </>
  );
}
