// Informations fixes du site. Siège, téléphone et e-mail sont éditables dans la console (src/lib/contenus.js).
export const site = {
  nom: "La Fabrique de Ménesplet",
  accroche: "Une association participative et citoyenne",
  forme: "Association loi du 1er juillet 1901",
  reseaux: [
    { nom: "Facebook", url: "#" },
    { nom: "Instagram", url: "#" },
  ],
};

export const navigation = [
  { href: "/", label: "Accueil" },
  { href: "/presentation", label: "Présentation" },
  { href: "/actualites", label: "Actualités" },
  { href: "/sel", label: "Le SEL" },
  { href: "/contact", label: "Contacts" },
];

export const libellesCategorie = {
  FONDATEUR: "Membre fondateur",
  ACTIF: "Membre actif",
  ADHERENT: "Membre adhérent",
  BIENFAITEUR: "Membre bienfaiteur",
};

export const libellesModeReglement = {
  CHEQUE: "Chèque",
  ESPECES: "Espèces",
  VIREMENT: "Virement",
  WERO_PAYLIB: "Wero / Paylib",
};

export const libellesStatutArticle = {
  BROUILLON: { texte: "Brouillon", classe: "badge-neutre" },
  PUBLIE: { texte: "Publié", classe: "" },
  RETIRE: { texte: "Retiré", classe: "badge-terracotta" },
};

export const libellesTypeTexte = {
  STATUTS: "Statuts de l'association",
  REGLEMENT_INTERIEUR: "Règlement intérieur de La Fabrique",
  CHARTE_NEUTRALITE: "Charte de neutralité et de participation",
  BULLETIN_ADHESION: "Bulletin d'adhésion",
  CHARTE_SEL: "Charte des membres du SEL",
  REGLEMENT_SEL: "Règlement intérieur du SEL",
};
