// Règles du SEL (Règlement intérieur du SEL, cahier des charges P6 et section 10).

export const PLANCHER_BRIQUES = -120; // SEL-22, RG-8 : solde minimum, sauf dérogation
export const ALERTE_BRIQUES = 600; // au-delà, concertation du CA, sans sanction
export const DUREE_MAX_MINUTES = 24 * 60; // garde-fou par échange
export const VALEUR_MAX_BRIQUES = 24 * 60;

export const TEXTES_SEL = ["CHARTE_SEL", "REGLEMENT_SEL"];

export const libellesType = { OFFRE: "Service proposé", DEMANDE: "Service demandé" };
export const libellesNature = { SERVICE: "Service", PRET: "Prêt d'objet", DON: "Don", OBJET: "Objet contre briques" };
export const libellesModalite = { PRESENTIEL: "En personne", DISTANCE: "À distance possible" };
export const libellesStatutEchange = {
  PROPOSE: { texte: "Rendez-vous proposé", classe: "badge-ocre" },
  CONFIRME: { texte: "Rendez-vous confirmé", classe: "" },
  DECLARE: { texte: "À confirmer", classe: "badge-ocre" },
  TERMINE: { texte: "Terminé", classe: "badge-neutre" },
  ANNULE: { texte: "Annulé", classe: "badge-neutre" },
  LITIGE: { texte: "En médiation", classe: "badge-terracotta" },
};
export const libellesMotifSignalement = {
  PARTISAN: "Contenu partisan ou électoral",
  PROPOS: "Propos discriminatoires, agressifs ou humiliants",
  ARNAQUE: "Tentative d'arnaque",
  DONNEES: "Coordonnées ou données personnelles exposées",
  AUTRE: "Autre",
};

// Dans une conversation, qui rend le service ? Pour une offre : l'auteur de l'annonce. Pour une demande : l'autre.
export function roles(annonce, conversation) {
  return annonce.type === "OFFRE"
    ? { prestataireId: conversation.auteurId, beneficiaireId: conversation.interlocuteurId }
    : { prestataireId: conversation.interlocuteurId, beneficiaireId: conversation.auteurId };
}

// Montant en briques d'un échange : la durée pour un service, la valeur convenue pour un objet, rien pour un prêt ou un don.
export function briquesPour(nature, { dureeMinutes, valeur }) {
  if (nature === "SERVICE") return dureeMinutes ?? 0;
  if (nature === "OBJET") return valeur ?? 0;
  return 0;
}

export const plancher = (alias) => alias.plancherBriques ?? PLANCHER_BRIQUES;

// « 90 » -> « 1 h 30 »
export function duree(minutes) {
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
}

// La levée d'anonymat est faite quand les deux parties ont donné leur accord (section 6.5).
export const anonymatLeve = (conversation) => !!(conversation.accordAuteurLe && conversation.accordInterlocuteurLe);
