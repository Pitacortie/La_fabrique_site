import { beforeAll, describe, expect, it } from "vitest";
import { COMPTES, Navigateur, connecte, courriels, dernierCourriel, lienDuCourriel, pause, prisma, texteVisible } from "./outils.mjs";

const FORMULAIRE = 'name="certifie"';
let compteur = 0;

// Une demande complète et valide ; `champs` remplace ou retire (null) des valeurs.
function demande(champs = {}) {
  const n = ++compteur;
  return {
    nom: `Durand${n}`,
    prenom: `Camille${n}`,
    email: `postulant${n}@exemple.fr`,
    telephone: "06 12 34 56 78",
    dateNaissance: "1990-05-14",
    adresse: "3 chemin des Chênes",
    codePostal: "24700",
    commune: "Ménesplet",
    droitImage: "oui",
    montant: "5",
    modeReglement: "CHEQUE",
    accepteCharte: "on",
    accepteStatuts: "on",
    accepteReglement: "on",
    consentementAnonymat: "on",
    certifie: "on",
    rgpd: "on",
    ...champs,
  };
}

const deposer = (champs) => new Navigateur().soumettre("/adherer", FORMULAIRE, demande(champs));
const SUCCES = /votre demande est envoyée/;

describe("dépôt d'une demande d'adhésion (ADH-1 à ADH-4, ADH-15)", () => {
  it("une demande valide est enregistrée « en attente », sans créer de compte", async () => {
    const valeurs = demande();
    const r = await new Navigateur().soumettre("/adherer", FORMULAIRE, valeurs);
    expect(texteVisible(r.html)).toMatch(SUCCES);
    const d = await prisma.demandeAdhesion.findFirst({ where: { email: valeurs.email }, include: { acceptations: { include: { texte: true } } } });
    expect(d.statut).toBe("EN_ATTENTE");
    expect(d.acceptations.map((a) => a.texte.type).sort()).toEqual(["CHARTE_NEUTRALITE", "REGLEMENT_INTERIEUR", "STATUTS"]);
    expect(await prisma.membre.findUnique({ where: { email: valeurs.email } })).toBeNull();
    expect(texteVisible(r.html)).toContain("IBAN"); // modalités de paiement affichées
  });

  it("le postulant reçoit la confirmation avec les modalités de paiement, et le Bureau est prévenu", async () => {
    const valeurs = demande();
    await new Navigateur().soumettre("/adherer", FORMULAIRE, valeurs);
    await pause(200);
    const confirmation = dernierCourriel(valeurs.email);
    expect(confirmation.objet).toBe("Votre demande d'adhésion a bien été reçue");
    expect(confirmation.texte).toContain("Comment payer");
    expect(confirmation.texte).toContain("5 €, chèque");
    const alerte = dernierCourriel(COMPTES.bureau.email);
    expect(alerte.objet).toBe(`Nouvelle demande d'adhésion : ${valeurs.prenom} ${valeurs.nom}`);
    expect(alerte.texte).toMatch(/\/admin\/demandes\/[a-z0-9]+/);
  });

  it.each([
    ["accepteStatuts", "Vous devez accepter les statuts."],
    ["accepteCharte", "Vous devez accepter la charte de neutralité et de participation."],
    ["accepteReglement", "Vous devez accepter le règlement intérieur."],
    ["consentementAnonymat", "Vous devez accepter les règles de levée d'anonymat."],
    ["rgpd", "Vous devez autoriser la conservation de vos données pour la gestion interne."],
  ])("sans la case « %s », la demande est refusée (ADH-2, RG-21)", async (champ, message) => {
    const r = await deposer({ [champ]: null });
    expect(r.message).toBe(message);
  });

  it.each([
    [{ nom: null }, "Nom : champ obligatoire."],
    [{ email: "pas-un-email" }, "Adresse e-mail invalide."],
    [{ codePostal: "247" }, "Le code postal doit comporter 5 chiffres."],
    [{ montant: "0.5" }, "La cotisation est d'un euro minimum."],
    [{ modeReglement: "CARTE_BANCAIRE" }, "Choisissez un mode de règlement."],
    [{ dateNaissance: "2200-01-01" }, "Date de naissance invalide."],
  ])("refuse %j", async (champs, message) => {
    expect((await deposer(champs)).message).toBe(message);
  });

  it("un postulant mineur doit indiquer son responsable légal (ADH-16)", async () => {
    const naissance = `${new Date().getFullYear() - 15}-03-01`;
    expect((await deposer({ dateNaissance: naissance })).message).toMatch(/responsable légal sont obligatoires/);
    const r = await deposer({ dateNaissance: naissance, responsableNom: "Durand Marie", responsableLien: "Mère", responsableTelephone: "06 98 76 54 32" });
    expect(texteVisible(r.html)).toMatch(SUCCES);
  });

  it("refuse une demande si un texte a changé de version pendant la saisie", async () => {
    expect((await deposer({ accepteCharteVersion: "ancienne-version" })).message).toMatch(/vient d'être mis à jour/);
  });

  it("une deuxième demande avec la même adresse ne crée pas de doublon", async () => {
    const valeurs = demande();
    await new Navigateur().soumettre("/adherer", FORMULAIRE, valeurs);
    const r = await new Navigateur().soumettre("/adherer", FORMULAIRE, { ...valeurs, prenom: "Autre" });
    expect(texteVisible(r.html)).toMatch(SUCCES);
    expect(await prisma.demandeAdhesion.count({ where: { email: valeurs.email } })).toBe(1);
  });

  it("l'adresse d'un membre existant : même réponse à l'écran, courriel « vous avez déjà un compte »", async () => {
    const r = await deposer({ email: COMPTES.adherent.email });
    expect(texteVisible(r.html)).toMatch(SUCCES);
    expect(await prisma.demandeAdhesion.count({ where: { email: COMPTES.adherent.email } })).toBe(0);
    await pause(200);
    expect(dernierCourriel(COMPTES.adherent.email).objet).toBe("Vous avez déjà un compte");
  });

  it("le champ piège anti-robot ne crée rien (ADH-8)", async () => {
    const valeurs = demande({ site_web: "http://spam.example" });
    await new Navigateur().soumettre("/adherer", FORMULAIRE, valeurs);
    expect(await prisma.demandeAdhesion.count({ where: { email: valeurs.email } })).toBe(0);
  });
});

describe("validation par le Bureau, activation (ADH-5 à ADH-7, ADH-13, ADM-1)", () => {
  let bureau, valeurs, idDemande;
  const VALIDER = "Valider l&#x27;adhésion";

  beforeAll(async () => {
    bureau = await connecte("bureau");
    valeurs = demande();
    await new Navigateur().soumettre("/adherer", FORMULAIRE, valeurs);
    idDemande = (await prisma.demandeAdhesion.findFirst({ where: { email: valeurs.email } })).id;
  });

  it("la demande apparaît dans la console, et sa consultation est journalisée (RG-9)", async () => {
    expect(texteVisible((await bureau.page("/admin/demandes")).html)).toContain(`${valeurs.prenom} ${valeurs.nom}`);
    const fiche = texteVisible((await bureau.page(`/admin/demandes/${idDemande}`)).html);
    expect(fiche).toContain(valeurs.email);
    expect(fiche).toContain("Statuts de l'association, version");
    expect(await prisma.journalAudit.findFirst({ where: { action: "demande.consultee", cibleId: idDemande } })).toBeTruthy();
  });

  it("un administrateur hors Bureau ne peut pas valider, même en rejouant la requête", async () => {
    const donnees = await bureau.formulaire(`/admin/demandes/${idDemande}`, VALIDER);
    const r = await (await connecte("admin")).envoyer(`/admin/demandes/${idDemande}`, donnees);
    expect(r.location).toBe("/admin?refus=bureau");
    expect((await prisma.demandeAdhesion.findUnique({ where: { id: idDemande } })).statut).toBe("EN_ATTENTE");
  });

  it("valider crée le compte, le code, la cotisation et envoie le lien d'activation en une seule opération", async () => {
    const r = await bureau.soumettre(`/admin/demandes/${idDemande}`, VALIDER, { montant: "5", modeReglement: "ESPECES", categorie: "ACTIF" });
    expect(r.location).toBe(`/admin/demandes/${idDemande}?valide=1`);

    const m = await prisma.membre.findUnique({ where: { email: valeurs.email }, include: { alias: true, cotisations: true, acceptations: true } });
    expect(m.statut).toBe("EN_ATTENTE_ACTIVATION");
    expect(m.categorie).toBe("ACTIF");
    expect(m.motDePasseHash).toBeNull();
    expect(m.alias.code).toMatch(/^FAB-[A-HJ-NP-Z2-9]{6}$/);
    expect(Number(m.cotisations[0].montant)).toBe(5);
    expect(m.cotisations[0].saisieParId).toBe((await prisma.membre.findUnique({ where: { email: COMPTES.bureau.email } })).id);
    expect(m.acceptations).toHaveLength(3); // acceptations de la demande rattachées au membre

    await pause(200);
    const c = dernierCourriel(valeurs.email);
    expect(c.objet).toBe("Bienvenue à La Fabrique de Ménesplet : activez votre compte");
    expect(c.texte).toContain(m.alias.code);
    expect(c.texte).toMatch(/\/activer\/[A-Za-z0-9_-]+/);
  });

  it("une demande déjà traitée ne peut pas être validée une deuxième fois", async () => {
    expect((await bureau.page(`/admin/demandes/${idDemande}`)).html).not.toContain(VALIDER);
    expect(await prisma.membre.count({ where: { email: valeurs.email } })).toBe(1);
  });

  it("avant activation, on ne peut pas se connecter", async () => {
    const r = await new Navigateur().soumettre("/connexion", 'name="motDePasse"', { email: valeurs.email, motDePasse: "nimporte quoi du tout" });
    expect(r.message).toBe("Adresse e-mail ou mot de passe incorrect.");
  });

  it("le lien d'activation permet de choisir son mot de passe et connecte directement", async () => {
    const lien = lienDuCourriel(valeurs.email, "/activer/");
    const nav = new Navigateur();
    const page = texteVisible((await nav.page(lien)).html);
    expect(page).toContain("votre adhésion à La Fabrique de Ménesplet est validée");
    expect((await nav.soumettre(lien, 'name="jeton"', { nouveau: "court", confirmation: "court" })).message).toMatch(/10 caractères/);

    const motDePasse = "ma premiere phrase de passe";
    const r = await nav.soumettre(lien, 'name="jeton"', { nouveau: motDePasse, confirmation: motDePasse });
    expect(r.location).toBe("/espace?bienvenue=1");
    const espace = texteVisible((await nav.page("/espace?bienvenue=1")).html);
    expect(espace).toContain("Votre compte est activé");
    expect((await prisma.membre.findUnique({ where: { email: valeurs.email } })).statut).toBe("ACTIF");

    expect((await new Navigateur().page(lien)).html).toContain("plus valable");
    await new Navigateur().connexion({ email: valeurs.email, motDePasse });
  });
});

describe("refus, classement, lien d'activation renvoyé", () => {
  let bureau;
  beforeAll(async () => {
    bureau = await connecte("bureau");
  });
  const nouvelleDemande = async () => {
    const valeurs = demande();
    await new Navigateur().soumettre("/adherer", FORMULAIRE, valeurs);
    return { valeurs, id: (await prisma.demandeAdhesion.findFirst({ where: { email: valeurs.email } })).id };
  };

  it("un refus avec motif prévient le postulant et ne crée aucun compte (ADH-5, RG-6)", async () => {
    const { valeurs, id } = await nouvelleDemande();
    const r = await bureau.soumettre(`/admin/demandes/${id}`, 'name="motif"', { motif: "Cotisation jamais reçue après relance." });
    expect(r.location).toBe(`/admin/demandes/${id}`);
    const d = await prisma.demandeAdhesion.findUnique({ where: { id } });
    expect(d.statut).toBe("REFUSEE");
    expect(d.motifRefus).toBe("Cotisation jamais reçue après relance.");
    expect(await prisma.membre.findUnique({ where: { email: valeurs.email } })).toBeNull();
    await pause(200);
    const c = dernierCourriel(valeurs.email);
    expect(c.objet).toBe("Votre demande d'adhésion");
    expect(c.texte).toContain("Motif : Cotisation jamais reçue après relance.");
    expect(await prisma.journalAudit.findFirst({ where: { action: "demande.refusee", cibleId: id } })).toBeTruthy();
  });

  it("un refus sans motif envoie quand même un courriel poli", async () => {
    const { valeurs, id } = await nouvelleDemande();
    await bureau.soumettre(`/admin/demandes/${id}`, 'name="motif"', { motif: "" });
    await pause(200);
    expect(dernierCourriel(valeurs.email).texte).not.toContain("Motif");
  });

  it("« classer sans suite » ne prévient personne (ADH-14)", async () => {
    const { valeurs, id } = await nouvelleDemande();
    await pause(200);
    const avant = courriels().filter((c) => c.a === valeurs.email).length;
    await bureau.soumettre(`/admin/demandes/${id}`, "Classer sans suite");
    expect((await prisma.demandeAdhesion.findUnique({ where: { id } })).statut).toBe("CLASSEE_SANS_SUITE");
    await pause(200);
    expect(courriels().filter((c) => c.a === valeurs.email).length).toBe(avant);
  });

  it("le Bureau peut renvoyer un lien d'activation ; l'ancien ne marche plus", async () => {
    const { valeurs, id } = await nouvelleDemande();
    await bureau.soumettre(`/admin/demandes/${id}`, "Valider l&#x27;adhésion", { modeReglement: "VIREMENT", categorie: "ADHERENT" });
    await pause(200);
    const ancien = lienDuCourriel(valeurs.email, "/activer/");
    const r = await bureau.soumettre(`/admin/demandes/${id}`, "Renvoyer le lien d&#x27;activation");
    expect(r.message).toBe(`Nouveau lien d'activation envoyé à ${valeurs.email}.`);
    await pause(200);
    const nouveau = lienDuCourriel(valeurs.email, "/activer/");
    expect(nouveau).not.toBe(ancien);
    expect((await new Navigateur().page(ancien)).html).toContain("plus valable");
  });

  it("« mot de passe oublié » sur un compte pas encore activé renvoie un lien d'activation", async () => {
    const { valeurs, id } = await nouvelleDemande();
    await bureau.soumettre(`/admin/demandes/${id}`, "Valider l&#x27;adhésion", { modeReglement: "CHEQUE", categorie: "ADHERENT" });
    await new Navigateur().soumettre("/mot-de-passe-oublie", 'name="email"', { email: valeurs.email });
    await pause(200);
    expect(dernierCourriel(valeurs.email).objet).toBe("Bienvenue à La Fabrique de Ménesplet : activez votre compte");
  });
});
