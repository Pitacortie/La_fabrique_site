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

export const emailAlerteSolde = ({ code, solde, lien }) =>
  simple({
    sujet: "Solde de briques à regarder (SEL)",
    titre: "Un solde de briques franchit un seuil",
    paragraphes: [
      `Le solde du membre ${code} est de ${solde} briques. À -120 briques ou au-delà de 600, le CA prend simplement contact avec la personne : il n'y a ni sanction, ni blocage.`,
    ],
    bouton: { texte: "Voir le tableau du SEL", lien },
  });

export const emailInscriptionValidee = ({ prenom, lien }) =>
  simple({
    sujet: "Bienvenue dans le SEL",
    titre: "Bienvenue dans le SEL !",
    paragraphes: [
      `Bonjour ${prenom},`,
      "Votre inscription au SEL est enregistrée : vous pouvez maintenant publier des annonces et échanger avec les autres adhérents.",
    ],
    bouton: { texte: "Entrer dans le SEL", lien },
  });

export const emailSignalement = ({ motif, lien }) =>
  simple({
    sujet: "Signalement dans le SEL",
    titre: "Un contenu du SEL a été signalé",
    paragraphes: [`Un membre a signalé une annonce ou un message du SEL${motif ? ` (motif : ${motif.toLowerCase()})` : ""}. Il attend l'examen de la modération.`],
    bouton: { texte: "Voir les signalements", lien },
  });

export const emailLitige = ({ lien }) =>
  simple({
    sujet: "Échange du SEL contesté : médiation",
    titre: "Un échange est contesté",
    paragraphes: ["Un bénéficiaire conteste la déclaration d'un échange du SEL. Une médiation du CA est proposée."],
    bouton: { texte: "Voir dans la console", lien },
  });
