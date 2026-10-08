import Link from "next/link";

export default function FabricationCard({ fabrication: f }) {
  const externe = f.lien && !f.lien.startsWith("/");
  return (
    <div className={`carte carte-${f.couleur}`}>
      <p><span className="badge badge-neutre">{f.etat}</span></p>
      <h3>{f.nom}</h3>
      <p>{f.description}</p>
      {f.lien &&
        (externe ? (
          <a href={f.lien} rel="noopener noreferrer">En savoir plus →</a>
        ) : (
          <Link href={f.lien}>En savoir plus →</Link>
        ))}
    </div>
  );
}
