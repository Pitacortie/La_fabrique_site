import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatHorodatage } from "@/lib/heure-paris";
import { exigerAccesSel } from "@/lib/sel/acces";
import { ALERTE_BRIQUES, SEUIL_BAS } from "@/lib/sel/regles";
import FormulaireDon from "./FormulaireDon";

export const metadata = { title: "Mes briques" };

// SEL-9 : compteur de briques et historique des transactions
export default async function Briques() {
  const { alias } = await exigerAccesSel("/sel/briques");
  const transactions = await prisma.transactionBriques.findMany({
    where: { OR: [{ debiteId: alias.id }, { crediteId: alias.id }] },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { debite: { select: { code: true } }, credite: { select: { code: true } } },
  });
  const gagnees = transactions.filter((t) => t.crediteId === alias.id).reduce((s, t) => s + t.montant, 0);
  const donnees = transactions.filter((t) => t.debiteId === alias.id).reduce((s, t) => s + t.montant, 0);

  return (
    <>
      <h1>Mes briques</h1>
      <div className="stats">
        <div className="stat sel-stat-solde">
          <div className="valeur">🧱 {alias.soldeBriques}</div>
          <div className="libelle">Mon solde · 1 minute de service = 1 brique</div>
        </div>
        <div className="stat"><div className="valeur">+{gagnees}</div><div className="libelle">Briques reçues pour des services rendus</div></div>
        <div className="stat"><div className="valeur">−{donnees}</div><div className="libelle">Briques versées pour des services reçus</div></div>
      </div>
      <p className="meta">
        Tout le monde commence à zéro et le solde peut être négatif. À {SEUIL_BAS} briques ou au-delà de {ALERTE_BRIQUES}, le CA vous
        proposera simplement d'en discuter : il n'y a ni sanction, ni blocage.
      </p>

      <section className="carte section-admin">
        <h2>Compte d'urgence et de solidarité</h2>
        <p>
          Il permet à l'association de venir en aide à un membre en difficulté. Vous pouvez lui donner une partie de vos
          briques. Les soldes des comptes clôturés lui sont aussi versés.
        </p>
        <FormulaireDon solde={alias.soldeBriques} />
      </section>

      <p className="meta"><Link href="/sel/assurance">Mon assurance responsabilité civile →</Link></p>

      <h2>Historique</h2>
      <div className="tableau-conteneur">
        <table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Échange</th>
              <th scope="col">Avec</th>
              <th scope="col">Briques</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length ? (
              transactions.map((t) => {
                const recu = t.crediteId === alias.id;
                const avec = recu ? t.debite?.code : t.credite?.code;
                return (
                  <tr key={t.id}>
                    <td>{formatHorodatage(t.createdAt)}</td>
                    <td>{t.libelle}</td>
                    <td>{avec ?? "Compte de solidarité"}</td>
                    <td className={recu ? "sel-plus" : "sel-moins"}>{recu ? "+" : "−"}{t.montant}</td>
                  </tr>
                );
              })
            ) : (
              <tr><td className="vide" colSpan={4}>Aucune transaction pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
