import { traiterSignalement } from "@/app/actions/signalements";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const horodatage = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

const STATUTS = {
  NOUVEAU: { texte: "Nouveau", classe: "badge-terracotta" },
  EN_COURS: { texte: "En cours", classe: "badge-ocre" },
  RESOLU: { texte: "Résolu", classe: "" },
  IGNORE: { texte: "Ignoré", classe: "badge-neutre" },
};

export default async function Signalements({ searchParams }) {
  await exigerAdmin();
  const { tous } = await searchParams;
  const signalements = await prisma.signalementBug.findMany({
    where: tous ? {} : { statut: { in: ["NOUVEAU", "EN_COURS"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { membre: { select: { prenom: true, nom: true } } },
  });

  return (
    <>
      <div className="coque-entete">
        <h1>Bugs signalés</h1>
        <nav className="filtres" aria-label="Filtrer les signalements">
          <a href="/admin/signalements" aria-current={!tous ? "true" : undefined}>À traiter</a>
          <a href="/admin/signalements?tous=1" aria-current={tous ? "true" : undefined}>Tous</a>
        </nav>
      </div>
      <p className="chapo">Signalements envoyés avec le bouton 🐞 présent sur toutes les pages.</p>

      {signalements.length === 0 && <p>Aucun signalement {tous ? "" : "à traiter"}. 🎉</p>}
      <div className="pile">
        {signalements.map((s) => (
          <article key={s.id} className="carte">
            <p className="meta">
              <span className={`badge ${STATUTS[s.statut].classe}`}>{STATUTS[s.statut].texte}</span>{" "}
              {horodatage.format(s.createdAt)} · page <code>{s.page}</code> ·{" "}
              {s.membre ? `${s.membre.prenom} ${s.membre.nom}` : s.email ?? "visiteur anonyme"}
            </p>
            <p className="texte-complet" style={{ maxHeight: "none" }}>{s.description}</p>
            <details>
              <summary className="meta">Détails techniques</summary>
              <p className="meta">Écran : {s.ecran ?? "—"}<br />Navigateur : {s.navigateur ?? "—"}</p>
            </details>
            <form action={traiterSignalement} className="actions" style={{ marginTop: "0.75rem" }}>
              <input type="hidden" name="id" value={s.id} />
              <select name="statut" defaultValue={s.statut} aria-label="Statut" style={{ width: "auto" }}>
                {Object.entries(STATUTS).map(([v, { texte }]) => (
                  <option key={v} value={v}>{texte}</option>
                ))}
              </select>
              <input type="text" name="note" defaultValue={s.note ?? ""} placeholder="Note interne (facultatif)" maxLength={1000} style={{ flex: "1 1 16rem", width: "auto" }} />
              <BoutonEnvoi className="bouton bouton-secondaire">Enregistrer</BoutonEnvoi>
            </form>
          </article>
        ))}
      </div>
    </>
  );
}
