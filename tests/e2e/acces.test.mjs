import { beforeAll, describe, expect, it } from "vitest";
import { Navigateur, connecte } from "./outils.mjs";

// Qui peut ouvrir quelle page ? « ok » = 200, sinon l'adresse vers laquelle on est renvoyé.
const MATRICE = {
  "/espace": { visiteur: "/connexion", adherent: "ok", admin: "ok", bureau: "ok" },
  "/espace/coordonnees": { visiteur: "/connexion", adherent: "ok", admin: "ok", bureau: "ok" },
  "/espace/mot-de-passe": { visiteur: "/connexion", adherent: "ok", admin: "ok", bureau: "ok" },
  "/espace/initiatives": { visiteur: "/connexion", adherent: "ok", admin: "ok", bureau: "ok" },
  "/admin": { visiteur: "/connexion", adherent: "/espace", admin: "ok", bureau: "ok" },
  "/admin/journal": { visiteur: "/connexion", adherent: "/espace", admin: "ok", bureau: "ok" },
  "/admin/textes": { visiteur: "/connexion", adherent: "/espace", admin: "ok", bureau: "ok" },
  "/admin/signalements": { visiteur: "/connexion", adherent: "/espace", admin: "ok", bureau: "ok" },
  "/admin/messages": { visiteur: "/connexion", adherent: "/espace", admin: "ok", bureau: "ok" },
  // ADM-9, ADM-20 : tous les administrateurs ont les mêmes droits
  "/admin/demandes": { visiteur: "/connexion", adherent: "/espace", admin: "ok", bureau: "ok" },
  "/admin/cotisations": { visiteur: "/connexion", adherent: "/espace", admin: "ok", bureau: "ok" },
  "/espace/email": { visiteur: "/connexion", adherent: "ok", admin: "ok", bureau: "ok" },
  // SEL : il faut être adhérent à jour de cotisation (ces comptes n'ont pas de cotisation)
  "/sel": { visiteur: "/connexion", adherent: "/adherer?raison=sel", admin: "/adherer?raison=sel", bureau: "/adherer?raison=sel" },
  "/sel/messages": { visiteur: "/connexion", adherent: "/adherer?raison=sel", admin: "/adherer?raison=sel", bureau: "/adherer?raison=sel" },
  "/admin/sel": { visiteur: "/connexion", adherent: "/espace", admin: "ok", bureau: "ok" },
  "/admin/sel/inscriptions": { visiteur: "/connexion", adherent: "/espace", admin: "ok", bureau: "ok" },
  // ADM-18 : seuls les administrateurs publient
  "/admin/articles": { visiteur: "/connexion", adherent: "/espace", admin: "ok", bureau: "ok" },
  "/admin/articles/nouveau": { visiteur: "/connexion", adherent: "/espace", admin: "ok", bureau: "ok" },
};

describe("droits d'accès par rôle", () => {
  const navigateurs = {};
  beforeAll(async () => {
    navigateurs.visiteur = new Navigateur();
    navigateurs.adherent = await connecte("adherent");
    navigateurs.admin = await connecte("admin");
    navigateurs.bureau = await connecte("bureau");
  });

  for (const [chemin, attendus] of Object.entries(MATRICE)) {
    for (const [role, attendu] of Object.entries(attendus)) {
      it(`${role} → ${chemin} : ${attendu}`, async () => {
        const { status, location } = await navigateurs[role].page(chemin);
        if (attendu === "ok") {
          expect(status).toBe(200);
        } else {
          expect([303, 307, 308]).toContain(status);
          expect(new URL(location, "http://x").pathname + new URL(location, "http://x").search).toMatch(
            new RegExp(`^${attendu.replace(/[?]/g, "\\?")}`),
          );
        }
      });
    }
  }

  it("un adhérent ne voit pas le lien vers la console", async () => {
    expect((await navigateurs.adherent.page("/espace")).html).not.toContain('href="/admin"');
  });

  it("un administrateur voit le lien vers la console", async () => {
    expect((await navigateurs.admin.page("/espace")).html).toContain('href="/admin"');
  });

  it("tous les administrateurs ont le même menu et les mêmes droits (ADM-9)", async () => {
    for (const nav of [navigateurs.admin, navigateurs.bureau]) {
      expect((await nav.page("/admin")).html).toContain('href="/admin/demandes"');
      expect((await nav.page("/admin/textes")).html).toContain("Publier cette version");
    }
  });

  it("l'en-tête public propose « Sortir » une fois connecté (ACC-4)", async () => {
    expect((await navigateurs.adherent.page("/")).html).toContain(">Sortir<");
    expect((await navigateurs.visiteur.page("/")).html).not.toContain(">Sortir<");
  });
});
