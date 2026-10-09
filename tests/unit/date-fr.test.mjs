import { describe, expect, it } from "vitest";
import { formaterSaisieDate, formaterSaisieHeure, frVersIso, heureValide, isoVersFr } from "@/lib/date-fr";

describe("dates au format français (jj/mm/aaaa)", () => {
  it("ajoute les barres obliques pendant la frappe", () => {
    expect(formaterSaisieDate("1")).toBe("1");
    expect(formaterSaisieDate("1405")).toBe("14/05");
    expect(formaterSaisieDate("14051990")).toBe("14/05/1990");
    expect(formaterSaisieDate("14/05/1990")).toBe("14/05/1990");
    expect(formaterSaisieDate("140519901234")).toBe("14/05/1990");
  });
  it("convertit vers le format envoyé au serveur", () => {
    expect(frVersIso("14/05/1990")).toBe("1990-05-14");
    expect(frVersIso("29/02/2024")).toBe("2024-02-29");
  });
  it.each(["31/02/2026", "29/02/2025", "00/01/2000", "12/13/2000", "14/05/90", "14-05-1990", "", "01/01/1850"])("refuse « %s »", (t) => {
    expect(frVersIso(t)).toBeNull();
  });
  it("affiche une date technique en français", () => {
    expect(isoVersFr("2026-12-31")).toBe("31/12/2026");
    expect(isoVersFr("")).toBe("");
  });
});

describe("heures au format 24 h (hh:mm)", () => {
  it("ajoute les deux-points, ou garde ceux tapés", () => {
    expect(formaterSaisieHeure("1430")).toBe("14:30");
    expect(formaterSaisieHeure("9:30")).toBe("9:30");
  });
  it("valide et normalise", () => {
    expect(heureValide("14:30")).toBe("14:30");
    expect(heureValide("9:05")).toBe("09:05");
    expect(heureValide("24:00")).toBeNull();
    expect(heureValide("12:60")).toBeNull();
    expect(heureValide("2:30 PM")).toBeNull();
  });
});
