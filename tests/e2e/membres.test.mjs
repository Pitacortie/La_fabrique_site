import { describe, expect, it } from "vitest";
import { COMPTES, Navigateur, prisma, texteVisible } from "./outils.mjs";

let compteur = 0;
async function nouveauMembre(extra = {}) {
  const n = ++compteur;
  return prisma.membre.create({
    data: {
      email: `a-supprimer-${n}@test.local`,
      nom: `Supprimable${n}`,
      prenom: "Test",
      telephone: "05 53 00 00 00",
      statut: "ACTIF",
      alias: { create: { code: `FAB-SUP${n}`, soldeBriques: extra.solde ?? 0 } },
    },
    include: { alias: true },
  });
}
const fiche = (m) => `/admin/membres/${m.id}`;
const supprimer = (nav, m, confirmation = m.email) =>
  nav.soumettre(fiche(m), 'name="confirmation"', { confirmation });

describe("gestion des membres (console)", () => {
  // Une seule connexion du Bureau pour tout le fichier (limite de connexions par compte)
  let bureauNav;
  const bureau = async () => (bureauNav ??= await new Navigateur().connexion(COMPTES.bureau));

  it("liste et recherche les membres", async () => {
    const nav = await new Navigateur().connexion(COMPTES.admin);
    const m = await nouveauMembre();
    const liste = texteVisible((await nav.page(`/admin/membres?q=${m.nom}`)).html);
    expect(liste).toContain(m.email);
    expect(liste).not.toContain(COMPTES.adherent.email);
  });

  it("un adhérent n'accède pas à la liste", async () => {
    const nav = await new Navigateur().connexion(COMPTES.adherent);
    expect((await nav.page("/admin/membres")).status).not.toBe(200);
  });

  it("la consultation d'une fiche est journalisée ; un administrateur non Bureau ne peut pas supprimer", async () => {
    const nav = await new Navigateur().connexion(COMPTES.admin);
    const m = await nouveauMembre();
    const { html } = await nav.page(fiche(m));
    expect(html).not.toContain('name="confirmation"');
    expect(await prisma.journalAudit.count({ where: { action: "membre.consulte", cibleId: m.id } })).toBe(1);
  });

  it("refuse la suppression si l'e-mail recopié ne correspond pas", async () => {
    const nav = await bureau();
    const m = await nouveauMembre();
    expect((await supprimer(nav, m, "autre@test.local")).message).toMatch(/recopiez exactement/);
    expect(await prisma.membre.findUnique({ where: { id: m.id } })).not.toBeNull();
  });

  it("supprime complètement un membre sans historique", async () => {
    const nav = await bureau();
    const m = await nouveauMembre();
    const r = await supprimer(nav, m);
    expect(r.location).toContain("supprime=suppression");
    expect(await prisma.membre.findUnique({ where: { id: m.id } })).toBeNull();
    expect(await prisma.alias.findUnique({ where: { code: m.alias.code } })).toBeNull();
    expect(await prisma.journalAudit.count({ where: { action: "membre.supprime", cibleId: m.id } })).toBe(1);
  });

  it("anonymise un membre qui a échangé, sans toucher à l'historique de l'autre", async () => {
    const nav = await bureau();
    const m = await nouveauMembre({ solde: 30 });
    const autre = await nouveauMembre({ solde: -30 });
    await prisma.transactionBriques.create({ data: { montant: 30, debiteId: autre.alias.id, crediteId: m.alias.id, libelle: "Service" } });
    const r = await supprimer(nav, m);
    expect(r.location).toContain("supprime=anonymisation");

    const apres = await prisma.membre.findUnique({ where: { id: m.id }, include: { alias: true } });
    expect(apres).toMatchObject({ statut: "CLOTURE", nom: "Membre supprimé", telephone: null, motDePasseHash: null });
    expect(apres.email).not.toBe(m.email);
    expect(apres.alias.soldeBriques).toBe(0);
    // L'échange reste dans l'historique de l'autre membre ; le solde est versé au compte de solidarité
    expect(await prisma.transactionBriques.count({ where: { crediteId: m.alias.id, debiteId: autre.alias.id } })).toBe(1);
    expect(await prisma.transactionBriques.count({ where: { debiteId: m.alias.id, crediteId: null, montant: 30 } })).toBe(1);
  });

  it("le Bureau ne peut pas se supprimer lui-même", async () => {
    const nav = await bureau();
    const moi = await prisma.membre.findUnique({ where: { email: COMPTES.bureau.email } });
    // Le formulaire n'est pas affiché sur sa propre fiche
    expect((await nav.page(fiche(moi))).html).not.toContain('name="confirmation"');
    expect(await prisma.membre.findUnique({ where: { id: moi.id } })).not.toBeNull();
  });

  it("suspend puis réactive un compte : la personne est déconnectée", async () => {
    const nav = await bureau();
    const m = await nouveauMembre();
    await prisma.membre.update({ where: { id: m.id }, data: { motDePasseHash: (await prisma.membre.findUnique({ where: { email: COMPTES.adherent.email } })).motDePasseHash } });
    const membre = await new Navigateur().connexion({ email: m.email, motDePasse: COMPTES.adherent.motDePasse });
    expect((await nav.soumettre(fiche(m), 'value="suspendre"', { action: "suspendre", motif: "Test" })).message).toMatch(/Compte suspendu/);
    expect((await prisma.membre.findUnique({ where: { id: m.id } })).statut).toBe("SUSPENDU");
    expect((await membre.page("/espace")).status).not.toBe(200);
    expect((await nav.soumettre(fiche(m), 'value="reactiver"', { action: "reactiver" })).message).toBe("Compte réactivé.");
    expect((await prisma.membre.findUnique({ where: { id: m.id } })).statut).toBe("ACTIF");
  });
});
