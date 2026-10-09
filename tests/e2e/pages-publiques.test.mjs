import { describe, expect, it } from "vitest";
import { BASE, Navigateur, texteVisible } from "./outils.mjs";

const PAGES = [
  ["/", "La Fabrique de Ménesplet"],
  ["/presentation", "Qui sommes-nous"],
  ["/documents", "Nos textes"],
  ["/actualites", "Actualités et galerie"],
  ["/le-sel", "Le SEL"],
  ["/contact", "Contacts"],
  ["/adherer", "Bulletin d'adhésion"],
  ["/connexion", "Connexion"],
  ["/mot-de-passe-oublie", "Mot de passe oublié"],
  ["/mentions-legales", "Mentions légales"],
  ["/confidentialite", "Données personnelles"],
];

describe("pages publiques", () => {
  const visiteur = new Navigateur();

  it.each(PAGES)("%s s'affiche (HTTP 200) avec son titre", async (chemin, titre) => {
    const { status, html } = await visiteur.page(chemin);
    expect(status).toBe(200);
    expect(texteVisible(html)).toContain(titre);
  });

  it("une page inexistante renvoie 404", async () => {
    expect((await visiteur.page("/cette-page-n-existe-pas")).status).toBe(404);
    expect((await visiteur.page("/actualites/article-inconnu")).status).toBe(404);
  });

  it("la sonde de santé indique que la base répond", async () => {
    expect(await (await fetch(`${BASE}/api/health`)).json()).toEqual({ statut: "ok", db: "ok" });
  });

  it("un visiteur ne voit ni crayon d'édition ni barre d'édition", async () => {
    for (const chemin of ["/", "/presentation", "/sel", "/contact"]) {
      const { html } = await visiteur.page(chemin);
      expect(html, chemin).not.toContain('class="crayon"');
      expect(html, chemin).not.toContain("Mode édition");
    }
  });

  it("le bouton « Signaler un bug » est présent", async () => {
    expect((await visiteur.page("/")).html).toContain("Signaler un bug");
  });

  it("les polices sont servies par le site, sans appel à Google Fonts (section 11.3)", async () => {
    expect((await visiteur.page("/")).html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it("les en-têtes de sécurité sont présents", async () => {
    const r = await fetch(BASE + "/");
    expect(r.headers.get("x-frame-options")).toBe("DENY");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("x-powered-by")).toBeNull();
  });

  it("le pied de page affiche le siège social (CTC-6)", async () => {
    expect(texteVisible((await visiteur.page("/")).html)).toContain("12 rue Simone Veil");
  });

  it("aucun lien vers un réseau social non renseigné (ACT-11)", async () => {
    expect((await visiteur.page("/")).html).not.toContain('href="#"');
  });

  it("l'accueil montre les derniers articles et « Nos Fabrications » (ACC-5, FAB-2)", async () => {
    const texte = texteVisible((await visiteur.page("/")).html);
    expect(texte).toContain("Dernières actualités");
    expect(texte).toContain("Auberge espagnole");
    expect(texte).toContain("Café citoyen");
  });

  it("les trois textes officiels sont consultables (PRE-5)", async () => {
    const texte = texteVisible((await visiteur.page("/documents")).html);
    expect(texte).toContain("Statuts de La Fabrique de Ménesplet");
    expect(texte).toContain("Règlement intérieur");
    expect(texte).toContain("Charte de neutralité");
  });

  it("le formulaire d'adhésion exige les trois acceptations, non précochées (ADH-2)", async () => {
    const { html } = await visiteur.page("/adherer");
    for (const nom of ["accepteCharte", "accepteStatuts", "accepteReglement"]) {
      const caseACocher = new RegExp(`<input[^>]*name="${nom}"[^>]*>`).exec(html)?.[0];
      expect(caseACocher, nom).toBeTruthy();
      expect(caseACocher, nom).toContain("required");
      expect(caseACocher, nom).not.toMatch(/\schecked/);
    }
  });

  it("les filtres d'actualités fonctionnent (ACT-3)", async () => {
    const aVenir = texteVisible((await visiteur.page("/actualites?filtre=a-venir")).html);
    const passees = texteVisible((await visiteur.page("/actualites?filtre=passees")).html);
    expect(aVenir).toContain("Auberge espagnole");
    expect(aVenir).not.toContain("Atelier au jardin partagé");
    expect(passees).toContain("Atelier au jardin partagé");
  });
});
