import { describe, expect, it } from "vitest";
import { COMPTES, Navigateur, courriels, pause, prisma, texteVisible } from "./outils.mjs";

const signalerBug = (description) =>
  new Navigateur().soumettre("/", 'name="description"', { description, email: "", page: "/", ecran: "390×844" });
const recus = (a, motif) => courriels().filter((c) => c.a === a && c.texte.includes(motif));

describe("alertes par e-mail (console)", () => {
  it("la page est réservée aux administrateurs", async () => {
    const adherent = await new Navigateur().connexion(COMPTES.adherent);
    expect((await adherent.page("/admin/alertes")).status).not.toBe(200);
  });

  it("chaque administrateur peut recevoir toutes les alertes", async () => {
    const bureau = await new Navigateur().connexion(COMPTES.bureau);
    const { html } = await bureau.page("/admin/alertes");
    const admin = await prisma.membre.findUnique({ where: { email: COMPTES.admin.email } });
    const formulaire = [...html.matchAll(/<form[\s\S]*?<\/form>/g)].map((m) => m[0]).find((f) => f.includes(`value="${admin.id}"`));
    expect(formulaire).toContain('name="BUG"');
    expect(formulaire).toContain('name="ADHESION"');
    expect(texteVisible(html)).toContain("Alertes par e-mail");
  });

  it("aucune alerte par défaut, puis activation et désactivation d'une alerte", async () => {
    const admin = await prisma.membre.findUnique({ where: { email: COMPTES.admin.email } });
    expect(admin.alertes).toEqual([]);

    await signalerBug("Premier bug, personne n'a activé l'alerte côté administrateur.");
    await pause(200);
    expect(recus(admin.email, "Premier bug")).toHaveLength(0);

    const bureau = await new Navigateur().connexion(COMPTES.bureau);
    const marqueur = `value="${admin.id}"`;
    const r = await bureau.soumettre("/admin/alertes", marqueur, { BUG: "on", INCONNUE: "on" });
    expect(r.location).toContain(`enregistre=${admin.id}`);
    // Une alerte inconnue est ignorée
    expect((await prisma.membre.findUnique({ where: { id: admin.id } })).alertes).toEqual(["BUG"]);
    expect(await prisma.journalAudit.count({ where: { action: "membre.alertes", cibleId: admin.id } })).toBeGreaterThan(0);

    await signalerBug("Deuxième bug, l'alerte est maintenant active.");
    await pause(200);
    expect(recus(admin.email, "Deuxième bug")).toHaveLength(1);

    await bureau.soumettre("/admin/alertes", marqueur, { BUG: null });
    expect((await prisma.membre.findUnique({ where: { id: admin.id } })).alertes).toEqual([]);
    await signalerBug("Troisième bug, alerte de nouveau coupée.");
    await pause(200);
    expect(recus(admin.email, "Troisième bug")).toHaveLength(0);
  });
});
