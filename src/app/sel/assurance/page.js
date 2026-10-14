import { formatDate } from "@/lib/format";
import { exigerAccesSel } from "@/lib/sel/acces";
import { prisma } from "@/lib/db";
import { FormulaireAssurance } from "../inscription/Formulaires";

export const metadata = { title: "Mon assurance" };

// Mise à jour de la déclaration d'assurance (changement de contrat ou de compagnie)
export default async function MonAssurance() {
  const { membre } = await exigerAccesSel("/sel/assurance");
  const inscription = await prisma.inscriptionSel.findUnique({ where: { membreId: membre.id } });
  const rc = inscription.assuranceRc;
  return (
    <>
      <h1>Mon assurance responsabilité civile</h1>
      <p className="chapo">
        Déclarée le {formatDate(rc.declareeLe)}. Si vous changez de contrat ou de compagnie, mettez ces informations à jour.
      </p>
      <FormulaireAssurance valeurs={{ numeroPolice: rc.numeroPolice, compagnie: rc.compagnie, adresseCompagnie: rc.adresseCompagnie }} />
    </>
  );
}
