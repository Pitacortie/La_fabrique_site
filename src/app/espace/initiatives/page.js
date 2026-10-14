import FabricationCard from "@/components/FabricationCard";
import { getFabricationsVisibles } from "@/lib/articles";
import { exigerMembre } from "@/lib/auth";

// P5 / FAB-2 à FAB-4 : « Nos initiatives », services réservés aux adhérents connectés.
export default async function Initiatives() {
  await exigerMembre();
  const fabrications = await getFabricationsVisibles();

  return (
    <>
      <div className="coque-entete">
        <h1>Nos initiatives</h1>
      </div>
      <p className="chapo">Les services de l'association réservés aux adhérents.</p>
      {fabrications.length ? (
        <div className="grille">
          {fabrications.map((f) => (
            <FabricationCard key={f.id} fabrication={f} />
          ))}
        </div>
      ) : (
        <p>Aucun service pour le moment.</p>
      )}
    </>
  );
}
