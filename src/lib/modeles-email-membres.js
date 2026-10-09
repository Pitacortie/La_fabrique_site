// Modèles des courriels du parcours d'adhésion, des contacts et du compte.
// Même gabarit que modeles-email.js (version texte + version HTML aux couleurs de la charte).
import { gabarit } from "@/lib/modeles-email";

const signature = "La Fabrique de Ménesplet";
const enTexte = (...blocs) => blocs.filter(Boolean).join("\n\n") + `\n\n${signature}`;
const lignes = (texte) => texte.split(/\n+/).filter((l) => l.trim());

// ---------- Adhésion ----------

// ADH-15 : confirmation du dépôt, avec les modalités de paiement de la cotisation
export function emailDemandeRecue({ prenom, montant, mode, paiement }) {
  const intro = `Bonjour ${prenom},`;
  const corps = "Nous avons bien reçu votre demande d'adhésion à La Fabrique de Ménesplet. Merci !";
  const etape = `Prochaine étape : régler votre cotisation (${montant} €, ${mode.toLowerCase()}). Aucun paiement ne se fait sur le site.`;
  const suite =
    "Dès qu'un membre du Bureau aura reçu votre cotisation, il validera votre adhésion et vous recevrez un e-mail pour créer votre mot de passe.";
  return {
    sujet: "Votre demande d'adhésion a bien été reçue",
    texte: enTexte(intro, corps, etape, `Comment payer :\n${paiement}`, suite),
    html: gabarit({ titre: "Demande d'adhésion reçue", paragraphes: [intro, corps, etape, "Comment payer :", ...lignes(paiement), suite] }),
  };
}

// Demande déposée avec l'adresse d'un compte existant : on prévient la personne sans rien révéler sur le site
export function emailDejaMembre({ prenom, lienConnexion, lienOubli }) {
  const intro = `Bonjour ${prenom},`;
  const corps =
    "Une demande d'adhésion vient d'être envoyée avec votre adresse e-mail, mais vous avez déjà un compte à La Fabrique de Ménesplet.";
  const ignorer = "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.";
  return {
    sujet: "Vous avez déjà un compte",
    texte: enTexte(intro, corps, `Pour vous connecter : ${lienConnexion}\nMot de passe oublié : ${lienOubli}`, ignorer),
    html: gabarit({
      titre: "Vous avez déjà un compte",
      paragraphes: [intro, corps],
      bouton: { texte: "Me connecter", lien: lienConnexion },
      apres: [`Mot de passe oublié : ${lienOubli}`, ignorer],
    }),
  };
}

// Alerte au Bureau : une demande attend une décision
export function emailNouvelleDemande({ nomComplet, commune, mineur, lien }) {
  const corps = `${nomComplet} (${commune}) a déposé une demande d'adhésion${mineur ? " (postulant mineur)" : ""}.`;
  const etape = "Validez-la dans la console une fois la cotisation reçue.";
  return {
    sujet: `Nouvelle demande d'adhésion : ${nomComplet}`,
    texte: enTexte(corps, etape, lien),
    html: gabarit({ titre: "Nouvelle demande d'adhésion", paragraphes: [corps, etape], bouton: { texte: "Voir la demande", lien } }),
  };
}

// ADH-6, ADH-7 : adhésion validée, lien d'activation pour choisir son mot de passe
export function emailActivation({ prenom, code, lien, dureeJours }) {
  const intro = `Bonjour ${prenom},`;
  const corps = "Bonne nouvelle : votre adhésion à La Fabrique de Ménesplet est validée. Bienvenue !";
  const codeTexte = `Votre code personnel est ${code}. C'est sous ce code que vous apparaîtrez dans les services de l'association (comme le SEL) : votre nom n'y est jamais affiché.`;
  const etape = "Il ne vous reste qu'à choisir votre mot de passe :";
  const validite = `Ce lien est valable ${dureeJours} jours. Votre identifiant de connexion est votre adresse e-mail.`;
  return {
    sujet: "Bienvenue à La Fabrique de Ménesplet : activez votre compte",
    texte: enTexte(intro, corps, codeTexte, `${etape}\n${lien}`, validite),
    html: gabarit({
      titre: "Votre adhésion est validée",
      paragraphes: [intro, corps, codeTexte, etape],
      bouton: { texte: "Choisir mon mot de passe", lien },
      apres: [validite],
    }),
  };
}

// ADH-5, RG-6 : refus, avec le motif s'il a été indiqué
export function emailRefus({ prenom, motif, lienContact }) {
  const intro = `Bonjour ${prenom},`;
  const corps =
    "Nous vous remercions de l'intérêt que vous portez à La Fabrique de Ménesplet. Après examen, le Bureau n'a pas pu donner suite à votre demande d'adhésion.";
  const raison = motif ? `Motif : ${motif}` : null;
  const contact = "Pour toute question, vous pouvez nous écrire.";
  return {
    sujet: "Votre demande d'adhésion",
    texte: enTexte(intro, corps, raison, `${contact} ${lienContact}`),
    html: gabarit({
      titre: "Votre demande d'adhésion",
      paragraphes: [intro, corps, raison, contact].filter(Boolean),
      bouton: { texte: "Nous contacter", lien: lienContact },
    }),
  };
}

// ADH-10 : rappel de cotisation avant le 31 janvier
export function emailRappelCotisation({ prenom, annee, paiement, lienEspace }) {
  const intro = `Bonjour ${prenom},`;
  const corps = `L'adhésion à La Fabrique de Ménesplet se renouvelle chaque année civile. Pensez à régler votre cotisation ${annee} (1 € minimum) avant le 31 janvier ${annee}.`;
  const consequence = "Sans renouvellement à cette date, votre compte sera clôturé.";
  return {
    sujet: `Renouvellement de votre adhésion ${annee}`,
    texte: enTexte(intro, corps, `Comment payer :\n${paiement}`, consequence, `Votre espace : ${lienEspace}`),
    html: gabarit({
      titre: `Votre adhésion ${annee}`,
      paragraphes: [intro, corps, "Comment payer :", ...lignes(paiement), consequence],
      bouton: { texte: "Mon espace adhérent", lien: lienEspace },
    }),
  };
}

// ---------- Contacts ----------

// CTC-1 : message transmis à l'association (on répond depuis la console)
export function emailMessageContact({ nom, email, sujet, texte, lien }) {
  const entete = `Message de ${nom} (${email}), objet : ${sujet}`;
  return {
    sujet: `Nouveau message : ${sujet}`,
    texte: enTexte(entete, texte, `Répondre depuis la console : ${lien}`),
    html: gabarit({ titre: "Nouveau message reçu", paragraphes: [entete, ...lignes(texte)], bouton: { texte: "Répondre depuis la console", lien } }),
  };
}

// Accusé de réception. Volontairement sans reprendre le message : le formulaire ne doit pas servir à
// faire envoyer par le site un texte choisi par n'importe qui à n'importe quelle adresse.
export function emailAccuseContact({ nom }) {
  const intro = `Bonjour ${nom},`;
  const corps = "Nous avons bien reçu votre message. Un membre de l'association vous répondra dès que possible.";
  return { sujet: "Votre message a bien été reçu", texte: enTexte(intro, corps), html: gabarit({ titre: "Message reçu", paragraphes: [intro, corps] }) };
}

// CTC-2 : réponse de l'association, avec le rappel de la question et un lien vers l'adhésion
export function emailReponseContact({ nom, reponse, question, lienAdherer }) {
  const intro = `Bonjour ${nom},`;
  return {
    sujet: "Réponse de La Fabrique de Ménesplet",
    texte: enTexte(intro, reponse, `Pour adhérer : ${lienAdherer}`, `Votre message :\n${question}`),
    html: gabarit({
      titre: "Réponse à votre message",
      paragraphes: [intro, ...lignes(reponse)],
      bouton: { texte: "Découvrir l'adhésion", lien: lienAdherer },
      apres: ["Votre message :", ...lignes(question)],
    }),
  };
}

// ---------- Compte ----------

// Changement d'adresse : lien envoyé à la NOUVELLE adresse pour prouver qu'elle appartient au membre
export function emailConfirmerAdresse({ prenom, lien, dureeMinutes }) {
  const intro = `Bonjour ${prenom},`;
  const corps =
    "Vous avez demandé à utiliser cette adresse pour votre compte La Fabrique de Ménesplet. Confirmez-la en cliquant sur le bouton ci-dessous.";
  const validite = `Ce lien est valable ${dureeMinutes} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;
  return {
    sujet: "Confirmez votre nouvelle adresse e-mail",
    texte: enTexte(intro, corps, lien, validite),
    html: gabarit({ titre: "Confirmer ma nouvelle adresse", paragraphes: [intro, corps], bouton: { texte: "Confirmer cette adresse", lien }, apres: [validite] }),
  };
}

// Alerte envoyée à l'ANCIENNE adresse après le changement
export function emailAdresseModifiee({ prenom, nouvelle, lienContact }) {
  const intro = `Bonjour ${prenom},`;
  const corps = `L'adresse e-mail de votre compte a été remplacée par ${nouvelle}. C'est désormais elle qui sert à vous connecter.`;
  const alerte = "Si ce n'est pas vous, contactez l'association au plus vite.";
  return {
    sujet: "L'adresse e-mail de votre compte a changé",
    texte: enTexte(intro, corps, alerte, lienContact),
    html: gabarit({ titre: "Adresse e-mail modifiée", paragraphes: [intro, corps, alerte], bouton: { texte: "Contacter l'association", lien: lienContact } }),
  };
}
