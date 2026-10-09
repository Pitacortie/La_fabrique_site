// Courriels du SEL. MSG-9 et section 6.6 : les notifications ne contiennent ni le texte des messages,
// ni le code des personnes, ni leur nom. Elles invitent simplement à se connecter.
import { gabarit } from "@/lib/modeles-email";

const signature = "La Fabrique de Ménesplet";
const enTexte = (...blocs) => blocs.filter(Boolean).join("\n\n") + `\n\n${signature}`;

function simple({ sujet, titre, paragraphes, bouton }) {
  return {
    sujet,
    texte: enTexte(...paragraphes, `${bouton.texte} : ${bouton.lien}`),
    html: gabarit({ titre, paragraphes, bouton }),
  };
}

export const emailNouveauMessage = ({ prenom, lien }) =>
  simple({
    sujet: "Nouveau message dans le SEL",
    titre: "Nouveau message dans le SEL",
    paragraphes: [`Bonjour ${prenom},`, "Vous avez reçu un nouveau message dans le SEL de La Fabrique de Ménesplet."],
    bouton: { texte: "Lire le message", lien },
  });

export const emailEtapeEchange = ({ prenom, lien }) =>
  simple({
    sujet: "Un échange du SEL attend votre réponse",
    titre: "Un échange attend votre réponse",
    paragraphes: [`Bonjour ${prenom},`, "Un échange du SEL vient d'avancer et attend une action de votre part (confirmer un rendez-vous ou la fin d'un échange)."],
    bouton: { texte: "Voir l'échange", lien },
  });

export const emailNouvelleInscription = ({ lien }) =>
  simple({
    sujet: "Attestation d'assurance à vérifier (SEL)",
    titre: "Nouvelle inscription au SEL",
    paragraphes: ["Un adhérent s'est inscrit au SEL et a déposé son attestation d'assurance responsabilité civile. Elle attend votre vérification."],
    bouton: { texte: "Vérifier l'attestation", lien },
  });

export const emailInscriptionValidee = ({ prenom, lien }) =>
  simple({
    sujet: "Votre inscription au SEL est validée",
    titre: "Bienvenue dans le SEL !",
    paragraphes: [
      `Bonjour ${prenom},`,
      "Votre attestation d'assurance a été vérifiée : vous pouvez maintenant publier des annonces et échanger dans le SEL.",
    ],
    bouton: { texte: "Entrer dans le SEL", lien },
  });

export const emailInscriptionRefusee = ({ prenom, motif, lien }) =>
  simple({
    sujet: "Votre attestation d'assurance pour le SEL",
    titre: "Attestation d'assurance à revoir",
    paragraphes: [
      `Bonjour ${prenom},`,
      "Votre attestation d'assurance responsabilité civile n'a pas pu être validée.",
      motif ? `Motif : ${motif}` : null,
      "Vous pouvez en déposer une nouvelle depuis la page d'inscription au SEL.",
    ].filter(Boolean),
    bouton: { texte: "Déposer une attestation", lien },
  });

export const emailLitige = ({ lien }) =>
  simple({
    sujet: "Échange du SEL contesté : médiation",
    titre: "Un échange est contesté",
    paragraphes: ["Un bénéficiaire conteste la déclaration d'un échange du SEL. Une médiation du CA est proposée."],
    bouton: { texte: "Voir dans la console", lien },
  });
