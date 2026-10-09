import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FormulaireRubrique } from "../Formulaires";

export const metadata = { title: "Rubriques du SEL" };

// ADM-10, SEL-11 : catégories du catalogue des échanges (indicatives, modifiables)
export default async function Rubriques() {
  await exigerAdmin();
  const rubriques = await prisma.rubriqueSel.findMany({ orderBy: { ordre: "asc" }, include: { _count: { select: { annonces: true } } } });
  return (
    <>
      <div className="coque-entete">
        <h1>Rubriques du SEL</h1>
      </div>
      <p className="chapo">Les catégories proposées aux adhérents. Une rubrique désactivée n'est plus proposée, ses annonces restent visibles.</p>
      <div className="section-admin">
        {rubriques.map((r) => (
          <div key={r.id}>
            <p className="meta">{r._count.annonces} annonce(s)</p>
            <FormulaireRubrique rubrique={r} />
          </div>
        ))}
      </div>
      <section className="section-admin">
        <h2>Ajouter une rubrique</h2>
        <FormulaireRubrique />
      </section>
    </>
  );
}
