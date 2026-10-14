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
    libelle: "Introduction de « Nos initiatives »",
    defaut: "Des services réservés aux adhérents, pensés pour l'entraide entre habitants.",
  },
  {
    cle: "accueil.encart",
    page: "Accueil",
    libelle: "Encart « Boîte à idées »",
    defaut: "Une idée pour Ménesplet ? Un besoin à partager ? Écrivez-nous, l'association examine chaque proposition.",
  },
  {
    cle: "presentation.qui",
    page: "Présentation",
    libelle: "Qui sommes-nous ?",
    defaut: [
      "Créée en 2026, La Fabrique de Ménesplet est une association locale née de l'envie de favoriser les rencontres, l'entraide et la participation des habitants.",
      "Son principe est simple : permettre à chacun de trouver sa place, de proposer une idée, de partager un savoir-faire ou simplement de participer à la vie locale.",
      "La Fabrique se veut avant tout un espace ouvert et convivial, où les projets peuvent naître des envies et des besoins des habitants.",
      "Chacun peut ainsi s'investir selon ses envies, ses disponibilités et ce qu'il souhaite apporter.",
    ].join("\n\n"),
  },
  {
    cle: "presentation.neutralite",
    page: "Présentation",
    libelle: "Neutralité et indépendance",
    defaut:
      "L'association est indépendante, non partisane et non confessionnelle. Ses moyens (réunions, pages, listes de diffusion, fichiers, logo, site) ne peuvent jamais servir à soutenir ou combattre un candidat, une liste, un parti ou une campagne électorale.",
  },
  {
    cle: "presentation.generations",
    page: "Présentation",
    libelle: "Une association ouverte à toutes les générations",
    defaut: [
      "La Fabrique souhaite aussi donner une véritable place aux jeunes. Ils peuvent rejoindre l'association dès 13 ans et participer au conseil d'administration à partir de 15 ans.",
      "Parce que la vie d'un village se construit avec toutes les générations, l'objectif est de favoriser les rencontres, la transmission et les projets communs.",
    ].join("\n\n"),
  },
  {
    cle: "presentation.rejoindre",
    page: "Présentation",
    libelle: "Rejoindre La Fabrique",
    defaut: [
      "Vous pouvez adhérer à partir d'1 euro par an, afin que l'aspect financier ne soit jamais un frein à la participation.",
      "Adhérer à La Fabrique, c'est avant tout rejoindre un réseau local, rencontrer d'autres habitants et pouvoir prendre part, à son rythme, aux initiatives de l'association.",
    ].join("\n\n"),
  },
  {
    cle: "presentation.consultations",
    page: "Présentation",
    libelle: "Les consultations citoyennes",
    defaut:
      "L'association organise des consultations citoyennes pour recueillir l'avis des habitants sur les projets qui concernent Ménesplet. Chacun peut y participer, adhérent ou non : les dates sont annoncées dans l'agenda et les résultats sont partagés dans les actualités et la gazette.",
  },
  {
    cle: "sel.intro",
    page: "Le SEL",
    libelle: "Présentation du SEL",
    defaut: [
      "Son objectif : permettre aux adhérents d'échanger des services, des savoirs, des objets ou des coups de main, sans que l'argent soit au centre de la relation.",
      "Chacun possède quelque chose qu'il peut partager : du temps, une compétence, une expérience, du matériel ou simplement la possibilité de rendre un service.",
    ].join("\n\n"),
  },
  {
    cle: "sel.fonctionnement",
    page: "Le SEL",
    libelle: "Comment fonctionne le SEL ?",
    defaut: [
      "Au sein du SEL, les échanges sont comptabilisés en « briques », l'unité d'échange choisie par La Fabrique.",
      "Une personne peut, par exemple, proposer une aide ou un savoir-faire et utiliser ensuite les briques obtenues pour bénéficier à son tour d'un autre échange proposé par un membre du réseau.",
      "Il n'est donc pas nécessaire de rendre directement un service à la personne qui nous a aidés : les échanges circulent à l'intérieur du réseau.",
      "C'est ce principe qui permet de créer progressivement un véritable maillage entre les adhérents.",
    ].join("\n\n"),
  },
  {
    cle: "sel.echanges",
    page: "Le SEL",
    libelle: "Que peut-on échanger ?",
    defaut: [
      "Les possibilités sont nombreuses : petit bricolage, jardinage, aide informatique, prêt de matériel, couture, accompagnement ponctuel, partage de connaissances, conseils, transmission d'un savoir-faire…",
      "L'idée n'est pas de remplacer les professionnels, mais de favoriser l'entraide entre particuliers et de valoriser les compétences que chacun possède.",
      "Il n'est d'ailleurs pas nécessaire d'être « expert » : savoir faire quelque chose qui peut être utile à quelqu'un d'autre suffit.",
    ].join("\n\n"),
  },
  {
    cle: "sel.plus",
    page: "Le SEL",
    libelle: "Plus qu'un échange de services",
    defaut: [
      "Le SEL est aussi une manière de créer des rencontres. Derrière un coup de main ou un échange de savoir se trouvent souvent une discussion, une découverte et de nouveaux liens entre personnes qui vivent sur un même territoire sans forcément se connaître.",
      "Le SEL repose ainsi sur quelques principes simples : réciprocité, confiance, respect, convivialité et liberté de participer.",
      "Chacun donne selon ses possibilités et sollicite le réseau lorsqu'il en a besoin.",
    ].join("\n\n"),
  },
  {
    cle: "sel.citation",
    page: "Le SEL",
    libelle: "Phrase de conclusion",
    defaut: "Avec le SEL, les richesses ne se mesurent pas seulement en euros : elles se trouvent aussi dans le temps, les savoirs et les talents que chacun peut partager.",
  },
  {
    cle: "adhesion.paiement",
    page: "Adhérer",
    libelle: "Comment payer la cotisation (repris dans les e-mails de confirmation et de rappel)",
    defaut: [
      "Par chèque : à l'ordre de « La Fabrique de Ménesplet », à remettre à un membre du Bureau ou à envoyer au siège (12 rue Simone Veil, lieu Laser, 24700 Ménesplet).",
      "Par virement : IBAN à compléter.",
      "En espèces : auprès d'un membre du Bureau.",
    ].join("\n"),
  },
  { cle: "site.telephone", page: "Coordonnées", libelle: "Téléphone", defaut: "À compléter", ligne: true },
  { cle: "site.email", page: "Coordonnées", libelle: "Adresse e-mail de contact", defaut: "lafabriquedemenesplet@gmail.com", ligne: true },
  { cle: "site.facebook", page: "Coordonnées", libelle: "Page Facebook (adresse complète https://…)", defaut: "", ligne: true, url: true },
  { cle: "site.instagram", page: "Coordonnées", libelle: "Compte Instagram (adresse complète https://…)", defaut: "", ligne: true, url: true },
  {
    cle: "site.siege",
    page: "Coordonnées",
    libelle: "Siège social",
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
