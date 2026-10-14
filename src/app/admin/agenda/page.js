import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCreneau } from "@/lib/heure-paris";
import FormulaireEvenement from "./FormulaireEvenement";

export const metadata = { title: "Agenda" };

// ADM-22 : l'agenda public est tenu à jour par les administrateurs
export default async function AgendaAdmin({ searchParams }) {
  await exigerAdmin();
  const { cree } = await searchParams;
  const maintenant = new Date();
  const [aVenir, passes] = await Promise.all([
    prisma.evenement.findMany({ where: { debut: { gte: new Date(maintenant.getTime() - 86_400_000) } }, orderBy: { debut: "asc" } }),
    prisma.evenement.findMany({ where: { debut: { lt: new Date(maintenant.getTime() - 86_400_000) } }, orderBy: { debut: "desc" }, take: 30 }),
  ]);
  const ligne = (e) => (
    <li key={e.id}>
      <Link href={`/admin/agenda/${e.id}`}>{e.titre}</Link> <span className="meta">· {formatCreneau(e.debut)} · {e.lieu}</span>
    </li>
  );

  return (
    <>
      <div className="coque-entete">
        <h1>Agenda</h1>
        <Link href="/agenda">Voir l'agenda public →</Link>
      </div>
      {cree && <div className="message-info" role="status" style={{ marginBottom: "1rem" }}>Événement ajouté à l'agenda.</div>}

      <section className="section-admin">
        <h2>À venir ({aVenir.length})</h2>
        {aVenir.length ? <ul>{aVenir.map(ligne)}</ul> : <p>Aucun événement à venir.</p>}
      </section>

      <section className="carte section-admin">
        <h2>Nouvel événement</h2>
        <FormulaireEvenement />
      </section>

      {passes.length > 0 && (
        <details className="section-admin">
          <summary>Événements passés ({passes.length})</summary>
          <ul>{passes.map(ligne)}</ul>
        </details>
      )}
    </>
  );
}
