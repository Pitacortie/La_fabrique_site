import { beforeAll, describe, expect, it } from "vitest";
import { Navigateur, connecte, prisma, texteVisible } from "./outils.mjs";

const BLOC = (cle) => `value="${cle}"`;

describe("édition sur place des textes (crayons ✏️)", () => {
  let admin, adherent;
  beforeAll(async () => {
    admin = await connecte("admin");
    adherent = await connecte("adherent");
  });

  it("un administrateur voit les crayons et la barre « Mode édition »", async () => {
    const { html } = await admin.page("/");
    expect(html).toContain('class="crayon"');
    expect(html).toContain("Mode édition");
  });

  it("un adhérent ne voit aucun crayon", async () => {
    expect((await adherent.page("/")).html).not.toContain('class="crayon"');
  });

  it("une modification est aussitôt visible du public, et tracée", async () => {
    const r = await admin.soumettre("/", BLOC("accueil.encart"), { contenu: "Texte de l'encart modifié par le test." });
    expect(r.status).toBe(200);
    expect(texteVisible((await new Navigateur().page("/")).html)).toContain("Texte de l'encart modifié par le test.");
    expect(await prisma.journalAudit.findFirst({ where: { action: "contenu.modifie", cibleId: "accueil.encart" } })).toBeTruthy();
    expect((await admin.page("/")).html).toContain("Modifié le");
  });

  it("« Revenir au texte d'origine » rétablit le texte par défaut", async () => {
    await admin.soumettre("/", "Revenir au texte d&#x27;origine");
    expect(texteVisible((await new Navigateur().page("/")).html)).toContain("examine chaque proposition");
  });

  it("les retours à la ligne créent des paragraphes, sans HTML interprété", async () => {
    await admin.soumettre("/presentation", BLOC("presentation.qui"), { contenu: "Premier paragraphe.\n\n<b>Second</b> paragraphe." });
    const { html } = await new Navigateur().page("/presentation");
    expect(html).toContain("&lt;b&gt;Second&lt;/b&gt; paragraphe.");
    expect(html).not.toContain("<b>Second</b>");
  });

  it("un texte vide est refusé", async () => {
    expect((await admin.soumettre("/", BLOC("accueil.intro"), { contenu: "   " })).message).toMatch(/ne peut pas être vide/);
  });

  it("les liens Facebook/Instagram n'acceptent qu'une adresse https:// (ACT-11)", async () => {
    expect((await admin.soumettre("/contact", BLOC("site.facebook"), { contenu: "javascript:alert(1)" })).message).toMatch(/https:\/\//);
    await admin.soumettre("/contact", BLOC("site.facebook"), { contenu: "https://www.facebook.com/lafabrique" });
    expect((await new Navigateur().page("/")).html).toContain('href="https://www.facebook.com/lafabrique"');
  });

  it("le téléphone modifié apparaît sur la page Contacts", async () => {
    await admin.soumettre("/contact", BLOC("site.telephone"), { contenu: "05 53 12 34 56" });
    expect(texteVisible((await new Navigateur().page("/contact")).html)).toContain("05 53 12 34 56");
  });

  it("un adhérent qui rejoue la requête d'un administrateur est refusé", async () => {
    const donnees = await admin.formulaire("/", BLOC("accueil.intro"));
    donnees.set("contenu", "PIRATAGE");
    const r = await adherent.envoyer("/", donnees);
    expect(r.status).toBe(303);
    expect(texteVisible((await new Navigateur().page("/")).html)).not.toContain("PIRATAGE");
  });

  it("un visiteur qui rejoue la requête est renvoyé vers la connexion", async () => {
    const donnees = await admin.formulaire("/", BLOC("accueil.intro"));
    donnees.set("contenu", "PIRATAGE");
    const r = await new Navigateur().envoyer("/", donnees);
    expect(r.location).toMatch(/^\/connexion/);
  });

  it("une clé de bloc inventée est refusée", async () => {
    const r = await admin.soumettre("/", BLOC("accueil.intro"), { cle: "bloc.invente", contenu: "x" });
    expect(r.message).toBe("Bloc inconnu.");
  });
});

describe("« Nos Fabrications » modifiables depuis l'accueil", () => {
  let admin;
  beforeAll(async () => {
    admin = await connecte("admin");
  });
  const AJOUT = "Ajouter le service";

  it("ajoute un service visible sur l'accueil et dans l'espace adhérent", async () => {
    const r = await admin.soumettre("/", AJOUT, { nom: "Atelier vélo", description: "Réparer son vélo ensemble.", etat: "Ouvert", visible: "on" });
    expect(r.message ?? "").not.toMatch(/obligatoire|doit/);
    expect(texteVisible((await new Navigateur().page("/")).html)).toContain("Atelier vélo");
    expect(texteVisible((await (await connecte("adherent")).page("/espace/fabrications")).html)).toContain("Atelier vélo");
  });

  it("refuse un lien javascript:", async () => {
    const r = await admin.soumettre("/", AJOUT, { nom: "Piège", description: "x", etat: "Ouvert", lien: "javascript:alert(1)" });
    expect(r.message).toMatch(/commencer par \/ ou https/);
  });

  it("un service masqué disparaît pour le public mais reste visible (grisé) pour l'admin", async () => {
    const f = await prisma.fabrication.findFirst({ where: { nom: "Atelier vélo" } });
    await admin.soumettre("/", `value="${f.id}"`, { visible: null });
    expect(texteVisible((await new Navigateur().page("/")).html)).not.toContain("Atelier vélo");
    expect((await admin.page("/")).html).toContain("Masqué : invisible au public");
  });

  it("supprime un service", async () => {
    const f = await prisma.fabrication.findFirst({ where: { nom: "Atelier vélo" } });
    const donnees = await admin.formulaire("/", "Supprimer ce service");
    donnees.set("id", f.id);
    await admin.envoyer("/", donnees);
    expect(await prisma.fabrication.findUnique({ where: { id: f.id } })).toBeNull();
  });
});
