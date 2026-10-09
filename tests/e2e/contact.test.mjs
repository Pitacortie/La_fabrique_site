import { describe, expect, it } from "vitest";
import { COMPTES, Navigateur, connecte, courriels, dernierCourriel, pause, prisma, texteVisible } from "./outils.mjs";

const FORMULAIRE = 'name="texte"';
const ASSOCIATION = "contact@lafabriquedemenesplet.fr";

describe("formulaire Contacts (CTC-1 à CTC-5, ADM-4)", () => {
  it("le message est enregistré, transmis à l'association et accusé auprès de l'expéditeur", async () => {
    const r = await new Navigateur().soumettre("/contact", FORMULAIRE, {
      nom: "Jeanne Visiteuse",
      email: "jeanne@exemple.fr",
      sujet: "projet",
      texte: "J'aimerais proposer un atelier de réparation de vélos.",
    });
    expect(r.message).toMatch(/votre message a bien été envoyé/);
    const m = await prisma.messageContact.findFirst({ where: { email: "jeanne@exemple.fr" } });
    expect(m.sujet).toBe("Vos attentes, vos projets");
    expect(m.statut).toBe("NOUVEAU");

    await pause(200);
    const pourAssociation = dernierCourriel(ASSOCIATION);
    expect(pourAssociation.objet).toBe("Nouveau message : Vos attentes, vos projets");
    expect(pourAssociation.texte).toContain("atelier de réparation de vélos");
    const accuse = dernierCourriel("jeanne@exemple.fr");
    expect(accuse.objet).toBe("Votre message a bien été reçu");
    // L'accusé ne reprend pas le message : le formulaire ne peut pas servir à envoyer un texte arbitraire
    expect(accuse.texte).not.toContain("atelier de réparation");
  });

  it.each([
    [{ nom: "" }, "Indiquez votre nom."],
    [{ email: "pas-un-email" }, "Adresse e-mail invalide."],
    [{ texte: "court" }, "Votre message est trop court (10 caractères minimum)."],
    [{ sujet: "inconnu" }, "Choisissez un objet."],
  ])("refuse %j", async (champs, message) => {
    const r = await new Navigateur().soumettre("/contact", FORMULAIRE, {
      nom: "Paul",
      email: "paul@exemple.fr",
      sujet: "question",
      texte: "Une question assez longue.",
      ...champs,
    });
    expect(r.message).toBe(message);
  });

  it("le champ piège anti-robot n'enregistre rien et n'envoie rien (CTC-4)", async () => {
    await new Navigateur().soumettre("/contact", FORMULAIRE, { nom: "Robot", email: "robot@spam.example", sujet: "autre", texte: "Achetez nos produits !!!", site_web: "x" });
    expect(await prisma.messageContact.count({ where: { email: "robot@spam.example" } })).toBe(0);
    await pause(200);
    expect(courriels().some((c) => c.a === "robot@spam.example")).toBe(false);
  });

  it("limite à 5 messages par heure depuis une même adresse", async () => {
    const nav = new Navigateur();
    let r;
    for (let i = 0; i < 6; i++) r = await nav.soumettre("/contact", FORMULAIRE, { nom: "Rafale", email: "rafale@exemple.fr", sujet: "autre", texte: `Message numéro ${i} en rafale` });
    expect(r.message).toMatch(/plusieurs messages récemment/);
  });

  it("« ?sujet=projet » préselectionne « Vos attentes, vos projets » (PRJ-2)", async () => {
    expect((await new Navigateur().page("/contact?sujet=projet")).html).toMatch(/<option value="projet" selected="">/);
  });

  it("un membre connecté retrouve son nom et son e-mail déjà remplis", async () => {
    const { html } = await (await connecte("adherent")).page("/contact");
    expect(html).toContain(`value="${COMPTES.adherent.email}"`);
  });

  it("l'administration répond depuis la console, au nom de l'association (CTC-2)", async () => {
    const admin = await connecte("admin");
    const m = await prisma.messageContact.findFirst({ where: { email: "jeanne@exemple.fr" } });
    expect(texteVisible((await admin.page("/admin/messages")).html)).toContain("atelier de réparation de vélos");

    const r = await admin.soumettre("/admin/messages", `value="${m.id}"`, { reponse: "Merci Jeanne, venez nous en parler à la prochaine réunion !" });
    expect(r.location).toBe(`/admin/messages?id=${m.id}&repondu=1#${m.id}`);
    expect((await admin.page(`/admin/messages?id=${m.id}&repondu=1`)).html).toContain("Réponse envoyée.");
    const apres = await prisma.messageContact.findUnique({ where: { id: m.id } });
    expect(apres.statut).toBe("TRAITE");
    expect(apres.reponse).toContain("prochaine réunion");

    await pause(200);
    const c = dernierCourriel("jeanne@exemple.fr");
    expect(c.objet).toBe("Réponse de La Fabrique de Ménesplet");
    expect(c.texte).toContain("prochaine réunion");
    expect(c.texte).toContain("atelier de réparation de vélos"); // rappel de la question
    expect(c.texte).toContain("/adherer");
  });

  it("un adhérent ne peut pas répondre à la place de l'association en rejouant la requête", async () => {
    await new Navigateur().soumettre("/contact", FORMULAIRE, { nom: "Luc", email: "luc@exemple.fr", sujet: "question", texte: "Une question pour l'association." });
    const m = await prisma.messageContact.findFirst({ where: { email: "luc@exemple.fr" } });
    const donnees = await (await connecte("admin")).formulaire("/admin/messages", `value="${m.id}"`);
    donnees.set("reponse", "Réponse pirate");
    await (await connecte("adherent")).envoyer("/admin/messages", donnees);
    expect((await prisma.messageContact.findUnique({ where: { id: m.id } })).reponse).toBeNull();
  });
});
