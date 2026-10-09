import { describe, expect, it } from "vitest";
import { COMPTES, Navigateur, prisma, texteVisible } from "./outils.mjs";

describe("modifier ses coordonnées (espace adhérent)", () => {
  const valides = { telephone: "05 53 00 00 00", adresse: "8 rue du Pont", codePostal: "24700", commune: "Ménesplet", droitImage: "non" };
  const envoyer = (nav, champs) => nav.soumettre("/espace/coordonnees", 'name="commune"', { ...valides, ...champs });

  it.each([
    [{ codePostal: "247" }, /5 chiffres/],
    [{ telephone: "abc" }, /téléphone invalide/],
    [{ adresse: "" }, /adresse est obligatoire/],
    [{ droitImage: "peut-etre" }, /droit à l'image/],
  ])("refuse %j", async (champs, message) => {
    const nav = await new Navigateur().connexion(COMPTES.coordonnees);
    expect((await envoyer(nav, champs)).message).toMatch(message);
  });

  it("enregistre les coordonnées et les affiche sur le profil", async () => {
    const nav = await new Navigateur().connexion(COMPTES.coordonnees);
    expect((await envoyer(nav, {})).message).toBe("Vos coordonnées ont été enregistrées.");
    const profil = texteVisible((await nav.page("/espace")).html);
    expect(profil).toContain("8 rue du Pont, 24700 Ménesplet");
    expect(profil).toContain("Je n'autorise pas l'utilisation de mon image");
  });

  it("le changement de droit à l'image est tracé dans le journal (ADH-17)", async () => {
    const nav = await new Navigateur().connexion(COMPTES.coordonnees);
    await envoyer(nav, { droitImage: "oui" });
    await envoyer(nav, { droitImage: "non" });
    const membre = await prisma.membre.findUnique({ where: { email: COMPTES.coordonnees.email } });
    expect(membre.droitImage).toBe(false);
    const entrees = await prisma.journalAudit.findMany({ where: { cibleId: membre.id, action: { startsWith: "membre.droit_image" } } });
    expect(entrees.map((e) => e.action).sort()).toEqual(["membre.droit_image_accorde", "membre.droit_image_retire"]);
  });

  it("le nom et l'e-mail ne peuvent pas être modifiés par ce formulaire", async () => {
    const nav = await new Navigateur().connexion(COMPTES.coordonnees);
    await envoyer(nav, { nom: "Pirate", email: "pirate@exemple.fr" });
    const membre = await prisma.membre.findUnique({ where: { email: COMPTES.coordonnees.email } });
    expect(membre.nom).toBe("Test");
  });
});
