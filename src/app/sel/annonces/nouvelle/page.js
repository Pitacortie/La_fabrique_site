import { exigerAccesSel } from "@/lib/sel/acces";
import { rubriquesActives } from "@/lib/sel/donnees";
import FormulaireAnnonce from "../FormulaireAnnonce";

export const metadata = { title: "Publier une annonce" };

export default async function NouvelleAnnonce() {
  const { membre } = await exigerAccesSel("/sel/annonces/nouvelle");
  const rubriques = await rubriquesActives();
  return (
    <>
      <h1>Publier une annonce</h1>
      <p className="chapo">
        Votre annonce est publiée sous votre code <strong>{membre.alias?.code}</strong> : personne ne sait qui vous êtes
        tant que vous ne l'avez pas décidé.
      </p>
      <FormulaireAnnonce rubriques={rubriques} zoneParDefaut={membre.commune ?? ""} />
    </>
  );
}
