import path from "node:path";
import { describe, expect, it } from "vitest";
import { DOSSIER_UPLOADS, cheminDepuisUrl } from "@/lib/medias";
import { compterEchec, estBloque, limiter, reinitialiser } from "@/lib/rate-limit";
import { extraireIp } from "@/lib/requete";
import { pageSansSecret } from "@/lib/signalements";

describe("extraireIp (limites de débit derrière un proxy)", () => {
  it("prend la dernière adresse, ajoutée par le proxy", () => {
    expect(extraireIp("1.2.3.4, 5.6.7.8")).toBe("5.6.7.8");
  });
  it("ignore une adresse inventée par le client en tête de liste", () => {
    expect(extraireIp("ip-inventee, 9.9.9.9")).toBe(extraireIp("autre-invention, 9.9.9.9"));
  });
  it("renvoie « local » sans en-tête", () => {
    expect(extraireIp(null)).toBe("local");
    expect(extraireIp("")).toBe("local");
  });
});

describe("limiter (limitation de débit en mémoire)", () => {
  it("autorise jusqu'au maximum puis bloque", () => {
    const cle = `test-${Math.random()}`;
    const resultats = Array.from({ length: 4 }, () => limiter(cle, { max: 3, fenetreMs: 60_000 }).autorise);
    expect(resultats).toEqual([true, true, true, false]);
  });
  it("repart de zéro après la fenêtre", async () => {
    const cle = `test-${Math.random()}`;
    limiter(cle, { max: 1, fenetreMs: 20 });
    expect(limiter(cle, { max: 1, fenetreMs: 20 }).autorise).toBe(false);
    await new Promise((r) => setTimeout(r, 30));
    expect(limiter(cle, { max: 1, fenetreMs: 20 }).autorise).toBe(true);
  });
  it("reinitialiser efface le compteur", () => {
    const cle = `test-${Math.random()}`;
    limiter(cle, { max: 1, fenetreMs: 60_000 });
    reinitialiser(cle);
    expect(limiter(cle, { max: 1, fenetreMs: 60_000 }).autorise).toBe(true);
  });
});

describe("estBloque / compterEchec (connexion : seuls les échecs comptent)", () => {
  it("bloque après le nombre d'échecs maximum", () => {
    const cle = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(estBloque(cle, { max: 3 })).toBe(false);
      compterEchec(cle, { fenetreMs: 60_000 });
    }
    expect(estBloque(cle, { max: 3 })).toBe(true);
  });
  it("vérifier sans échouer ne compte rien", () => {
    const cle = `test-${Math.random()}`;
    for (let i = 0; i < 50; i++) expect(estBloque(cle, { max: 3 })).toBe(false);
  });
});

describe("cheminDepuisUrl (photos : pas de sortie du dossier uploads)", () => {
  it("accepte un chemin normal", () => {
    expect(cheminDepuisUrl(["articles", "abc", "photo.webp"])).toBe(path.join(DOSSIER_UPLOADS, "articles", "abc", "photo.webp"));
  });
  it.each([[[".."]], [["..", ".env"]], [["articles", "..", "..", "package.json"]], [["..%2F.env"].map(decodeURIComponent)]])(
    "refuse %j",
    (segments) => {
      expect(cheminDepuisUrl(segments)).toBeNull();
    },
  );
});

describe("pageSansSecret (signalements de bug)", () => {
  it("masque le jeton d'un lien de réinitialisation", () => {
    expect(pageSansSecret("/reinitialiser/AbCdEf123_-xyz")).toBe("/reinitialiser/[jeton]");
  });
  it("masque le jeton d'un lien d'activation", () => {
    expect(pageSansSecret("/activer/secret?x=1")).toBe("/activer/[jeton]?x=1");
  });
  it("laisse les autres pages intactes et retire l'ancre", () => {
    expect(pageSansSecret("/actualites?filtre=a-venir#haut")).toBe("/actualites?filtre=a-venir");
  });
  it("remplace une adresse externe par /", () => {
    expect(pageSansSecret("https://exemple.com/piege")).toBe("/");
  });
});
