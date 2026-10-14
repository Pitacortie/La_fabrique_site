import { exigerAdmin } from "@/lib/auth";
import { formatHorodatage } from "@/lib/heure-paris";
import { mouvementsSolidarite, soldeSolidarite } from "@/lib/sel/solidarite";
import { AideSolidarite } from "../Formulaires";

export const metadata = { title: "Compte de solidarité" };

// SEL-25, RG-29 : compte d'urgence et de solidarité, en briques uniquement
export default async function Solidarite() {
  await exigerAdmin();
  const [solde, mouvements] = await Promise.all([soldeSolidarite(), mouvementsSolidarite()]);

  return (
    <>
      <div className="coque-entete">
        <h1>Compte d'urgence et de solidarité</h1>
      </div>
      <div className="stats">
        <div className="stat sel-stat-solde">
          <div className="valeur">🧱 {solde}</div>
          <div className="libelle">Briques disponibles</div>
        </div>
      </div>
      <p className="meta">
        Il est alimenté par les dons de briques des membres et par les soldes des comptes clôturés. Les administrateurs
        l'utilisent pour venir en aide à un membre.
      </p>

      <section className="carte section-admin">
        <h2>Venir en aide à un membre</h2>
        <AideSolidarite />
      </section>

      <section className="section-admin">
        <h2>Mouvements</h2>
        <div className="tableau-conteneur">
          <table>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Mouvement</th>
                <th scope="col">Membre</th>
                <th scope="col">Briques</th>
              </tr>
            </thead>
            <tbody>
              {mouvements.map((t) => {
                const entree = t.crediteId === null;
                return (
                  <tr key={t.id}>
                    <td>{formatHorodatage(t.createdAt)}</td>
                    <td>{t.libelle}</td>
                    <td>{(entree ? t.debite?.code : t.credite?.code) ?? "—"}</td>
                    <td className={entree ? "sel-plus" : "sel-moins"}>{entree ? "+" : "−"}{t.montant}</td>
                  </tr>
                );
              })}
              {mouvements.length === 0 && <tr><td className="vide" colSpan={4}>Aucun mouvement pour le moment.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
