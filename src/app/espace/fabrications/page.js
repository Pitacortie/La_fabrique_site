import FabricationCard from "@/components/FabricationCard";
import { getFabricationsVisibles } from "@/lib/articles";
import { exigerMembre } from "@/lib/auth";

// P5 / FAB-2 : accueil des services, géré dans la console (Nos « Fabrications »).
export default async function Fabrications() {
  await exigerMembre();
  const fabrications = await getFabricationsVisibles();

  return (
    <>
      <div className="coque-entete">
        <h1>Nos « Fabrications »</h1>
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
