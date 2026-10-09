import { describe, expect, it } from "vitest";
import { estAVenir, formatDate, slugifier, versChampDate } from "@/lib/format";

describe("slugifier (adresses des articles)", () => {
  it("retire les accents, la ponctuation et met en minuscules", () => {
    expect(slugifier("Fête du Jardin 2026 ! Été")).toBe("fete-du-jardin-2026-ete");
  });
  it("gère les apostrophes et les guillemets français", () => {
    expect(slugifier("L'auberge « espagnole » d'automne")).toBe("l-auberge-espagnole-d-automne");
  });
  it("ne laisse pas de tiret au début ni à la fin", () => {
    expect(slugifier("  --- Bonjour ---  ")).toBe("bonjour");
  });
  it("limite la longueur à 80 caractères", () => {
    expect(slugifier("a".repeat(200))).toHaveLength(80);
  });
  it("renvoie une chaîne vide si aucun caractère utilisable", () => {
    expect(slugifier("!!! ???")).toBe("");
  });
});

describe("estAVenir (ACT-4 : à venir / passée)", () => {
  const maintenant = new Date("2026-10-09T15:00:00");
  it("une activité aujourd'hui est encore à venir", () => {
    expect(estAVenir(new Date("2026-10-09T08:00:00"), maintenant)).toBe(true);
  });
  it("une activité demain est à venir", () => {
    expect(estAVenir(new Date("2026-10-10T12:00:00"), maintenant)).toBe(true);
  });
  it("une activité d'hier est passée", () => {
    expect(estAVenir(new Date("2026-10-08T23:00:00"), maintenant)).toBe(false);
  });
  it("sans date, l'activité est considérée comme passée", () => {
    expect(estAVenir(null, maintenant)).toBe(false);
  });
});

describe("dates", () => {
  it("formatDate écrit la date en français", () => {
    expect(formatDate(new Date("2026-01-31T12:00:00"))).toBe("31 janvier 2026");
  });
  it("versChampDate produit AAAA-MM-JJ pour un champ date", () => {
    expect(versChampDate(new Date("2026-06-20T12:00:00Z"))).toBe("2026-06-20");
    expect(versChampDate(null)).toBe("");
  });
});
