import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { COMPTES, Navigateur, accepterTextesEnVigueur, connecte, prisma, texteVisible } from "./outils.mjs";

describe("statuts, règlement, charte : versions (ADM-11, PRE-5)", () => {
  let bureau;
  const NOUVELLE = "Publier cette version";
  beforeAll(async () => {
    bureau = await connecte("bureau");
  });
  afterAll(async () => {
    // Retire les versions créées ici, pour ne pas imposer de nouvelle acceptation aux autres fichiers de test
    const crees = await prisma.texteJuridique.findMany({ where: { type: "CHARTE_NEUTRALITE", version: { in: ["2", "3"] } } });
    await prisma.acceptation.deleteMany({ where: { texteId: { in: crees.map((t) => t.id) } } });
    await prisma.texteJuridique.deleteMany({ where: { id: { in: crees.map((t) => t.id) } } });
  });

  it("une nouvelle version devient la version en vigueur, sur « Nos textes » et dans le bulletin", async () => {
    const r = await bureau.soumettre("/admin/textes", NOUVELLE, {
      type: "CHARTE_NEUTRALITE",
      version: "2",
      enVigueurLe: "2026-10-01",
      titre: "Charte de neutralité et de participation",
      contenu: "Texte intégral de la charte, version 2, principe 1 : neutralité et indépendance.",
    });
    expect(r.message).toBe("Version 2 publiée.");
    for (const c of ["bureau", "admin", "adherent"]) await accepterTextesEnVigueur(COMPTES[c].email);
    expect(texteVisible((await new Navigateur().page("/documents")).html)).toContain("version 2");
    expect(texteVisible((await new Navigateur().page("/adherer")).html)).toContain("Texte intégral de la charte, version 2");
  });

  it("une version datée dans le futur n'est pas encore en vigueur", async () => {
    await bureau.soumettre("/admin/textes", NOUVELLE, {
      type: "CHARTE_NEUTRALITE",
      version: "3",
      enVigueurLe: "2099-01-01",
      titre: "Charte de neutralité et de participation",
      contenu: "Version future de la charte, pas encore applicable.",
    });
    const documents = texteVisible((await new Navigateur().page("/documents")).html);
    expect(documents).toContain("version 2");
    expect(documents).not.toContain("version 3");
  });

  it("refuse un numéro de version déjà utilisé", async () => {
    const r = await bureau.soumettre("/admin/textes", NOUVELLE, {
      type: "CHARTE_NEUTRALITE",
      version: "2",
      enVigueurLe: "2026-10-02",
      titre: "Doublon",
      contenu: "Un texte assez long pour être accepté par le formulaire.",
    });
    expect(r.message).toMatch(/existe déjà/);
  });

  it("refuse un texte trop court", async () => {
    const r = await bureau.soumettre("/admin/textes", NOUVELLE, { type: "STATUTS", version: "9", enVigueurLe: "2026-10-01", titre: "Statuts", contenu: "court" });
    expect(r.message).toMatch(/texte complet/);
  });

  it("un administrateur qui n'est pas au Bureau ne peut pas publier, même en rejouant la requête", async () => {
    const admin = await connecte("admin");
    const donnees = await bureau.formulaire("/admin/textes", NOUVELLE);
    for (const [k, v] of Object.entries({ type: "STATUTS", version: "pirate", enVigueurLe: "2026-10-01", titre: "Statuts pirates", contenu: "Ce texte ne doit jamais être enregistré en base." })) {
      donnees.set(k, v);
    }
    // Le serveur refuse ; le message n'a pas où s'afficher (ce formulaire n'existe pas sur sa page) : on vérifie la base.
    await admin.envoyer("/admin/textes", donnees);
    expect(await prisma.texteJuridique.findFirst({ where: { version: "pirate" } })).toBeNull();
  });

  it("une version déjà acceptée par un membre ne peut plus être corrigée", async () => {
    const statuts = await prisma.texteJuridique.findFirst({ where: { type: "STATUTS" } });
    const membre = await prisma.membre.findFirst({ where: { email: "adherent@test.local" } });
    await prisma.acceptation.create({ data: { texteId: statuts.id, membreId: membre.id } });
    // Chaque version est un bloc <details> ; celui des statuts ne doit plus proposer de correction.
    const { html } = await bureau.page("/admin/textes");
    const bloc = html.split("<details").find((d) => d.includes(statuts.contenu.slice(0, 30)));
    expect(bloc).toBeTruthy();
    expect(bloc).not.toContain("Enregistrer la correction");

    // Et la correction est refusée côté serveur, même en rejouant le formulaire d'une version corrigeable
    const charte = await prisma.texteJuridique.findFirst({ where: { type: "CHARTE_NEUTRALITE", version: "3" } });
    const donnees = await bureau.formulaire("/admin/textes", `value="${charte.id}"`);
    donnees.set("id", statuts.id);
    donnees.set("contenu", "Tentative de réécriture de statuts déjà acceptés par un membre.");
    expect((await bureau.envoyer("/admin/textes", donnees)).message).toMatch(/déjà été acceptée/);
  });
});
