import { describe, expect, it } from "vitest";
import { COMPTES, Navigateur, courriels, dernierCourriel, pause, prisma } from "./outils.mjs";

describe("changer son mot de passe depuis l'espace adhérent", () => {
  const compte = COMPTES.motdepasse;
  const changer = (nav, actuel, nouveau, confirmation = nouveau) =>
    nav.soumettre("/espace/mot-de-passe", 'name="confirmation"', { actuel, nouveau, confirmation });

  it("refuse les saisies invalides avec un message clair", async () => {
    const nav = await new Navigateur().connexion(compte);
    expect((await changer(nav, "faux", "un nouveau mot de passe")).message).toBe("Mot de passe actuel incorrect.");
    expect((await changer(nav, compte.motDePasse, "court")).message).toMatch(/au moins 10 caractères/);
    expect((await changer(nav, compte.motDePasse, "un nouveau mot de passe", "autre chose encore")).message).toMatch(/ne correspondent pas/);
    expect((await changer(nav, compte.motDePasse, compte.motDePasse)).message).toMatch(/différent de l'actuel/);
    expect((await changer(nav, compte.motDePasse, "motdepasse-et-autre-chose")).message).toMatch(/adresse e-mail/);
  });

  it("change le mot de passe, garde la session en cours et ferme les autres", async () => {
    const ici = await new Navigateur().connexion(compte);
    const ailleurs = await new Navigateur().connexion(compte);
    const nouveau = "la riviere Isle sous le pont";

    const r = await changer(ici, compte.motDePasse, nouveau);
    expect(r.message).toMatch(/Mot de passe changé/);
    expect((await ici.page("/espace")).status).toBe(200);
    expect((await ailleurs.page("/espace")).status).toBe(307);

    await expect(new Navigateur().connexion(compte)).rejects.toThrow();
    await new Navigateur().connexion({ ...compte, motDePasse: nouveau });

    await pause(200);
    expect(dernierCourriel(compte.email)?.objet).toBe("Votre mot de passe a été modifié");
    const journal = await prisma.journalAudit.findFirst({ where: { action: "membre.mot_de_passe_change" } });
    expect(journal).toBeTruthy();
    compte.motDePasse = nouveau;
  });
});

describe("mot de passe oublié (CON-3)", () => {
  const compte = COMPTES.oubli;
  const demander = (email) => new Navigateur().soumettre("/mot-de-passe-oublie", 'name="email"', { email });

  it("la réponse est identique que l'adresse ait un compte ou non", async () => {
    const connu = await demander(COMPTES.adherent.email);
    const inconnu = await demander("personne@nulle-part.example");
    expect(connu.message).toBe(inconnu.message);
    expect(connu.message).toMatch(/Si un compte correspond/);
    await pause(200);
    expect(courriels().some((c) => c.a === "personne@nulle-part.example")).toBe(false);
  });

  it("aucun courriel n'est envoyé à un compte suspendu", async () => {
    await demander(COMPTES.suspendu.email);
    await pause(200);
    expect(courriels().some((c) => c.a === COMPTES.suspendu.email)).toBe(false);
  });

  it("parcours complet : courriel, lien, nouveau mot de passe, lien à usage unique", async () => {
    const session = await new Navigateur().connexion(compte);
    await demander(compte.email);
    await pause(200);
    const courriel = dernierCourriel(compte.email);
    expect(courriel.objet).toBe("Réinitialisation de votre mot de passe");
    const lien = /\/reinitialiser\/[A-Za-z0-9_-]+/.exec(courriel.texte)[0];

    const nav = new Navigateur();
    expect((await nav.page(lien)).html).toContain("choisissez votre nouveau mot de passe");
    expect((await nav.soumettre(lien, 'name="jeton"', { nouveau: "court", confirmation: "court" })).message).toMatch(/10 caractères/);

    const nouveau = "un mot de passe tout neuf";
    const r = await nav.soumettre(lien, 'name="jeton"', { nouveau, confirmation: nouveau });
    expect(r.location).toBe("/connexion?reinitialise=1");

    expect((await session.page("/espace")).status).toBe(307); // toutes les sessions sont fermées
    expect((await nav.page(lien)).html).toContain("plus valable"); // lien déjà utilisé
    await new Navigateur().connexion({ ...compte, motDePasse: nouveau });
    await pause(200);
    expect(dernierCourriel(compte.email).objet).toBe("Votre mot de passe a été modifié");
    compte.motDePasse = nouveau;
  });

  it("une nouvelle demande annule le lien précédent", async () => {
    await demander(compte.email);
    await pause(200);
    const premier = /\/reinitialiser\/[A-Za-z0-9_-]+/.exec(dernierCourriel(compte.email).texte)[0];
    await demander(compte.email);
    await pause(200);
    const second = /\/reinitialiser\/[A-Za-z0-9_-]+/.exec(dernierCourriel(compte.email).texte)[0];
    expect(second).not.toBe(premier);
    expect((await new Navigateur().page(premier)).html).toContain("plus valable");
    expect((await new Navigateur().page(second)).html).toContain("choisissez votre nouveau mot de passe");
  });

  it("un lien expiré est refusé", async () => {
    await prisma.jeton.updateMany({ where: { utiliseLe: null }, data: { expireLe: new Date(Date.now() - 1000) } });
    const lien = /\/reinitialiser\/[A-Za-z0-9_-]+/.exec(dernierCourriel(compte.email).texte)[0];
    expect((await new Navigateur().page(lien)).html).toContain("plus valable");
  });

  it("un faux lien est refusé", async () => {
    expect((await new Navigateur().page("/reinitialiser/nimportequoi")).html).toContain("plus valable");
  });

  it("le jeton n'est jamais stocké en clair en base", async () => {
    const lien = /\/reinitialiser\/([A-Za-z0-9_-]+)/.exec(dernierCourriel(compte.email).texte)[1];
    expect(await prisma.jeton.findFirst({ where: { tokenHash: lien } })).toBeNull();
  });
});
