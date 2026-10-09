import { afterAll, describe, expect, it } from "vitest";
import { COMPTES, Navigateur, courriels, dernierCourriel, lienDuCourriel, pause, prisma, texteVisible } from "./outils.mjs";

describe("changer d'adresse e-mail", () => {
  const compte = COMPTES.changementEmail;
  const NOUVELLE = "nouvelle-adresse@exemple.fr";
  const demander = (nav, champs) => nav.soumettre("/espace/email", 'name="nouvelEmail"', champs);

  it("refuse un mauvais mot de passe ou l'adresse actuelle", async () => {
    const nav = await new Navigateur().connexion(compte);
    expect((await demander(nav, { nouvelEmail: NOUVELLE, motDePasse: "faux" })).message).toBe("Mot de passe incorrect.");
    expect((await demander(nav, { nouvelEmail: compte.email, motDePasse: compte.motDePasse })).message).toMatch(/déjà l'adresse/);
  });

  it("l'adresse d'un autre compte : même réponse, aucun courriel envoyé (on ne révèle pas qui est inscrit)", async () => {
    const nav = await new Navigateur().connexion(compte);
    const r = await demander(nav, { nouvelEmail: COMPTES.adherent.email, motDePasse: compte.motDePasse });
    expect(r.message).toMatch(/Un e-mail de confirmation vient d'être envoyé/);
    await pause(200);
    expect(courriels().some((c) => c.a === COMPTES.adherent.email && c.objet.includes("Confirmez"))).toBe(false);
  });

  it("le lien est envoyé à la nouvelle adresse ; la simple visite du lien ne change rien", async () => {
    const nav = await new Navigateur().connexion(compte);
    await demander(nav, { nouvelEmail: NOUVELLE, motDePasse: compte.motDePasse });
    await pause(200);
    expect(dernierCourriel(NOUVELLE).objet).toBe("Confirmez votre nouvelle adresse e-mail");
    const lien = lienDuCourriel(NOUVELLE, "/confirmer-email/");
    expect(texteVisible((await new Navigateur().page(lien)).html)).toContain(`confirmez-vous l'utilisation de ${NOUVELLE}`);
    expect((await prisma.membre.findFirst({ where: { email: compte.email } }))).toBeTruthy();
  });

  it("la confirmation change l'adresse, prévient l'ancienne et ferme les autres sessions", async () => {
    const ici = await new Navigateur().connexion(compte);
    const ailleurs = await new Navigateur().connexion(compte);
    const lien = lienDuCourriel(NOUVELLE, "/confirmer-email/");
    const r = await ici.soumettre(lien, 'name="jeton"');
    expect(r.location).toBe("/espace?email=modifie");
    expect(await prisma.membre.findUnique({ where: { email: NOUVELLE } })).toBeTruthy();
    expect((await ici.page("/espace")).status).toBe(200);
    expect((await ailleurs.page("/espace")).status).toBe(307);

    await pause(200);
    expect(dernierCourriel(compte.email).objet).toBe("L'adresse e-mail de votre compte a changé");
    await expect(new Navigateur().connexion(compte)).rejects.toThrow();
    await new Navigateur().connexion({ ...compte, email: NOUVELLE });
    expect((await new Navigateur().page(lien)).html).toContain("plus valable");
  });
});

describe("nouvelle version d'un texte : acceptation redemandée (section 6.7)", () => {
  const compte = COMPTES.reconsentement;
  let nouvelle;

  afterAll(async () => {
    if (!nouvelle) return;
    await prisma.acceptation.deleteMany({ where: { texteId: nouvelle.id } });
    await prisma.texteJuridique.delete({ where: { id: nouvelle.id } });
  });

  it("après la publication d'une nouvelle version, l'espace demande d'abord de l'accepter", async () => {
    nouvelle = await prisma.texteJuridique.create({
      data: {
        type: "REGLEMENT_INTERIEUR",
        titre: "Règlement intérieur de La Fabrique",
        version: "test-reconsentement",
        enVigueurLe: new Date(Date.now() - 60_000),
        contenu: "Nouvelle version du règlement intérieur, article 16 ajouté pour le test.",
      },
    });
    const nav = await new Navigateur().connexion(compte);
    const page = texteVisible((await nav.page("/espace")).html);
    expect(page).toContain("Nouvelle version d'un de nos textes");
    expect(page).toContain("article 16 ajouté pour le test");
    // (Next.js glisse dans la page des données non affichées : on vérifie le titre réellement rendu)
    expect((await nav.page("/espace")).html).not.toContain("<h2>Mes informations</h2>");
  });

  it("sans cocher la case, rien n'est enregistré ; en la cochant, l'espace s'ouvre", async () => {
    const nav = await new Navigateur().connexion(compte);
    const sansCase = await nav.soumettre("/espace", "Accepter et continuer", { [`accepte-${nouvelle.id}`]: null });
    expect(sansCase.message).toMatch(/Cochez chaque case/);
    await nav.soumettre("/espace", "Accepter et continuer", { [`accepte-${nouvelle.id}`]: "on" });
    expect((await nav.page("/espace")).html).toContain("<h2>Mes informations</h2>");
    const membre = await prisma.membre.findUnique({ where: { email: compte.email } });
    expect(await prisma.acceptation.findFirst({ where: { membreId: membre.id, texteId: nouvelle.id } })).toBeTruthy();
  });

  it("l'acceptation apparaît dans « Mes textes acceptés »", async () => {
    const nav = await new Navigateur().connexion(compte);
    expect(texteVisible((await nav.page("/espace/textes")).html)).toContain("test-reconsentement");
  });
});
