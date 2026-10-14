import { beforeAll, describe, expect, it } from "vitest";
import { BASE, Navigateur, connecte, prisma, texteVisible } from "./outils.mjs";

const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");

describe("Agenda (P10, AGE-1 à AGE-5, ADM-22)", () => {
  let admin;
  const visiteur = new Navigateur();
  beforeAll(async () => {
    admin = await connecte("admin");
  });
  const ajouter = (champs) =>
    admin.soumettre("/admin/agenda", 'name="lieu"', { titre: "Auberge espagnole", jour: "2030-11-14", heure: "19:00", heureFin: "22:30", lieu: "Lieu Laser", description: "Chacun apporte un plat.", ...champs });

  it("la page publique est accessible à tous et sans inscription en ligne", async () => {
    const { status, html } = await visiteur.page("/agenda");
    expect(status).toBe(200);
    expect(texteVisible(html)).toContain("sans inscription en ligne");
  });

  it("refuse un événement sans lieu, ou qui finit avant de commencer", async () => {
    expect((await ajouter({ lieu: "" })).message).toBe("Indiquez le lieu.");
    expect((await ajouter({ heureFin: "18:00" })).message).toBe("L'heure de fin doit être après l'heure de début.");
  });

  it("un administrateur ajoute un événement : il apparaît dans la liste, à l'heure de Ménesplet", async () => {
    expect((await ajouter({})).location).toBe("/admin/agenda?cree=1");
    const e = await prisma.evenement.findFirst({ where: { titre: "Auberge espagnole" } });
    expect(e.debut.toISOString()).toBe("2030-11-14T18:00:00.000Z");
    const texte = texteVisible((await visiteur.page("/agenda")).html);
    expect(texte).toContain("Auberge espagnole");
    expect(texte).toContain("Lieu Laser");
    expect(texte).toContain("19:00");
    expect(await prisma.journalAudit.findFirst({ where: { action: "agenda.cree", cibleId: e.id } })).toBeTruthy();
  });

  it("la vue calendrier du mois montre l'événement à sa date", async () => {
    const { html } = await visiteur.page("/agenda?vue=mois&mois=2030-11");
    expect(texteVisible(html)).toContain("novembre 2030");
    const pastille = /class="agenda-pastille"[^>]*>([\s\S]*?)<\/a>/.exec(html);
    expect(texteVisible(pastille[1]).trim()).toBe("19:00 Auberge espagnole");
    expect(texteVisible((await visiteur.page("/agenda?vue=mois&mois=2030-12")).html)).toContain("Aucun événement ce mois-ci");
  });

  it("un événement passé ne figure plus dans la liste", async () => {
    await prisma.evenement.create({ data: { titre: "Réunion d'hier", debut: new Date(Date.now() - 3 * 86_400_000), lieu: "Mairie" } });
    expect(texteVisible((await visiteur.page("/agenda")).html)).not.toContain("Réunion d'hier");
  });

  it("un adhérent ne peut pas modifier l'agenda", async () => {
    expect((await (await connecte("adherent")).page("/admin/agenda")).location).toBe("/espace");
  });
});

describe("La gazette de la Fabrique (P11, GAZ-1 à GAZ-5, ADM-23)", () => {
  let admin;
  const visiteur = new Navigateur();
  beforeAll(async () => {
    admin = await connecte("admin");
  });
  async function publier(champs, contenu = PDF) {
    const donnees = await admin.formulaire("/admin/gazette", 'name="parution"');
    for (const [k, v] of Object.entries({ titre: "La gazette d'automne", numero: "1", parution: "2026-10-01", resume: "Au sommaire : le SEL.", ...champs })) donnees.set(k, v);
    donnees.set("fichier", new File([contenu], "gazette.pdf", { type: "application/pdf" }));
    return admin.envoyer("/admin/gazette", donnees);
  }

  it("refuse un fichier qui n'est pas un vrai PDF", async () => {
    expect((await publier({}, Buffer.from("<html>piège</html>"))).message).toBe("Le fichier n'est pas un PDF valide.");
  });

  it("publie des numéros : le plus récent en tête, les autres dans les archives", async () => {
    expect((await publier({})).message).toBe("Numéro publié.");
    expect((await publier({ titre: "La gazette d'hiver", numero: "2", parution: "2027-01-15" })).message).toBe("Numéro publié.");
    const texte = texteVisible((await visiteur.page("/gazette")).html);
    expect(texte.indexOf("La gazette d'hiver")).toBeLessThan(texte.indexOf("La gazette d'automne"));
    expect(texte).toContain("Archives");
    expect(texte).toContain("Dernier numéro · n° 2");
  });

  it("le PDF est servi en tant que PDF", async () => {
    const n = await prisma.numeroGazette.findFirst({ where: { titre: "La gazette d'automne" } });
    const r = await fetch(`${BASE}${n.fichier}`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("application/pdf");
  });

  it("un numéro retiré disparaît de la page publique", async () => {
    const n = await prisma.numeroGazette.findFirst({ where: { titre: "La gazette d'automne" } });
    await admin.soumettre("/admin/gazette", `value="${n.id}"`);
    expect((await prisma.numeroGazette.findUnique({ where: { id: n.id } })).publie).toBe(false);
    expect(texteVisible((await visiteur.page("/gazette")).html)).not.toContain("La gazette d'automne");
  });
});
