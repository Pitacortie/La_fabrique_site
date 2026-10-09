import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { BASE, Navigateur, connecte, prisma, texteVisible } from "./outils.mjs";

// Image de test : 3000 × 2000 px, bien plus grande que la limite de 1600 px.
const image = async (format = "jpeg") =>
  sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#3B7A96" } })[format]({ quality: 95 }).toBuffer();

describe("actualités et galerie (ACT-2 à ACT-9, ADM-21)", () => {
  let bureau, page, idArticle;
  const titre = "Fête du jardin d'été";

  beforeAll(async () => {
    bureau = await connecte("bureau");
  });

  it("crée un brouillon, invisible du public (ACT-6)", async () => {
    const r = await bureau.soumettre("/admin/articles/nouveau", "Créer le brouillon", {
      titre,
      categorie: "Événement",
      dateActivite: "2030-06-20",
      extrait: "Un résumé.",
      contenu: "Premier paragraphe.\n\nDeuxième <script>alert(1)</script> paragraphe.",
      intention: "brouillon",
    });
    expect(r.status).toBe(303);
    idArticle = /articles\/([^?]+)/.exec(r.location)[1];
    page = `/admin/articles/${idArticle}`;
    expect((await new Navigateur().page("/actualites/fete-du-jardin-d-ete")).status).toBe(404);
  });

  it("refuse un article sans titre ou sans date d'activité", async () => {
    const sansTitre = await bureau.soumettre("/admin/articles/nouveau", "Créer le brouillon", { titre: "", contenu: "x", dateActivite: "2030-01-01" });
    expect(sansTitre.message).toMatch(/titre est obligatoire/);
    const sansDate = await bureau.soumettre("/admin/articles/nouveau", "Créer le brouillon", { titre: "Sans date", contenu: "x", dateActivite: "" });
    expect(sansDate.message).toMatch(/date de l'activité/);
  });

  it("refuse une photo sans texte alternatif (ACT-9)", async () => {
    const donnees = await bureau.formulaire(page, "Ajouter la photo");
    donnees.set("fichier", new File([await image()], "photo.jpg", { type: "image/jpeg" }));
    donnees.set("texteAlternatif", "x");
    expect((await bureau.envoyer(page, donnees)).message).toMatch(/texte alternatif est obligatoire/);
  });

  it("refuse un fichier qui n'est pas une image", async () => {
    const donnees = await bureau.formulaire(page, "Ajouter la photo");
    donnees.set("fichier", new File(["<html>"], "piege.html", { type: "text/html" }));
    donnees.set("texteAlternatif", "Un fichier piégé");
    expect((await bureau.envoyer(page, donnees)).message).toMatch(/JPEG, PNG ou WebP/);
  });

  it("accepte une photo et refuse de publier tant que l'accord de droit à l'image manque (ACT-8)", async () => {
    const donnees = await bureau.formulaire(page, "Ajouter la photo");
    donnees.set("fichier", new File([await image()], "photo.jpg", { type: "image/jpeg" }));
    donnees.set("texteAlternatif", "Des habitants au jardin");
    expect((await bureau.envoyer(page, donnees)).message).toBe("Photo ajoutée.");
    const publier = await bureau.soumettre(page, ">Publier<", { intention: "publier" });
    expect(publier.message).toMatch(/sans autorisation de publication/);
  });

  it("publie après confirmation de l'accord : visible sur l'accueil et dans les actualités", async () => {
    await bureau.soumettre(page, "Confirmer l&#x27;accord");
    const r = await bureau.soumettre(page, ">Publier<", { intention: "publier" });
    expect(r.message).toMatch(/Article publié/);
    const visiteur = new Navigateur();
    expect(texteVisible((await visiteur.page("/")).html)).toContain(titre);
    const article = await visiteur.page("/actualites/fete-du-jardin-d-ete");
    expect(article.status).toBe(200);
    expect(texteVisible(article.html)).toContain("Deuxième");
    expect(article.html).not.toContain("<script>alert(1)");
  });

  it("l'image est redimensionnée à 1600 px et convertie en WebP (ACT-9)", async () => {
    const { html } = await new Navigateur().page("/actualites/fete-du-jardin-d-ete");
    const url = /src="(\/medias\/[^"]+)"/.exec(html)[1];
    const r = await fetch(BASE + url);
    expect(r.headers.get("content-type")).toBe("image/webp");
    const meta = await sharp(Buffer.from(await r.arrayBuffer())).metadata();
    expect(Math.max(meta.width, meta.height)).toBe(1600);
  });

  it("le dossier des photos ne laisse pas lire d'autres fichiers du serveur", async () => {
    for (const chemin of ["/medias/..%2F.env", "/medias/..%2F..%2Fpackage.json", "/medias/articles/x/..%2F..%2F..%2F.env"]) {
      expect((await fetch(BASE + chemin)).status, chemin).toBe(404);
    }
  });

  it("une activité future est « à venir » et passe en « passée » après sa date (ACT-4)", async () => {
    expect(texteVisible((await new Navigateur().page("/actualites?filtre=a-venir")).html)).toContain(titre);
    await prisma.article.update({ where: { id: idArticle }, data: { dateActivite: new Date("2020-01-01") } });
    expect(texteVisible((await new Navigateur().page("/actualites?filtre=passees")).html)).toContain(titre);
  });

  it("le raccourci « Modifier cet article » n'apparaît que pour les personnes qui publient", async () => {
    expect((await bureau.page("/actualites/fete-du-jardin-d-ete")).html).toContain("Modifier cet article");
    expect((await (await connecte("admin")).page("/actualites/fete-du-jardin-d-ete")).html).not.toContain("Modifier cet article");
  });

  it("un administrateur non mandaté ne peut pas publier, même en rejouant la requête (ADM-18)", async () => {
    const admin = await connecte("admin");
    const donnees = await bureau.formulaire("/admin/articles/nouveau", "Créer le brouillon");
    donnees.set("titre", "Article pirate");
    donnees.set("contenu", "x");
    donnees.set("dateActivite", "2030-01-01");
    const r = await admin.envoyer("/admin/articles/nouveau", donnees);
    expect(r.location).toBe("/admin?refus=publication");
    expect(await prisma.article.findFirst({ where: { titre: "Article pirate" } })).toBeNull();
  });

  it("retirer l'article le rend invisible (ACT-6), et l'action est journalisée", async () => {
    const r = await bureau.soumettre(page, "Retirer du site", { intention: "retirer" });
    expect(r.message).toMatch(/retiré/);
    expect((await new Navigateur().page("/actualites/fete-du-jardin-d-ete")).status).toBe(404);
    const actions = (await prisma.journalAudit.findMany({ where: { cibleId: idArticle } })).map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(["article.cree", "article.publie", "article.retire"]));
  });

  it("deux articles au même titre ont des adresses différentes", async () => {
    for (let i = 0; i < 2; i++) {
      await bureau.soumettre("/admin/articles/nouveau", "Créer le brouillon", { titre: "Titre en double", contenu: "x", dateActivite: "2030-01-01", intention: "brouillon" });
    }
    const slugs = (await prisma.article.findMany({ where: { titre: "Titre en double" } })).map((a) => a.slug).sort();
    expect(slugs).toEqual(["titre-en-double", "titre-en-double-2"]);
  });
});
