"use server";

import { z } from "zod";
import { TEXTES_ADHESION, adresseAssociation, age, emailsBureau, modalitesPaiement } from "@/lib/adhesion";
import { journaliser } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { emailDejaMembre, emailDemandeRecue, emailNouvelleDemande } from "@/lib/modeles-email-membres";
import { limiter } from "@/lib/rate-limit";
import { ipClient } from "@/lib/requete";
import { libellesModeReglement } from "@/lib/site";
import { getTextesEnVigueur } from "@/lib/textes";

// Champ absent = message en français (et non le « Required » par défaut de zod)
const chaine = (message) => z.string({ required_error: message, invalid_type_error: message });
const texte = (nom, max = 100) => chaine(`${nom} : champ obligatoire.`).trim().min(1, `${nom} : champ obligatoire.`).max(max, `${nom} : ${max} caractères maximum.`);
const telephone = (nom) => chaine(`${nom} : champ obligatoire.`).trim().regex(/^[0-9 +().-]{10,20}$/, `${nom} : numéro invalide.`);
const coche = (message) => z.literal("on", { errorMap: () => ({ message }) });

// Champs du bulletin d'adhésion 2026 (annexe G)
const schema = z.object({
  nom: texte("Nom"),
  prenom: texte("Prénom"),
  email: chaine("Adresse e-mail : champ obligatoire.").trim().toLowerCase().email("Adresse e-mail invalide.").max(200),
  telephone: telephone("Téléphone"),
  dateNaissance: chaine("Date de naissance : champ obligatoire.")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date de naissance invalide.")
    .refine((v) => {
      const a = age(v);
      return a >= 0 && a <= 120;
    }, "Date de naissance invalide."),
  adresse: texte("Adresse", 200),
  codePostal: chaine("Code postal : champ obligatoire.").trim().regex(/^\d{5}$/, "Le code postal doit comporter 5 chiffres."),
  commune: texte("Commune"),
  responsableNom: z.string().trim().max(100).optional(),
  responsableLien: z.string().trim().max(50).optional(),
  responsableTelephone: z.string().trim().max(20).optional(),
  droitImage: z.enum(["oui", "non"], { errorMap: () => ({ message: "Choisissez une option pour le droit à l'image." }) }),
  montant: z.coerce.number({ required_error: "Indiquez le montant de votre cotisation.", invalid_type_error: "Montant invalide." }).min(1, "La cotisation est d'un euro minimum.").max(10000),
  modeReglement: z.enum(Object.keys(libellesModeReglement), { errorMap: () => ({ message: "Choisissez un mode de règlement." }) }),
  accepteCharte: coche("Vous devez accepter la charte de neutralité et de participation."),
  accepteStatuts: coche("Vous devez accepter les statuts."),
  accepteReglement: coche("Vous devez accepter le règlement intérieur."),
  consentementAnonymat: coche("Vous devez accepter les règles de levée d'anonymat."),
  certifie: coche("Vous devez certifier l'exactitude des informations."),
  rgpd: coche("Vous devez autoriser la conservation de vos données pour la gestion interne."),
});

const CHAMPS_VERSION = { CHARTE_NEUTRALITE: "accepteCharteVersion", STATUTS: "accepteStatutsVersion", REGLEMENT_INTERIEUR: "accepteReglementVersion" };

// ADH-1 à ADH-4, ADH-15 : dépôt de la demande. Aucun compte ni mot de passe n'est créé à ce stade.
export async function deposerDemande(_etat, formData) {
  const paiement = await modalitesPaiement();
  // Champ piège (ADH-8) : un robot le remplit ; on fait comme si tout allait bien, sans rien enregistrer.
  if (formData.get("site_web")) return { ok: true, prenom: "", paiement };

  if (!limiter(`adhesion:${await ipClient()}`, { max: 5, fenetreMs: 60 * 60 * 1000 }).autorise) {
    return { erreur: "Plusieurs demandes ont déjà été envoyées depuis cette connexion. Réessayez dans une heure ou contactez-nous." };
  }

  const brut = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string" && v !== ""));
  const lu = schema.safeParse(brut);
  if (!lu.success) return { erreur: lu.error.issues[0].message };
  const d = lu.data;

  // Bloc « mineurs » obligatoire si moins de 18 ans (ADH-16)
  const mineur = age(d.dateNaissance) < 18;
  if (mineur && (!d.responsableNom || !d.responsableLien || !/^[0-9 +().-]{10,20}$/.test(d.responsableTelephone ?? ""))) {
    return { erreur: "Pour un mineur, le nom, le lien de parenté et le téléphone du responsable légal sont obligatoires." };
  }

  // ADH-2 : l'acceptation porte sur la version affichée, qui doit être celle en vigueur
  const textes = await getTextesEnVigueur(TEXTES_ADHESION);
  for (const type of TEXTES_ADHESION) {
    if (!textes[type]) return { erreur: "Les textes de l'association ne sont pas encore disponibles. Contactez-nous." };
    if (formData.get(CHAMPS_VERSION[type]) !== textes[type].id) {
      return { erreur: "Un texte de l'association vient d'être mis à jour : rechargez la page pour lire la nouvelle version." };
    }
  }

  const site = await urlDuSite();
  const reponse = { ok: true, prenom: d.prenom, paiement };

  // Adresse déjà membre : même réponse à l'écran (on ne révèle pas qui est inscrit), courriel d'information.
  const membre = await prisma.membre.findUnique({ where: { email: d.email } });
  if (membre) {
    await envoyerEmail({ a: d.email, ...emailDejaMembre({ prenom: membre.prenom, lienConnexion: `${site}/connexion`, lienOubli: `${site}/mot-de-passe-oublie` }) }).catch(
      (e) => console.error("Courriel non envoyé :", e.message),
    );
    return reponse;
  }

  const mode = libellesModeReglement[d.modeReglement];
  const confirmation = emailDemandeRecue({ prenom: d.prenom, montant: d.montant, mode, paiement });

  // Demande déjà en attente pour cette adresse : pas de doublon, on renvoie simplement la confirmation.
  const enAttente = await prisma.demandeAdhesion.findFirst({ where: { email: d.email, statut: "EN_ATTENTE" } });
  if (enAttente) {
    await envoyerEmail({ a: d.email, ...confirmation }).catch((e) => console.error("Courriel non envoyé :", e.message));
    return reponse;
  }

  const maintenant = new Date();
  const demande = await prisma.demandeAdhesion.create({
    data: {
      email: d.email,
      nom: d.nom,
      prenom: d.prenom,
      dateNaissance: new Date(`${d.dateNaissance}T00:00:00Z`),
      adresse: d.adresse,
      codePostal: d.codePostal,
      commune: d.commune,
      telephone: d.telephone,
      responsableNom: mineur ? d.responsableNom : null,
      responsableLien: mineur ? d.responsableLien : null,
      responsableTelephone: mineur ? d.responsableTelephone : null,
      droitImage: d.droitImage === "oui",
      montantPropose: d.montant,
      modeReglement: d.modeReglement,
      consentementLeveeAnonymat: true,
      certifieLe: maintenant,
      consentementRgpdLe: maintenant,
      // RG-21 : chaque acceptation est conservée avec la version du texte et l'horodatage
      acceptations: { create: TEXTES_ADHESION.map((type) => ({ texteId: textes[type].id, accepteLe: maintenant })) },
    },
  });
  await journaliser({ action: "demande.deposee", cibleType: "DemandeAdhesion", cibleId: demande.id });

  await envoyerEmail({ a: d.email, ...confirmation }).catch((e) => console.error("Courriel non envoyé :", e.message));
  const alerte = emailNouvelleDemande({ nomComplet: `${d.prenom} ${d.nom}`, commune: d.commune, mineur, lien: `${site}/admin/demandes/${demande.id}` });
  const bureau = await emailsBureau();
  for (const a of bureau.length ? bureau : [await adresseAssociation()]) {
    await envoyerEmail({ a, ...alerte }).catch((e) => console.error("Courriel non envoyé :", e.message));
  }
  return reponse;
}
