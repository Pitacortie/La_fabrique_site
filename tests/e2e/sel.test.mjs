import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { DOSSIER_TMP } from "./config.mjs";
import { BASE, COMPTES, Navigateur, connecte, courriels, dernierCourriel, pause, prisma, texteVisible } from "./outils.mjs";

const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
const membre = (cle) => prisma.membre.findUnique({ where: { email: COMPTES[cle].email }, include: { alias: true } });
const aliasDe = async (cle) => (await membre(cle)).alias;
const rubrique = (code) => prisma.rubriqueSel.findUnique({ where: { code } });

async function publier(nav, champs) {
  const r = await nav.soumettre("/sel/annonces/nouvelle", 'name="titre"', {
    type: "OFFRE",
    nature: "SERVICE",
    rubriqueId: (await rubrique("jardin")).id,
    titre: "Tonte de pelouse",
    description: "Je propose de tondre votre pelouse avec ma tondeuse, le samedi matin de préférence.",
    zone: "Ménesplet",
    modalite: "PRESENTIEL",
    dureeHeures: "1",
    dureeMinutes: "30",
    ...champs,
  });
  return { ...r, id: r.location?.match(/annonces\/([^?]+)/)?.[1] };
}

async function contacter(nav, annonceId, texte = "Bonjour, votre annonce m'intéresse !") {
  const r = await nav.soumettre(`/sel/annonces/${annonceId}`, 'id="texte-contact"', { texte });
  return { ...r, id: r.location?.match(/messages\/(.+)$/)?.[1] };
}

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

  it("un adhérent dont l'assurance a expiré doit en déposer une nouvelle", async () => {
    const nav = await connecte("selExpire");
    expect((await nav.page("/sel")).location).toBe("/sel/inscription");
    expect(texteVisible((await nav.page("/sel/inscription")).html)).toContain("Votre attestation d'assurance a expiré");
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

describe("SEL : inscription et vérification de l'assurance (SEL-2, SEL-21)", () => {
  const MARQUEUR = 'name="assureur"';
  const champs = (extra = {}) => ({
    "accepte-CHARTE_SEL": "on",
    "accepte-REGLEMENT_SEL": "on",
    assureur: "MAIF",
    valideJusquau: `${new Date().getFullYear() + 1}-06-30`,
    certifie: "on",
    ...extra,
  });
  const avecFichier = (donnees, contenu = PDF, type = "application/pdf") => {
    donnees.set("fichier", new File([contenu], "attestation.pdf", { type }));
    return donnees;
  };
  async function deposer(nav, extra) {
    const donnees = await nav.formulaire("/sel/inscription", MARQUEUR);
    for (const [k, v] of Object.entries(champs(extra))) v === null ? donnees.delete(k) : donnees.set(k, v);
    return nav.envoyer("/sel/inscription", avecFichier(donnees));
  }

  it("il faut accepter la Charte et le Règlement du SEL", async () => {
    const nav = await connecte("selNouveau");
    expect((await deposer(nav, { "accepte-CHARTE_SEL": null })).message).toBe("Vous devez accepter la Charte des membres du SEL.");
    expect((await deposer(nav, { "accepte-REGLEMENT_SEL": null })).message).toBe("Vous devez accepter le Règlement intérieur du SEL.");
  });

  it("refuse un fichier qui n'est pas vraiment un PDF ou une image", async () => {
    const nav = await connecte("selNouveau");
    const donnees = await nav.formulaire("/sel/inscription", MARQUEUR);
    for (const [k, v] of Object.entries(champs())) donnees.set(k, v);
    avecFichier(donnees, Buffer.from("<script>alert(1)</script>"), "application/pdf");
    expect((await nav.envoyer("/sel/inscription", donnees)).message).toBe("Le fichier ne correspond pas à son format.");
  });

  it("refuse une assurance déjà expirée", async () => {
    const nav = await connecte("selNouveau");
    expect((await deposer(nav, { valideJusquau: "2020-01-01" })).message).toMatch(/n'est plus valable/);
  });

  it("l'inscription est enregistrée, le Bureau est prévenu, l'accès attend la vérification", async () => {
    const nav = await connecte("selNouveau");
    expect((await deposer(nav)).location).toBe("/sel/inscription");
    expect(texteVisible((await nav.page("/sel/inscription")).html)).toContain("en cours de vérification");
    expect((await nav.page("/sel")).location).toBe("/sel/inscription");
    const m = await membre("selNouveau");
    const acceptes = await prisma.acceptation.findMany({ where: { membreId: m.id }, include: { texte: true } });
    expect(acceptes.map((a) => a.texte.type)).toEqual(expect.arrayContaining(["CHARTE_SEL", "REGLEMENT_SEL"]));
    await pause(200);
    expect(dernierCourriel(COMPTES.bureau.email).objet).toBe("Attestation d'assurance à vérifier (SEL)");
  });

  it("le fichier est privé : ni un adhérent ni un visiteur ne peuvent l'ouvrir", async () => {
    const a = await prisma.attestationRc.findFirst({ where: { membre: { email: COMPTES.selNouveau.email }, statut: "EN_ATTENTE" } });
    expect((await new Navigateur().page(`/admin/sel/attestations/${a.id}/fichier`)).status).toBe(307);
    expect((await (await connecte("selUn")).page(`/admin/sel/attestations/${a.id}/fichier`)).location).toBe("/espace");
    expect((await fetch(`${BASE}/medias/${a.fichier}`)).status).toBe(404);
  });

  it("l'administrateur ouvre l'attestation (journalisé), la valide : le fichier est supprimé et le SEL s'ouvre", async () => {
    const admin = await connecte("admin");
    const a = await prisma.attestationRc.findFirst({ where: { membre: { email: COMPTES.selNouveau.email }, statut: "EN_ATTENTE" } });
    const fichier = await admin.requete(`/admin/sel/attestations/${a.id}/fichier`);
    expect(fichier.headers.get("content-type")).toBe("application/pdf");
    expect(await prisma.journalAudit.findFirst({ where: { action: "sel.attestation_consultee", cibleId: a.id } })).toBeTruthy();

    await admin.soumettre("/admin/sel/inscriptions", `value="${a.id}"`, { valideJusquau: `${new Date().getFullYear() + 1}-06-30` });
    const apres = await prisma.attestationRc.findUnique({ where: { id: a.id } });
    expect(apres.statut).toBe("VALIDEE");
    expect(apres.fichier).toBeNull();
    const dossier = path.join(DOSSIER_TMP, "prive", "attestations");
    expect(existsSync(dossier) ? readdirSync(dossier).filter((f) => a.fichier.endsWith(f)) : []).toEqual([]);

    await pause(200);
    expect(dernierCourriel(COMPTES.selNouveau.email).objet).toBe("Votre inscription au SEL est validée");
    expect((await (await connecte("selNouveau")).page("/sel")).status).toBe(200);
  });

  it("une attestation refusée : le membre est prévenu et peut en déposer une nouvelle", async () => {
    const nav = await connecte("selRefuse");
    await deposer(nav);
    const a = await prisma.attestationRc.findFirst({ where: { membre: { email: COMPTES.selRefuse.email } } });
    const admin = await connecte("admin");
    const donnees = await admin.formulaire("/admin/sel/inscriptions", 'name="motif"');
    donnees.set("id", a.id);
    donnees.set("motif", "Attestation au nom d'une autre personne");
    await admin.envoyer("/admin/sel/inscriptions", donnees);
    expect((await prisma.attestationRc.findUnique({ where: { id: a.id } })).statut).toBe("REFUSEE");
    await pause(200);
    expect(dernierCourriel(COMPTES.selRefuse.email).texte).toContain("Attestation au nom d'une autre personne");
    const page = texteVisible((await nav.page("/sel/inscription")).html);
    expect(page).toContain("n'a pas pu être validée : Attestation au nom d'une autre personne");
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

  it("les annonces d'un membre dont l'assurance a expiré sont masquées (SEL-19)", async () => {
    const expire = await aliasDe("selExpire");
    await prisma.annonce.create({
      data: { type: "OFFRE", nature: "SERVICE", rubriqueId: (await rubrique("jardin")).id, titre: "Annonce d'un membre expiré", description: "Elle ne doit pas être visible.", zone: "Ménesplet", modalite: "PRESENTIEL", auteurId: expire.id },
    });
    expect(texteVisible((await deux.page("/sel")).html)).not.toContain("Annonce d'un membre expiré");
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
    await deux.soumettre(`/sel/messages/${idConv}`, 'name="confirmation"', { confirmation: "on" });
    expect(texteVisible((await deux.page(`/sel/messages/${idConv}`)).html)).not.toContain(`${auteur.prenom} ${auteur.nom}`);
    await un.soumettre(`/sel/messages/${idConv}`, 'name="confirmation"', { confirmation: "on" });
    expect(texteVisible((await deux.page(`/sel/messages/${idConv}`)).html)).toContain(`${auteur.prenom} ${auteur.nom}`);
    expect(texteVisible((await un.page(`/sel/messages/${idConv}`)).html)).toContain(`${interlocuteur.prenom} ${interlocuteur.nom}`);
    expect(await prisma.journalAudit.findFirst({ where: { action: "sel.anonymat_leve", cibleId: idConv } })).toBeTruthy();
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

describe("SEL : solde minimum, litige, modération, blocage", () => {
  let un, pauvre, trois, admin, idDistance;
  beforeAll(async () => {
    un = await connecte("selUn");
    pauvre = await connecte("selPauvre");
    trois = await connecte("selTrois");
    admin = await connecte("admin");
    idDistance = (await publier(un, { titre: "Aide informatique à distance", description: "Je vous aide à installer et utiliser une application, en visio.", modalite: "DISTANCE", rubriqueId: (await rubrique("informatique")).id })).id;
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

  it("une confirmation qui ferait passer le solde sous -120 est bloquée (SEL-22)", async () => {
    await prisma.alias.update({ where: { id: (await aliasDe("selPauvre")).id }, data: { soldeBriques: -100 } });
    const conv = await echangeJusquaDeclaration(pauvre, 30);
    const r = await pauvre.soumettre(`/sel/messages/${conv}`, 'name="avis"');
    expect(r.message).toMatch(/ne peut pas descendre sous -120/);
    expect((await aliasDe("selPauvre")).soldeBriques).toBe(-100);
    expect((await prisma.echange.findFirst({ where: { conversationId: conv } })).statut).toBe("DECLARE");
  });

  it("avec une dérogation accordée par un administrateur, la confirmation passe", async () => {
    const alias = await aliasDe("selPauvre");
    await admin.soumettre("/admin/sel/inscriptions", `value="${alias.id}"`, { plancher: "-200" });
    expect((await aliasDe("selPauvre")).plancherBriques).toBe(-200);
    const conv = (await prisma.conversation.findFirst({ where: { annonceId: idDistance, interlocuteurId: alias.id } })).id;
    await pauvre.soumettre(`/sel/messages/${conv}`, 'name="avis"');
    expect((await prisma.echange.findFirst({ where: { conversationId: conv } })).statut).toBe("TERMINE");
    expect((await aliasDe("selPauvre")).soldeBriques).toBe(-130);
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
