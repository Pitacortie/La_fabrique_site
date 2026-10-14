import { beforeAll, describe, expect, it } from "vitest";
import { COMPTES, Navigateur, connecte, courriels, dernierCourriel, pause, prisma, texteVisible } from "./outils.mjs";

const membre = (cle) => prisma.membre.findUnique({ where: { email: COMPTES[cle].email }, include: { alias: true } });
const aliasDe = async (cle) => (await membre(cle)).alias;
const rubrique = (code) => prisma.rubriqueSel.findUnique({ where: { code } });
// Solde du compte de solidarité : mouvements crédités à « null » moins ceux débités de « null »
async function soldeSolidarite() {
  const somme = async (where) => (await prisma.transactionBriques.aggregate({ _sum: { montant: true }, where }))._sum.montant ?? 0;
  return (await somme({ crediteId: null })) - (await somme({ debiteId: null }));
}

async function publier(nav, champs) {
  const r = await nav.soumettre("/sel/annonces/nouvelle", 'name="titre"', {
    type: "OFFRE",
    nature: "SERVICE",
    rubriqueId: (await rubrique("jardin")).id,
    titre: "Tonte de pelouse",
    description: "Je propose de tondre votre pelouse avec ma tondeuse, le samedi matin de préférence.",
    modalite: "PRESENTIEL",
    dureeHeures: "1",
    dureeMinutes: "30",
    intention: "publier",
    ...champs,
  });
  return { ...r, id: r.location?.match(/annonces\/([^?]+)/)?.[1] };
}

async function contacter(nav, annonceId, texte = "Bonjour, votre annonce m'intéresse !") {
  const r = await nav.soumettre(`/sel/annonces/${annonceId}`, 'id="texte-contact"', { texte });
  return { ...r, id: r.location?.match(/messages\/(.+)$/)?.[1] };
}

const ASSURANCE = { possedeRc: "on", numeroPolice: "MAIF-123456", compagnie: "MAIF", adresseCompagnie: "200 avenue Salvador Allende, 79000 Niort" };

describe("SEL : qui peut entrer", () => {
  it("un visiteur est renvoyé vers la connexion, qui explique que le SEL est réservé aux adhérents", async () => {
    const nav = new Navigateur();
    const { location } = await nav.page("/sel");
    expect(location).toMatch(/^\/connexion\?suite=%2Fsel/);
    expect(texteVisible((await nav.page(location)).html)).toContain("Le SEL est réservé aux adhérents");
  });

  it("un membre connecté sans cotisation à jour est renvoyé vers Adhérer, avec un message rouge", async () => {
    const nav = await connecte("adherent");
    const { location } = await nav.page("/sel");
    expect(location).toBe("/adherer?raison=sel");
    const { html } = await nav.page(location);
    expect(html).toMatch(/class="message-erreur"[^>]*>Le SEL est réservé aux adhérents à jour de leur cotisation/);
  });

  it("un adhérent à jour mais pas encore inscrit arrive sur l'inscription au SEL", async () => {
    const nav = await connecte("selNouveau");
    expect((await nav.page("/sel")).location).toBe("/sel/inscription");
    expect(texteVisible((await nav.page("/sel/inscription")).html)).toContain("Bienvenue dans le SEL");
  });

  it("un inscrit sans assurance déclarée doit d'abord la déclarer", async () => {
    const nav = await connecte("selExpire");
    expect((await nav.page("/sel")).location).toBe("/sel/inscription");
    expect(texteVisible((await nav.page("/sel/inscription")).html)).toContain("Votre assurance responsabilité civile");
  });

  it("un adhérent inscrit et en règle entre dans le SEL", async () => {
    const nav = await connecte("selUn");
    const { status, html } = await nav.page("/sel");
    expect(status).toBe(200);
    expect(html).toContain("Services proposés");
    expect(html).toContain("Services demandés");
    expect(html).toContain("Publier une annonce");
  });
});

describe("SEL : inscription et assurance déclarative (SEL-2, SEL-21)", () => {
  const MARQUEUR = 'name="numeroPolice"';
  const inscrire = (nav, extra = {}) =>
    nav.soumettre("/sel/inscription", MARQUEUR, { "accepte-CHARTE_SEL": "on", "accepte-REGLEMENT_SEL": "on", ...ASSURANCE, ...extra });

  it("aucun document n'est demandé : pas de champ de fichier", async () => {
    const { html } = await (await connecte("selNouveau")).page("/sel/inscription");
    expect(html).not.toContain('type="file"');
    expect(texteVisible(html)).toContain("Je possède une assurance responsabilité civile en cours de validité");
  });

  it("il faut accepter la Charte et le Règlement du SEL", async () => {
    const nav = await connecte("selNouveau");
    expect((await inscrire(nav, { "accepte-CHARTE_SEL": null })).message).toBe("Vous devez accepter la Charte des membres du SEL.");
    expect((await inscrire(nav, { "accepte-REGLEMENT_SEL": null })).message).toBe("Vous devez accepter le Règlement intérieur du SEL.");
  });

  it.each([
    [{ possedeRc: null }, /une assurance responsabilité civile en cours de validité est obligatoire/],
    [{ numeroPolice: "" }, /numéro de votre contrat/],
    [{ compagnie: "" }, /nom de la compagnie/],
    [{ adresseCompagnie: "" }, /adresse de la compagnie/],
  ])("refuse une déclaration incomplète : %j", async (extra, message) => {
    expect((await inscrire(await connecte("selNouveau"), extra)).message).toMatch(message);
  });

  it("l'inscription ouvre le SEL tout de suite, sans vérification par l'association", async () => {
    const nav = await connecte("selNouveau");
    expect((await inscrire(nav)).location).toBe("/sel?bienvenue=1");
    expect((await nav.page("/sel")).status).toBe(200);
    const m = await membre("selNouveau");
    const inscription = await prisma.inscriptionSel.findUnique({ where: { membreId: m.id } });
    expect(inscription.assuranceRc).toMatchObject({ numeroPolice: "MAIF-123456", compagnie: "MAIF", adresseCompagnie: ASSURANCE.adresseCompagnie });
    const acceptes = await prisma.acceptation.findMany({ where: { membreId: m.id }, include: { texte: true } });
    expect(acceptes.map((a) => a.texte.type)).toEqual(expect.arrayContaining(["CHARTE_SEL", "REGLEMENT_SEL"]));
    await pause(200);
    expect(dernierCourriel(COMPTES.selNouveau.email).objet).toBe("Bienvenue dans le SEL");
  });

  it("un inscrit sans assurance la déclare et entre dans le SEL", async () => {
    const nav = await connecte("selRefuse");
    await inscrire(nav);
    const sans = await connecte("selExpire");
    const r = await sans.soumettre("/sel/inscription", MARQUEUR, ASSURANCE);
    expect(r.location).toBe("/sel");
    expect((await sans.page("/sel")).status).toBe(200);
  });

  it("un membre met à jour son assurance ; l'administration la voit, sans document", async () => {
    const nav = await connecte("selUn");
    const r = await nav.soumettre("/sel/assurance", MARQUEUR, { ...ASSURANCE, numeroPolice: "NOUVEAU-789" });
    expect(r.message).toBe("Votre assurance est enregistrée.");
    const admin = await connecte("admin");
    expect(texteVisible((await admin.page("/admin/sel/inscriptions")).html)).toContain("NOUVEAU-789");
  });
});

describe("SEL : annonces (SEL-3 à SEL-6, RG-3, RG-12)", () => {
  let un, deux, idOffre;
  beforeAll(async () => {
    un = await connecte("selUn");
    deux = await connecte("selDeux");
  });

  it("publie une offre, visible dans « Services proposés » et pas dans « Services demandés »", async () => {
    const r = await publier(un, {});
    expect(r.location).toMatch(/^\/sel\/annonces\/.+\?publiee=1$/);
    idOffre = r.id;
    expect(texteVisible((await deux.page("/sel")).html)).toContain("Tonte de pelouse");
    expect(texteVisible((await deux.page("/sel/demandes")).html)).not.toContain("Tonte de pelouse");
  });

  it("l'annonce est publiée sous le code de l'auteur, jamais sous son nom (RG-3)", async () => {
    const auteur = await membre("selUn");
    for (const page of ["/sel", `/sel/annonces/${idOffre}`]) {
      const { html } = await deux.page(page);
      expect(html, page).toContain(auteur.alias.code);
      expect(html, page).not.toContain(auteur.prenom);
      expect(html, page).not.toContain(auteur.email);
    }
  });

  it("la recherche et les filtres trouvent l'annonce", async () => {
    expect(texteVisible((await deux.page("/sel?q=pelouse")).html)).toContain("Tonte de pelouse");
    expect(texteVisible((await deux.page("/sel?q=tondeuse samedi")).html)).toContain("Tonte de pelouse");
    expect(texteVisible((await deux.page("/sel?q=piano")).html)).not.toContain("Tonte de pelouse");
    expect(texteVisible((await deux.page("/sel?rubrique=jardin")).html)).toContain("Tonte de pelouse");
    expect(texteVisible((await deux.page("/sel?rubrique=animaux")).html)).not.toContain("Tonte de pelouse");
    expect(texteVisible((await deux.page("/sel?nature=DON")).html)).not.toContain("Tonte de pelouse");
  });

  it.each([
    [{ description: "Appelez-moi au 06 12 34 56 78 pour en parler, je suis disponible." }, /un numéro de téléphone/],
    [{ description: "Rendez-vous au 12 rue des Lilas, je vous attends avec plaisir." }, /une adresse/],
    [{ description: "Écrivez-moi à moi@exemple.fr pour plus d'informations sur ce service." }, /une adresse e-mail/],
  ])("refuse une annonce qui contient des données personnelles (section 6.6) : %j", async (champs, motif) => {
    expect((await publier(un, champs)).message).toMatch(motif);
  });

  it("un objet contre briques doit avoir une valeur (SEL-14) ; rubrique et nature sont obligatoires (RG-12)", async () => {
    expect((await publier(un, { nature: "OBJET", valeurBriques: null })).message).toMatch(/valeur de l'objet en briques/);
    expect((await publier(un, { rubriqueId: null })).message).toBe("Choisissez une catégorie.");
    expect((await publier(un, { nature: "INCONNUE" })).message).toBe("Choisissez la nature de l'annonce.");
  });

  it("les annonces d'un membre sans assurance déclarée sont masquées (SEL-19)", async () => {
    const m = await prisma.membre.create({
      data: {
        email: "sans-assurance-annonce@test.local", nom: "Test", prenom: "Sans", statut: "ACTIF",
        alias: { create: { code: "FAB-SANSRC" } },
        cotisations: { create: { montant: 1, modeReglement: "ESPECES", recueLe: new Date(), valideJusquau: new Date(Date.UTC(new Date().getUTCFullYear() + 1, 11, 31)), saisieParId: (await membre("bureau")).id } },
        inscriptionSel: { create: {} },
      },
      include: { alias: true },
    });
    await prisma.annonce.create({
      data: { type: "OFFRE", nature: "SERVICE", rubriqueId: (await rubrique("jardin")).id, titre: "Annonce d'un membre sans assurance", description: "Elle ne doit pas être visible.", modalite: "PRESENTIEL", auteurId: m.alias.id },
    });
    expect(texteVisible((await deux.page("/sel")).html)).not.toContain("Annonce d'un membre sans assurance");
  });

  it("une annonce peut rester en brouillon, visible de son seul auteur, puis être publiée (SEL-5)", async () => {
    const r = await publier(un, { titre: "Cours de guitare", description: "Je propose des cours de guitare pour débutants, le mercredi après-midi.", intention: "brouillon" });
    expect(r.location).toMatch(/\?brouillon=1$/);
    expect((await prisma.annonce.findUnique({ where: { id: r.id } })).statut).toBe("BROUILLON");
    expect(texteVisible((await deux.page("/sel")).html)).not.toContain("Cours de guitare");
    expect((await deux.page(`/sel/annonces/${r.id}`)).status).toBe(404);
    expect(texteVisible((await un.page("/sel/mes-annonces")).html)).toContain("Brouillons (1)");
    await un.soumettre(`/sel/annonces/${r.id}`, "Publier l&#x27;annonce");
    expect(texteVisible((await deux.page("/sel")).html)).toContain("Cours de guitare");
  });

  it("aucune localisation n'est demandée : seulement « présentiel » ou « à distance »", async () => {
    const { html } = await un.page("/sel/annonces/nouvelle");
    expect(html).not.toContain('name="zone"');
    expect(texteVisible(html)).toContain("En présentiel");
  });

  it("l'auteur peut clore son annonce, qui disparaît de la bibliothèque, puis la republier", async () => {
    await un.soumettre(`/sel/annonces/${idOffre}`, "Clore l&#x27;annonce");
    expect(texteVisible((await deux.page("/sel")).html)).not.toContain("Tonte de pelouse");
    expect((await deux.page(`/sel/annonces/${idOffre}`)).status).toBe(404);
    await un.soumettre(`/sel/annonces/${idOffre}`, "Republier l&#x27;annonce");
    expect(texteVisible((await deux.page("/sel")).html)).toContain("Tonte de pelouse");
  });

  it("personne d'autre que l'auteur ne peut modifier l'annonce", async () => {
    expect((await deux.page(`/sel/annonces/${idOffre}/modifier`)).status).toBe(404);
    const donnees = await un.formulaire(`/sel/annonces/${idOffre}/modifier`, 'name="titre"');
    donnees.set("titre", "Titre piraté par un autre membre");
    await deux.envoyer(`/sel/annonces/${idOffre}/modifier`, donnees);
    expect((await prisma.annonce.findUnique({ where: { id: idOffre } })).titre).toBe("Tonte de pelouse");
  });
});

describe("SEL : messagerie, anonymat et échange complet en briques", () => {
  let un, deux, trois, idAnnonce, idConv;
  beforeAll(async () => {
    un = await connecte("selUn");
    deux = await connecte("selDeux");
    trois = await connecte("selTrois");
    idAnnonce = (await publier(un, { titre: "Aide au potager", description: "Je peux vous aider à préparer et planter votre potager au printemps." })).id;
  });

  it("« Contacter » crée la conversation ; l'auteur reçoit un courriel sans contenu ni code (MSG-9)", async () => {
    const r = await contacter(deux, idAnnonce, "Bonjour, j'aurais besoin d'aide samedi prochain.");
    expect(r.location).toMatch(/^\/sel\/messages\//);
    idConv = r.id;
    await pause(200);
    const c = dernierCourriel(COMPTES.selUn.email);
    expect(c.objet).toBe("Nouveau message dans le SEL");
    expect(c.texte).not.toContain("samedi prochain");
    expect(c.texte).not.toContain((await aliasDe("selDeux")).code);
  });

  it("l'auteur voit une pastille de message non lu, qui disparaît après lecture", async () => {
    expect((await un.page("/sel")).html).toMatch(/class="pastille"[^>]*aria-label="\d+ messages non lus"/);
    const fil = texteVisible((await un.page(`/sel/messages/${idConv}`)).html);
    expect(fil).toContain("j'aurais besoin d'aide samedi prochain");
    expect((await un.page("/sel")).html).not.toMatch(/messages non lus/);
  });

  it("une troisième personne ne peut ni lire ni écrire dans la conversation (MSG-11)", async () => {
    expect((await trois.page(`/sel/messages/${idConv}`)).status).toBe(404);
    const donnees = await deux.formulaire(`/sel/messages/${idConv}`, 'id="texte"');
    donnees.set("texte", "Message d'un intrus");
    await trois.envoyer(`/sel/messages/${idConv}`, donnees);
    expect(await prisma.message.count({ where: { texte: "Message d'un intrus" } })).toBe(0);
  });

  it("un seul courriel tant que les messages précédents ne sont pas lus", async () => {
    await pause(200);
    const avant = courriels().filter((c) => c.a === COMPTES.selDeux.email && c.objet === "Nouveau message dans le SEL").length;
    for (const texte of ["Oui, avec plaisir !", "Je viens avec mes outils."]) await un.soumettre(`/sel/messages/${idConv}`, 'id="texte"', { texte });
    await pause(200);
    const apres = courriels().filter((c) => c.a === COMPTES.selDeux.email && c.objet === "Nouveau message dans le SEL").length;
    expect(apres - avant).toBe(1);
  });

  it("aucune identité n'apparaît avant la levée d'anonymat", async () => {
    const auteur = await membre("selUn");
    const { html } = await deux.page(`/sel/messages/${idConv}`);
    expect(texteVisible(html)).not.toContain(auteur.prenom);
    expect(html).not.toContain(auteur.telephone);
  });

  it("pour un échange en personne, le rendez-vous exige la levée d'anonymat (RG-14)", async () => {
    const formulaire = await deux.page(`/sel/messages/${idConv}`);
    expect(texteVisible(formulaire.html)).toContain("révélez d'abord vos identités");
  });

  it("levée d'anonymat : visible seulement quand les deux ont accepté, et journalisée (section 6.5)", async () => {
    const auteur = await membre("selUn");
    const interlocuteur = await membre("selDeux");
    await deux.soumettre(`/sel/messages/${idConv}`, 'name="confirmation"', { confirmation: "on", raison: "presentiel" });
    expect(texteVisible((await deux.page(`/sel/messages/${idConv}`)).html)).not.toContain(`${auteur.prenom} ${auteur.nom}`);
    await un.soumettre(`/sel/messages/${idConv}`, 'name="confirmation"', { confirmation: "on", raison: "presentiel" });
    expect(texteVisible((await deux.page(`/sel/messages/${idConv}`)).html)).toContain(`${auteur.prenom} ${auteur.nom}`);
    expect(texteVisible((await un.page(`/sel/messages/${idConv}`)).html)).toContain(`${interlocuteur.prenom} ${interlocuteur.nom}`);
    const trace = await prisma.journalAudit.findFirst({ where: { action: "sel.anonymat_leve", cibleId: idConv } });
    // Qui, quand, pourquoi ; nom, prénom et adresse révélés
    expect(trace).toMatchObject({ acteurId: auteur.id, motif: "Rencontre en personne" });
    expect(texteVisible((await deux.page(`/sel/messages/${idConv}`)).html)).toContain(auteur.adresse);
  });

  it("le bénéficiaire propose le rendez-vous (heure de Ménesplet), le prestataire le confirme", async () => {
    await deux.soumettre(`/sel/messages/${idConv}`, 'name="lieu"', { date: "2030-11-14", heure: "14:30", lieu: "Devant la mairie" });
    expect(texteVisible((await deux.page(`/sel/messages/${idConv}`)).html)).toContain("En attente de la confirmation");
    const e = await prisma.echange.findFirst({ where: { conversationId: idConv } });
    expect(e.statut).toBe("PROPOSE");
    expect(e.creneau.toISOString()).toBe("2030-11-14T13:30:00.000Z"); // 14 h 30 à Paris en hiver
    await pause(200);
    expect(dernierCourriel(COMPTES.selUn.email).objet).toBe("Un échange du SEL attend votre réponse");

    expect(await deux.page(`/sel/messages/${idConv}`).then((p) => p.html)).not.toContain("Confirmer le rendez-vous");
    await un.soumettre(`/sel/messages/${idConv}`, "Confirmer le rendez-vous");
    expect((await prisma.echange.findUnique({ where: { id: e.id } })).statut).toBe("CONFIRME");
  });

  it("le prestataire déclare le temps passé et si tout s'est bien passé", async () => {
    await un.soumettre(`/sel/messages/${idConv}`, 'name="bienPasse"', { heures: "1", minutes: "30", bienPasse: "oui", commentaire: "Très bon moment" });
    expect(texteVisible((await deux.page(`/sel/messages/${idConv}`)).html)).toContain("déclare : 1 h 30, soit 90 briques");
    const e = await prisma.echange.findFirst({ where: { conversationId: idConv } });
    expect(e.statut).toBe("DECLARE");
    expect(e.briques).toBe(90);
  });

  it("le bénéficiaire confirme : 90 briques passent de l'un à l'autre, avec une trace dans le grand livre", async () => {
    const [avantUn, avantDeux] = [(await aliasDe("selUn")).soldeBriques, (await aliasDe("selDeux")).soldeBriques];
    await deux.soumettre(`/sel/messages/${idConv}`, 'name="avis"', { avis: "Merci beaucoup !" });
    expect(texteVisible((await deux.page(`/sel/messages/${idConv}`)).html)).toContain("Échange terminé");
    expect((await aliasDe("selUn")).soldeBriques).toBe(avantUn + 90);
    expect((await aliasDe("selDeux")).soldeBriques).toBe(avantDeux - 90);
    const e = await prisma.echange.findFirst({ where: { conversationId: idConv }, include: { transaction: true } });
    expect(e.statut).toBe("TERMINE");
    expect(e.transaction.montant).toBe(90);
    expect(texteVisible((await deux.page("/sel/briques")).html)).toContain("−90");
    expect(texteVisible((await un.page("/sel/briques")).html)).toContain("+90");
  });

  it("rejouer la confirmation ne transfère rien de plus", async () => {
    const e = await prisma.echange.findFirst({ where: { conversationId: idConv } });
    const avant = (await aliasDe("selDeux")).soldeBriques;
    const donnees = new FormData();
    const page = await deux.page(`/sel/messages/${idConv}`);
    for (const m of page.html.matchAll(/<input type="hidden" name="(\$ACTION_[^"]+)"(?: value="([^"]*)")?/g)) donnees.append(m[1], m[2] ?? "");
    donnees.set("conversationId", idConv);
    donnees.set("echangeId", e.id);
    await deux.envoyer(`/sel/messages/${idConv}`, donnees);
    expect((await aliasDe("selDeux")).soldeBriques).toBe(avant);
    expect(await prisma.transactionBriques.count({ where: { echangeId: e.id } })).toBe(1);
  });
});

describe("SEL : soldes, solidarité, litige, modération, blocage", () => {
  let un, pauvre, trois, admin, idDistance;
  beforeAll(async () => {
    un = await connecte("selUn");
    pauvre = await connecte("selPauvre");
    trois = await connecte("selTrois");
    admin = await connecte("admin");
    idDistance = (await publier(un, { titre: "Aide informatique à distance", description: "Je vous aide à installer et utiliser une application, en visio.", modalite: "DISTANCE", rubriqueId: (await rubrique("savoirs")).id })).id;
  });

  async function echangeJusquaDeclaration(nav, minutes) {
    const { id } = await contacter(nav, idDistance, "Bonjour, pouvez-vous m'aider pour mon téléphone ?");
    const conv = id ?? (await prisma.conversation.findFirst({ where: { annonceId: idDistance, interlocuteur: { membre: { email: nav === pauvre ? COMPTES.selPauvre.email : COMPTES.selTrois.email } } } })).id;
    // À distance : pas besoin de lever l'anonymat avant le rendez-vous
    await nav.soumettre(`/sel/messages/${conv}`, 'name="lieu"', { date: "2030-12-01", heure: "10:00" });
    await un.soumettre(`/sel/messages/${conv}`, "Confirmer le rendez-vous");
    await un.soumettre(`/sel/messages/${conv}`, 'name="bienPasse"', { heures: "0", minutes: String(minutes), bienPasse: "oui" });
    return conv;
  }

  it("le solde peut passer sous -120 sans blocage ; le CA est alerté (SEL-22)", async () => {
    const alias = await aliasDe("selPauvre");
    await prisma.alias.update({ where: { id: alias.id }, data: { soldeBriques: -100 } });
    const conv = await echangeJusquaDeclaration(pauvre, 30);
    await pauvre.soumettre(`/sel/messages/${conv}`, 'name="avis"');
    expect((await prisma.echange.findFirst({ where: { conversationId: conv } })).statut).toBe("TERMINE");
    expect((await aliasDe("selPauvre")).soldeBriques).toBe(-130);
    expect(await prisma.journalAudit.findFirst({ where: { action: "sel.alerte_solde", cibleId: alias.id } })).toBeTruthy();
    await pause(200);
    expect(courriels().some((c) => c.a === COMPTES.bureau.email && c.objet === "Solde de briques à regarder (SEL)" && c.texte.includes(alias.code))).toBe(true);
  });

  it("un membre donne des briques au compte de solidarité, sans pouvoir donner plus que son solde (SEL-25)", async () => {
    const avant = await soldeSolidarite();
    const soldeUn = (await aliasDe("selUn")).soldeBriques;
    expect((await un.soumettre("/sel/briques", 'name="montant"', { montant: String(soldeUn + 1) })).message).toBe("Votre solde ne permet pas ce don.");
    expect((await un.soumettre("/sel/briques", 'name="montant"', { montant: "10" })).message).toMatch(/10 briques versées/);
    expect((await aliasDe("selUn")).soldeBriques).toBe(soldeUn - 10);
    expect((await soldeSolidarite()) - avant).toBeGreaterThanOrEqual(10);
  });

  it("un administrateur vient en aide à un membre avec le compte de solidarité, dans la limite de son solde", async () => {
    const alias = await aliasDe("selPauvre");
    expect((await admin.soumettre("/admin/sel/solidarite", 'name="code"', { code: alias.code, montant: "999999999", motif: "Aide trop grosse" })).message)
      .toBe("Le compte de solidarité n'a pas assez de briques.");
    const r = await admin.soumettre("/admin/sel/solidarite", 'name="code"', { code: alias.code, montant: "5", motif: "Coup de pouce après un imprévu" });
    expect(r.message).toBe(`5 briques versées à ${alias.code}.`);
    expect((await aliasDe("selPauvre")).soldeBriques).toBe(-125);
    expect(await prisma.journalAudit.findFirst({ where: { action: "sel.aide_solidarite", cibleId: alias.id, motif: "Coup de pouce après un imprévu" } })).toBeTruthy();
  });

  it("contester une déclaration ouvre un litige ; l'administration tranche après médiation (SEL-8)", async () => {
    const conv = await echangeJusquaDeclaration(trois, 45);
    await trois.soumettre(`/sel/messages/${conv}`, "Contester", { motif: "Le service n'a duré que vingt minutes." });
    expect(texteVisible((await trois.page(`/sel/messages/${conv}`)).html)).toContain("proposera une médiation");
    const e = await prisma.echange.findFirst({ where: { conversationId: conv } });
    expect(e.statut).toBe("LITIGE");
    await pause(200);
    expect(dernierCourriel(COMPTES.bureau.email).objet).toBe("Échange du SEL contesté : médiation");

    expect(texteVisible((await admin.page("/admin/sel")).html)).toContain("Le service n'a duré que vingt minutes.");
    expect((await admin.page(`/admin/sel/conversations/${conv}`)).html).toContain("Accès enregistré au journal");
    const avant = (await aliasDe("selTrois")).soldeBriques;
    await admin.soumettre("/admin/sel", `value="${e.id}"`, { decision: "annuler", note: "Après médiation, échange annulé d'un commun accord." });
    expect((await prisma.echange.findUnique({ where: { id: e.id } })).statut).toBe("ANNULE");
    expect((await aliasDe("selTrois")).soldeBriques).toBe(avant);
  });

  it("dès qu'un mineur est concerné, même à distance, la levée d'anonymat est obligatoire (RG-14)", async () => {
    const m = await membre("selPauvre");
    const conv = await prisma.conversation.findFirst({ where: { annonceId: idDistance, interlocuteurId: m.alias.id } });
    await prisma.membre.update({ where: { id: m.id }, data: { dateNaissance: new Date(Date.now() - 12 * 365 * 86_400_000) } });
    try {
      const { html } = await pauvre.page(`/sel/messages/${conv.id}`);
      expect(texteVisible(html)).toContain("révélez d'abord vos identités");
      expect(html).not.toContain('name="lieu"');
    } finally {
      await prisma.membre.update({ where: { id: m.id }, data: { dateNaissance: m.dateNaissance } });
    }
  });

  it("un administrateur ne peut pas lire une conversation sans signalement ni litige (MSG-11)", async () => {
    const autre = await prisma.conversation.findFirst({ where: { signalements: { none: {} }, echanges: { none: { statut: "LITIGE" } } } });
    expect(texteVisible((await admin.page(`/admin/sel/conversations/${autre.id}`)).html)).toContain("elle reste privée");
  });

  it("signaler un message l'envoie à la modération, qui peut alors lire la conversation", async () => {
    const conv = await prisma.conversation.findFirst({ where: { annonceId: idDistance, interlocuteur: { membre: { email: COMPTES.selTrois.email } } } });
    const message = await prisma.message.findFirst({ where: { conversationId: conv.id, emetteurId: { not: conv.interlocuteurId } } })
      ?? (await prisma.message.create({ data: { conversationId: conv.id, emetteurId: conv.auteurId, texte: "Message à signaler" } }));
    const r = await trois.soumettre(`/sel/messages/${conv.id}`, 'name="messageId"', { messageId: message.id, motif: "PROPOS", details: "Ton agressif" });
    expect(r.html).toContain("la modération va examiner");
    expect(texteVisible((await admin.page("/admin/sel/signalements")).html)).toContain("Ton agressif");
  });

  it("l'administration masque une annonce avec un motif : elle disparaît du SEL (NEU-3)", async () => {
    await admin.soumettre("/admin/sel/annonces", `value="${idDistance}"`, { action: "masquer", motif: "Test de modération" });
    expect((await prisma.annonce.findUnique({ where: { id: idDistance } })).statut).toBe("MASQUEE");
    expect(texteVisible((await trois.page("/sel")).html)).not.toContain("Aide informatique à distance");
    expect(texteVisible((await un.page(`/sel/annonces/${idDistance}`)).html)).toContain("Masquée par la modération");
  });

  it("bloquer l'interlocuteur ferme la conversation pour les deux (MSG-7)", async () => {
    const conv = await prisma.conversation.findFirst({ where: { annonceId: idDistance, interlocuteur: { membre: { email: COMPTES.selTrois.email } } } });
    await trois.soumettre(`/sel/messages/${conv.id}`, "Fermer la conversation");
    expect((await prisma.conversation.findUnique({ where: { id: conv.id } })).statut).toBe("FERMEE");
    const html = texteVisible((await un.page(`/sel/messages/${conv.id}`)).html);
    expect(html).toContain("Cette conversation est fermée");
  });

  it("un membre suspendu par l'administration n'accède plus au SEL ; son solde est conservé (SEL-19)", async () => {
    const m = await membre("selTrois");
    const inscription = await prisma.inscriptionSel.findUnique({ where: { membreId: m.id } });
    await admin.soumettre("/admin/sel/inscriptions", `value="${inscription.id}"`, { action: "suspendre", motif: "Test de suspension" });
    const nav = await connecte("selTrois");
    expect((await nav.page("/sel")).location).toBe("/sel/inscription");
    expect(texteVisible((await nav.page("/sel/inscription")).html)).toContain("Votre accès au SEL est suspendu : Test de suspension");
    expect((await aliasDe("selTrois")).soldeBriques).toBe(m.alias.soldeBriques);
  });

  it("une nouvelle rubrique ajoutée par l'administration est proposée aux adhérents (ADM-10)", async () => {
    await admin.soumettre("/admin/sel/rubriques", "Ajouter la rubrique", { libelle: "Musique et chant", ordre: "50", actif: "on" });
    expect((await un.page("/sel/annonces/nouvelle")).html).toContain("Musique et chant");
  });
});
