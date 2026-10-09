import { describe, expect, it } from "vitest";
import { age, finAnneeCivile } from "@/lib/adhesion";
import { anneeARenouveler } from "@/lib/taches";
import { emailActivation, emailAccuseContact, emailDemandeRecue, emailRefus } from "@/lib/modeles-email-membres";

describe("âge (bloc « mineurs » du bulletin, ADH-16)", () => {
  const le = new Date("2026-10-09T12:00:00");
  it("calcule l'âge à la date du jour", () => {
    expect(age("2008-10-09", le)).toBe(18);
    expect(age("2008-10-10", le)).toBe(17); // anniversaire demain
    expect(age("1990-01-01", le)).toBe(36);
  });
});

describe("année civile de cotisation (règlement intérieur, art. 3)", () => {
  it("finAnneeCivile renvoie le 31 décembre de l'année", () => {
    expect(finAnneeCivile(new Date("2026-03-15")).toISOString().slice(0, 10)).toBe("2026-12-31");
  });
  it.each([
    ["2026-10-15", null],
    ["2026-11-30", null],
    ["2026-12-01", 2027],
    ["2026-12-31", 2027],
    ["2027-01-15", 2027],
    ["2027-02-01", null],
  ])("période de renouvellement le %s → %s", (date, annee) => {
    expect(anneeARenouveler(new Date(`${date}T12:00:00`))).toBe(annee);
  });
});

describe("courriels du parcours d'adhésion", () => {
  it("la confirmation reprend le montant, le mode et les modalités de paiement", () => {
    const m = emailDemandeRecue({ prenom: "Camille", montant: 5, mode: "Chèque", paiement: "Ligne 1\nLigne 2" });
    expect(m.texte).toContain("5 €, chèque");
    expect(m.texte).toContain("Ligne 1\nLigne 2");
    expect(m.html).toContain("Ligne 2");
  });
  it("l'activation donne le code et la durée du lien", () => {
    const m = emailActivation({ prenom: "Camille", code: "FAB-ABC234", lien: "https://x/activer/j", dureeJours: 7 });
    expect(m.texte).toContain("FAB-ABC234");
    expect(m.texte).toContain("7 jours");
    expect(m.html).toContain('href="https://x/activer/j"');
  });
  it("le refus n'affiche « Motif » que s'il y en a un", () => {
    expect(emailRefus({ prenom: "A", motif: "Raison", lienContact: "https://x/contact" }).texte).toContain("Motif : Raison");
    expect(emailRefus({ prenom: "A", motif: null, lienContact: "https://x/contact" }).texte).not.toContain("Motif");
  });
  it("l'accusé de réception ne reprend aucun texte fourni par l'expéditeur, sauf son nom (échappé en HTML)", () => {
    const m = emailAccuseContact({ nom: "<b>Jeanne</b>" });
    expect(m.html).not.toContain("<b>Jeanne</b>");
    expect(m.html).toContain("&lt;b&gt;Jeanne&lt;/b&gt;");
  });
});
