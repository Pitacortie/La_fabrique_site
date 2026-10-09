import { describe, expect, it } from "vitest";
import { COMPTES, Navigateur, connecte, dernierCourriel, pause, prisma, texteVisible } from "./outils.mjs";

const MARQUEUR = 'name="description"';

describe("bouton « Signaler un bug »", () => {
  it("un visiteur envoie un signalement, avec la page et son navigateur", async () => {
    const nav = new Navigateur();
    const r = await nav.soumettre("/actualites?filtre=a-venir", MARQUEUR, {
      description: "Le filtre « à venir » ne change rien sur mon téléphone.",
      email: "visiteur@exemple.fr",
      page: "/actualites?filtre=a-venir",
      ecran: "390×844",
    });
    expect(r.message).toBe("Merci, votre signalement a bien été envoyé.");
    const s = await prisma.signalementBug.findFirst({ where: { email: "visiteur@exemple.fr" } });
    expect(s.page).toBe("/actualites?filtre=a-venir");
    expect(s.ecran).toBe("390×844");
    expect(s.navigateur).toBeTruthy();
    expect(s.statut).toBe("NOUVEAU");
  });

  it("prévient l'association par courriel", async () => {
    await pause(200);
    const c = dernierCourriel("contact@lafabriquedemenesplet.fr");
    expect(c.objet).toBe("Bug signalé sur /actualites?filtre=a-venir");
    expect(c.texte).toContain("ne change rien sur mon téléphone");
  });

  it("un membre connecté est identifié automatiquement", async () => {
    const nav = await connecte("adherent");
    await nav.soumettre("/espace", MARQUEUR, { description: "Bug signalé par un membre connecté.", page: "/espace" });
    const s = await prisma.signalementBug.findFirst({ where: { description: "Bug signalé par un membre connecté." } });
    expect(s.email).toBe(COMPTES.adherent.email);
    expect(s.membreId).toBeTruthy();
  });

  it("le jeton secret d'un lien de réinitialisation n'est jamais enregistré", async () => {
    await new Navigateur().soumettre("/", MARQUEUR, { description: "Le lien de réinitialisation ne marche pas.", page: "/reinitialiser/JETON-SECRET-123" });
    const s = await prisma.signalementBug.findFirst({ where: { description: "Le lien de réinitialisation ne marche pas." } });
    expect(s.page).toBe("/reinitialiser/[jeton]");
  });

  it("refuse une description trop courte ou un e-mail invalide", async () => {
    const nav = new Navigateur();
    expect((await nav.soumettre("/", MARQUEUR, { description: "bug" })).message).toMatch(/10 caractères/);
    expect((await nav.soumettre("/", MARQUEUR, { description: "Une description valable.", email: "pas-un-email" })).message).toMatch(/e-mail invalide/);
  });

  it("le champ piège anti-robot fait semblant d'accepter sans rien enregistrer", async () => {
    const r = await new Navigateur().soumettre("/", MARQUEUR, { description: "Signalement envoyé par un robot.", site_web: "http://spam.example" });
    expect(r.message).toMatch(/Merci/);
    expect(await prisma.signalementBug.findFirst({ where: { description: "Signalement envoyé par un robot." } })).toBeNull();
  });

  it("limite à 5 signalements par heure depuis une même adresse", async () => {
    const nav = new Navigateur();
    let r;
    for (let i = 0; i < 6; i++) r = await nav.soumettre("/", MARQUEUR, { description: `Signalement en rafale numéro ${i}` });
    expect(r.message).toMatch(/plusieurs signalements récemment/);
  });

  it("l'administration voit et traite les signalements", async () => {
    const admin = await connecte("admin");
    const { html } = await admin.page("/admin/signalements");
    expect(texteVisible(html)).toContain("ne change rien sur mon téléphone");
    const s = await prisma.signalementBug.findFirst({ where: { email: "visiteur@exemple.fr" } });
    const donnees = await admin.formulaire("/admin/signalements", `value="${s.id}"`);
    donnees.set("statut", "RESOLU");
    donnees.set("note", "Corrigé dans la version du 9 octobre.");
    await admin.envoyer("/admin/signalements", donnees);
    const apres = await prisma.signalementBug.findUnique({ where: { id: s.id } });
    expect(apres.statut).toBe("RESOLU");
    expect(apres.note).toBe("Corrigé dans la version du 9 octobre.");
    expect(texteVisible((await admin.page("/admin/signalements")).html)).not.toContain("ne change rien sur mon téléphone");
  });

  it("un adhérent ne peut pas traiter un signalement en rejouant la requête", async () => {
    const admin = await connecte("admin");
    const s = await prisma.signalementBug.findFirst({ where: { statut: "NOUVEAU" } });
    const donnees = await admin.formulaire("/admin/signalements", `value="${s.id}"`);
    donnees.set("statut", "IGNORE");
    await (await connecte("adherent")).envoyer("/admin/signalements", donnees);
    expect((await prisma.signalementBug.findUnique({ where: { id: s.id } })).statut).toBe("NOUVEAU");
  });
});
