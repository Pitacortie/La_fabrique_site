import Link from "next/link";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { basculerNumero, supprimerNumero } from "./actions";
import FormulaireNumero from "./FormulaireNumero";

export const metadata = { title: "La gazette" };

export default async function GazetteAdmin() {
  await exigerAdmin();
  const numeros = await prisma.numeroGazette.findMany({ orderBy: [{ parution: "desc" }, { createdAt: "desc" }] });
  const prochain = Math.max(0, ...numeros.map((n) => n.numero ?? 0)) + 1;

  return (
    <>
      <div className="coque-entete">
        <h1>La gazette de la Fabrique</h1>
        <Link href="/gazette">Voir la page publique →</Link>
      </div>

      <section className="carte section-admin">
        <h2>Publier un numéro</h2>
        <FormulaireNumero prochainNumero={prochain} />
      </section>

      <section className="section-admin">
        <h2>Numéros ({numeros.length})</h2>
        <div className="tableau-conteneur">
          <table>
            <thead>
              <tr>
                <th scope="col">Numéro</th>
                <th scope="col">Titre</th>
                <th scope="col">Parution</th>
                <th scope="col">Sur le site</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {numeros.map((n) => (
                <tr key={n.id}>
                  <td>{n.numero ?? "—"}</td>
                  <td>{n.fichier ? <a href={n.fichier} target="_blank" rel="noopener">{n.titre}</a> : n.titre}</td>
                  <td>{formatDate(n.parution)}</td>
                  <td>{n.publie ? <span className="badge">Publié</span> : <span className="badge badge-neutre">Retiré</span>}</td>
                  <td>
                    <div className="actions">
                      <form action={basculerNumero}>
                        <input type="hidden" name="id" value={n.id} />
                        <BoutonEnvoi className="lien-action" enCours="…">{n.publie ? "Retirer du site" : "Republier"}</BoutonEnvoi>
                      </form>
                      {!n.publie && (
                        <form action={supprimerNumero}>
                          <input type="hidden" name="id" value={n.id} />
                          <BoutonEnvoi className="lien-danger" enCours="…">Supprimer</BoutonEnvoi>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {numeros.length === 0 && <tr><td className="vide" colSpan={5}>Aucun numéro pour le moment.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
