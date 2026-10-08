import { cache } from "react";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

// Blocs de texte modifiables sur place par les administrateurs, avec le crayon ✏️ (ADM-3, PRE-4).
// Le texte par défaut s'affiche tant que le bloc n'a pas été modifié.
// Pour rendre un nouveau texte éditable : l'ajouter ici, le lire avec getContenus() et l'afficher avec <BlocEditable>.
export const BLOCS = [
  {
    cle: "accueil.intro",
    page: "Accueil",
    libelle: "Présentation succincte (sous le titre)",
    defaut:
      "La Fabrique de Ménesplet est née d'une conviction simple : les meilleures idées naissent quand on les construit ensemble. L'association réunit des habitants de tous âges autour de projets solidaires pensés avec et pour le territoire.\n\nChaque membre apporte ce qu'il peut : un savoir-faire, un peu de temps, une idée. C'est cette diversité qui fait la richesse de nos actions, du jardin partagé aux ateliers intergénérationnels.",
  },
  {
    cle: "accueil.fabrications",
    page: "Accueil",
    libelle: "Introduction de « Nos Fabrications »",
    defaut: "Des services réservés aux adhérents, pensés pour l'entraide entre habitants.",
  },
  {
    cle: "accueil.encart",
    page: "Accueil",
    libelle: "Encart « Vos attentes, vos projets »",
    defaut: "Une idée pour Ménesplet ? Un besoin à partager ? Écrivez-nous, l'association examine chaque proposition.",
  },
  {
    cle: "presentation.qui",
    page: "Présentation",
    libelle: "Qui sommes-nous ?",
    defaut:
      "La Fabrique de Ménesplet est un collectif citoyen qui dynamise la commune, développe le lien social et soutient les initiatives habitantes, dans une démarche participative, inclusive, indépendante et non partisane. L'association a été fondée le 31 janvier 2026 par six habitants.",
  },
  {
    cle: "presentation.neutralite",
    page: "Présentation",
    libelle: "Neutralité et indépendance",
    defaut:
      "L'association est indépendante, non partisane et non confessionnelle (statuts, art. 3). Ses moyens (réunions, pages, listes de diffusion, fichiers, logo, site) ne peuvent jamais servir à soutenir ou combattre un candidat, une liste, un parti ou une campagne électorale.",
  },
  {
    cle: "sel.intro",
    page: "Le SEL",
    libelle: "Présentation du SEL",
    defaut:
      "Les adhérents publient des offres et des demandes de biens ou de services, et s'organisent pour les échanger sans argent. L'unité d'échange est la brique : une minute de service rendu vaut une brique, une heure en vaut soixante, quel que soit le service.",
  },
  { cle: "site.telephone", page: "Coordonnées", libelle: "Téléphone", defaut: "À compléter", ligne: true },
  { cle: "site.email", page: "Coordonnées", libelle: "Adresse e-mail de contact", defaut: "contact@menesplet-fabrique.fr", ligne: true },
  {
    cle: "site.siege",
    page: "Coordonnées",
    libelle: "Siège social (CTC-6 : modifiable si le CA transfère le siège)",
    defaut: "12 rue Simone Veil, lieu Laser\n24700 Ménesplet",
  },
];

const parCle = Object.fromEntries(BLOCS.map((b) => [b.cle, b]));

// Renvoie { cle: texte } pour les clés demandées, avec repli sur le texte par défaut.
// Si la base est indisponible, le site reste lisible avec les textes par défaut.
export async function getContenus(cles) {
  const lignes = await prisma.contenuEditorial.findMany({ where: { cle: { in: cles } } }).catch(() => []);
  const enBase = Object.fromEntries(lignes.map((l) => [l.cle, l.contenu]));
  return Object.fromEntries(cles.map((c) => [c, enBase[c] ?? parCle[c]?.defaut ?? ""]));
}

// « Modifié le … par … » pour le mode édition (une seule requête par page).
const getModifications = cache(async () => {
  const lignes = await prisma.contenuEditorial
    .findMany({ select: { cle: true, updatedAt: true, modifiePar: { select: { prenom: true, nom: true } } } })
    .catch(() => []);
  return Object.fromEntries(lignes.map((l) => [l.cle, l]));
});

export async function getInfosModification(cle) {
  const ligne = (await getModifications())[cle];
  if (!ligne) return null;
  const par = ligne.modifiePar ? ` par ${ligne.modifiePar.prenom} ${ligne.modifiePar.nom}` : "";
  return `Modifié le ${formatDate(ligne.updatedAt)}${par}`;
}
