// Règles du SEL (Règlement intérieur du SEL, cahier des charges P6 et section 10).

// SEL-22 : alerte au CA, sans sanction ni blocage, quand un solde atteint -120 ou dépasse 600 briques
export const SEUIL_BAS = -120;
export const ALERTE_BRIQUES = 600;
export const DUREE_MAX_MINUTES = 24 * 60; // garde-fou par échange
// SEL-14 : aucun plafond de valeur par objet ; simple garde-fou contre une faute de frappe
export const VALEUR_MAX_BRIQUES = 1_000_000;

export const TEXTES_SEL = ["CHARTE_SEL", "REGLEMENT_SEL"];

// SEL-19, SEL-20 : la cotisation se renouvelle avant le 31 janvier ; sans renouvellement, deux rappels sont envoyés
// pendant 30 jours et l'accès au SEL est conservé jusqu'au 30e jour (2 mars). Renvoie la date de fin de validité
// minimale d'une cotisation pour accéder au SEL aujourd'hui.
export function limiteCotisationSel(maintenant = new Date()) {
  const jour = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate()));
  const finDeGrace = new Date(Date.UTC(jour.getUTCFullYear(), 2, 2)); // 31 janvier + 30 jours
  return jour <= finDeGrace ? new Date(Date.UTC(jour.getUTCFullYear() - 1, 11, 31)) : jour;
}

export const libellesType = { OFFRE: "Service proposé", DEMANDE: "Service demandé" };
export const libellesNature = { SERVICE: "Service", PRET: "Prêt d'objet", DON: "Don", OBJET: "Objet contre briques" };
export const libellesModalite = { PRESENTIEL: "En présentiel", DISTANCE: "À distance" };
export const libellesStatutAnnonce = {
  BROUILLON: { texte: "Brouillon", classe: "badge-ocre" },
  PUBLIEE: { texte: "Publiée", classe: "" },
  CLOTUREE: { texte: "Retirée", classe: "badge-neutre" },
  MASQUEE: { texte: "Masquée par la modération", classe: "badge-terracotta" },
};
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

// « 90 » -> « 1 h 30 »
export function duree(minutes) {
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
}

// La levée d'anonymat est faite quand les deux parties ont donné leur accord (section 6.5).
export const anonymatLeve = (conversation) => !!(conversation.accordAuteurLe && conversation.accordInterlocuteurLe);
