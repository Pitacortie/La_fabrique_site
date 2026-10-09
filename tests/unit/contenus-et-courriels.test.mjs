import { describe, expect, it } from "vitest";
import { BLOCS } from "@/lib/contenus";
import { emailMotDePasseModifie, emailReinitialisation } from "@/lib/modeles-email";

describe("blocs de texte éditables", () => {
  it("chaque clé est unique", () => {
    const cles = BLOCS.map((b) => b.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });
  it("chaque bloc a un libellé, et un texte par défaut sauf les liens facultatifs", () => {
    for (const b of BLOCS) {
      expect(b.libelle, b.cle).toBeTruthy();
      if (!b.url) expect(b.defaut, b.cle).toBeTruthy();
    }
  });
  it("l'e-mail de contact par défaut utilise le vrai domaine", () => {
    expect(BLOCS.find((b) => b.cle === "site.email").defaut).toBe("contact@lafabriquedemenesplet.fr");
  });
});

describe("modèles de courriels", () => {
  const lien = "https://lafabriquedemenesplet.fr/reinitialiser/abc";

  it("le courriel de réinitialisation contient le lien et la durée, en texte et en HTML", () => {
    const m = emailReinitialisation({ prenom: "Camille", lien, dureeMinutes: 60 });
    expect(m.sujet).toBe("Réinitialisation de votre mot de passe");
    expect(m.texte).toContain(lien);
    expect(m.texte).toContain("60 minutes");
    expect(m.html).toContain(`href="${lien}"`);
  });

  it("échappe le HTML d'un prénom malveillant", () => {
    const m = emailReinitialisation({ prenom: '<script>alert("x")</script>', lien, dureeMinutes: 60 });
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
  });

  it("le courriel d'alerte indique quoi faire si ce n'est pas le membre", () => {
    const m = emailMotDePasseModifie({ prenom: "Camille", lienContact: "https://lafabriquedemenesplet.fr/contact" });
    expect(m.texte).toContain("Si ce n'est pas vous");
    expect(m.html).toContain('href="https://lafabriquedemenesplet.fr/contact"');
  });
});
