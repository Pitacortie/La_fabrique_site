import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { libellesCategorie } from "@/lib/site";

export const metadata = { title: "Membres" };

const STATUTS = {
  ACTIF: { texte: "Actif", classe: "" },
  EN_ATTENTE_ACTIVATION: { texte: "À activer", classe: "badge-ocre" },
  SUSPENDU: { texte: "Suspendu", classe: "badge-terracotta" },
  CLOTURE: { texte: "Clôturé", classe: "badge-neutre" },
};
const ROLES = { ADHERENT: "Adhérent", ADMINISTRATEUR: "Administrateur", BUREAU: "Bureau" };

// ADM-2 : liste des membres (recherche par nom, e-mail ou code)
export default async function Membres({ searchParams }) {
  await exigerAdmin();
  const { q = "", clotures, supprime } = await searchParams;
  const recherche = q.trim().slice(0, 100);
  const membres = await prisma.membre.findMany({
    where: {
      ...(clotures ? {} : { statut: { not: "CLOTURE" } }),
      ...(recherche
        ? {
            OR: [
              { nom: { contains: recherche, mode: "insensitive" } },
              { prenom: { contains: recherche, mode: "insensitive" } },
              { email: { contains: recherche, mode: "insensitive" } },
              { alias: { code: { contains: recherche, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    take: 300,
    include: { alias: true, cotisations: { orderBy: { valideJusquau: "desc" }, take: 1 }, inscriptionSel: true },
  });
  const jour = new Date();

  return (
    <>
      <div className="coque-entete">
        <h1>Membres</h1>
        <span className="meta">{membres.length} membre{membres.length > 1 ? "s" : ""}</span>
      </div>
      {supprime && (
        <div className="message-info" role="status" style={{ marginBottom: "1rem" }}>
          {supprime === "suppression"
            ? "Le membre a été supprimé définitivement."
            : "Le membre avait un historique d'échanges : son identité a été effacée et son compte clôturé. Seul son code reste dans l'historique des autres membres."}
        </div>
      )}
      <form className="actions" role="search" style={{ marginBottom: "1rem" }}>
        <input type="search" name="q" defaultValue={recherche} placeholder="Nom, e-mail ou code FAB-…" aria-label="Rechercher un membre" style={{ flex: "1 1 18rem", width: "auto" }} />
        <label className="case" style={{ marginTop: 0 }}>
          <input type="checkbox" name="clotures" defaultChecked={!!clotures} /> <span>Inclure les comptes clôturés</span>
        </label>
        <button type="submit" className="bouton bouton-secondaire">Rechercher</button>
      </form>
      <div className="tableau-conteneur">
        <table>
          <thead>
            <tr>
              <th scope="col">Membre</th>
              <th scope="col">Code</th>
              <th scope="col">Catégorie</th>
              <th scope="col">Rôle</th>
              <th scope="col">Cotisation</th>
              <th scope="col">SEL</th>
              <th scope="col">Statut</th>
            </tr>
          </thead>
          <tbody>
            {membres.map((m) => {
              const c = m.cotisations[0];
              return (
                <tr key={m.id}>
                  <td><Link href={`/admin/membres/${m.id}`}>{m.nom} {m.prenom}</Link><br /><span className="meta">{m.email}</span></td>
                  <td>{m.alias?.code}</td>
                  <td>{libellesCategorie[m.categorie]}</td>
                  <td>{ROLES[m.role]}</td>
                  <td>{c ? <span className={c.valideJusquau >= jour ? "" : "sel-moins"}>{formatDate(c.valideJusquau)}</span> : "—"}</td>
                  <td>{m.inscriptionSel ? (m.inscriptionSel.statut === "ACTIVE" ? `🧱 ${m.alias?.soldeBriques ?? 0}` : "suspendu") : "—"}</td>
                  <td><span className={`badge ${STATUTS[m.statut].classe}`}>{STATUTS[m.statut].texte}</span></td>
                </tr>
              );
            })}
            {membres.length === 0 && <tr><td className="vide" colSpan={7}>Aucun membre trouvé.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
