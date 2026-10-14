import Link from "next/link";
import { notFound } from "next/navigation";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { partiesParis } from "@/lib/heure-paris";
import { supprimerEvenement } from "../actions";
import FormulaireEvenement from "../FormulaireEvenement";

export const metadata = { title: "Modifier un événement" };

export default async function ModifierEvenement({ params }) {
  await exigerAdmin();
  const { id } = await params;
  const e = await prisma.evenement.findUnique({ where: { id } });
  if (!e) notFound();
  const debut = partiesParis(e.debut);

  return (
    <>
      <p><Link href="/admin/agenda">← Agenda</Link></p>
      <div className="coque-entete">
        <h1>{e.titre}</h1>
      </div>
      <FormulaireEvenement
        evenement={{ id: e.id, titre: e.titre, jour: debut.jour, heure: debut.heure, heureFin: e.fin ? partiesParis(e.fin).heure : "", lieu: e.lieu, description: e.description }}
      />
      <form action={supprimerEvenement} className="actions section-admin">
        <input type="hidden" name="id" value={e.id} />
        <BoutonEnvoi className="lien-danger" enCours="Suppression…">Supprimer cet événement</BoutonEnvoi>
      </form>
    </>
  );
}
