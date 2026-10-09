import Link from "next/link";
import { duree, libellesModalite, libellesNature } from "@/lib/sel/regles";

const COULEURS_NATURE = { SERVICE: "bleu", PRET: "vert", DON: "ocre", OBJET: "terracotta" };

export function valeurAnnonce(a) {
  if (a.nature === "SERVICE" && a.dureeEstimee) return `≈ ${duree(a.dureeEstimee)} · ${a.dureeEstimee} briques`;
  if (a.nature === "OBJET" && a.valeurBriques != null) return `${a.valeurBriques} briques`;
  if (a.nature === "DON") return "Gratuit";
  return null;
}

// Carte d'une annonce : jamais de nom, seulement le code de l'auteur (RG-3).
export default function CarteAnnonce({ annonce: a, mienne }) {
  const valeur = valeurAnnonce(a);
  return (
    <article className={`carte carte-${COULEURS_NATURE[a.nature]} sel-carte`}>
      <p className="meta">
        <span className="badge badge-neutre">{a.rubrique.libelle}</span> <span className="badge">{libellesNature[a.nature]}</span>
        {mienne && <> <span className="badge badge-ocre">Votre annonce</span></>}
      </p>
      <h2 className="sel-carte-titre">
        <Link href={`/sel/annonces/${a.id}`}>{a.titre}</Link>
      </h2>
      <p className="sel-carte-extrait">{a.description.length > 160 ? `${a.description.slice(0, 160)}…` : a.description}</p>
      <p className="meta">
        📍 {a.zone} · {libellesModalite[a.modalite]}
        {valeur && <> · {valeur}</>}
      </p>
      <p className="meta sel-carte-auteur">
        Par <span className="sel-code-inline">{a.auteur.code}</span> · {new Date(a.createdAt).toLocaleDateString("fr-FR")}
      </p>
    </article>
  );
}
