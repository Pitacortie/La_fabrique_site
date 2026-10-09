import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerAccesSel } from "@/lib/sel/acces";
import { rubriquesActives } from "@/lib/sel/donnees";
import FormulaireAnnonce from "../../FormulaireAnnonce";

export const metadata = { title: "Modifier mon annonce" };

export default async function ModifierAnnonce({ params }) {
  const { id } = await params;
  const { alias } = await exigerAccesSel(`/sel/annonces/${id}/modifier`);
  const annonce = await prisma.annonce.findUnique({ where: { id } });
  if (!annonce || annonce.auteurId !== alias.id) notFound();
  return (
    <>
      <p><Link href={`/sel/annonces/${id}`}>← Retour à l'annonce</Link></p>
      <h1>Modifier mon annonce</h1>
      <FormulaireAnnonce rubriques={await rubriquesActives()} annonce={annonce} />
    </>
  );
}
