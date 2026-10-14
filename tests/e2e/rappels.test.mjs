import { describe, expect, it } from "vitest";
import { TACHES_SECRET_TEST } from "./config.mjs";
import { BASE, COMPTES, connecte, courriels, pause, prisma, texteVisible } from "./outils.mjs";

const lancer = (date, secret = TACHES_SECRET_TEST) =>
  fetch(`${BASE}/api/taches/quotidiennes${date ? `?date=${date}` : ""}`, { method: "POST", headers: secret ? { authorization: `Bearer ${secret}` } : {} });

const rappels = (annee) => courriels().filter((c) => c.objet === `Renouvellement de votre adhésion ${annee}`);

describe("tâches quotidiennes : rappels de cotisation (ADH-10)", () => {
  it("refuse un appel sans secret ou avec un mauvais secret", async () => {
    expect((await lancer(null, null)).status).toBe(401);
    expect((await lancer(null, "mauvais-secret-mauvais-secret!")).status).toBe(401);
    expect((await fetch(`${BASE}/api/taches/quotidiennes`)).status).toBe(405); // GET non accepté
  });

  it("hors période de renouvellement (octobre), aucun rappel", async () => {
    const r = await (await lancer("2026-10-15T08:00:00Z")).json();
    expect(r.rappels).toEqual({ annee: null, envoyes: 0, echecs: 0 });
  });

  it("le Bureau enregistre une cotisation 2027 pour un membre : il ne sera pas relancé", async () => {
    const bureau = await connecte("bureau");
    const coordonnees = await prisma.membre.findUnique({ where: { email: COMPTES.coordonnees.email } });
    const r = await bureau.soumettre("/admin/cotisations", "Enregistrer la cotisation", {
      membreId: coordonnees.id,
      montant: "2",
      modeReglement: "ESPECES",
      recueLe: "2026-10-09",
      valideJusquau: "2027-12-31",
    });
    expect(r.message).toMatch(/Cotisation de .* enregistrée/);
    expect(texteVisible((await bureau.page("/admin/cotisations")).html)).toContain("31 décembre 2027");
  });

  it("en décembre, les membres actifs non renouvelés pour l'année suivante reçoivent un rappel", async () => {
    const r = await (await lancer("2026-12-05T08:00:00Z")).json();
    expect(r.rappels.annee).toBe(2027);
    expect(r.rappels.envoyes).toBeGreaterThan(0);
    await pause(200);
    const destinataires = rappels(2027).map((c) => c.a);
    expect(destinataires).toContain(COMPTES.adherent.email);
    expect(destinataires).not.toContain(COMPTES.coordonnees.email); // à jour pour 2027
    expect(destinataires).not.toContain(COMPTES.suspendu.email); // compte suspendu
    expect(rappels(2027)[0].texte).toContain("Comment payer");
  });

  it("pas de nouveau rappel avant deux semaines", async () => {
    const avant = rappels(2027).length;
    const r = await (await lancer("2026-12-10T08:00:00Z")).json();
    expect(r.rappels.envoyes).toBe(0);
    await pause(200);
    expect(rappels(2027).length).toBe(avant);
  });

  it("deux semaines plus tard, nouvelle relance", async () => {
    const r = await (await lancer("2026-12-20T08:00:00Z")).json();
    expect(r.rappels.envoyes).toBeGreaterThan(0);
  });

  it("le bouton de la console est désactivé hors période", async () => {
    const { html } = await (await connecte("bureau")).page("/admin/cotisations");
    expect(texteVisible(html)).toContain("Nous ne sommes pas en période de renouvellement");
    expect(/<button[^>]*disabled=""[^>]*>Envoyer les rappels maintenant/.test(html)).toBe(true);
  });

  it("le ménage supprime les sessions expirées", async () => {
    const membre = await prisma.membre.findUnique({ where: { email: COMPTES.adherent.email } });
    await prisma.session.create({ data: { id: "session-expiree-de-test", membreId: membre.id, expireLe: new Date(Date.now() - 1000) } });
    const r = await (await lancer()).json();
    expect(r.nettoyage.sessions).toBeGreaterThanOrEqual(1);
    expect(await prisma.session.findUnique({ where: { id: "session-expiree-de-test" } })).toBeNull();
  });
});

describe("tâches quotidiennes : classement et durées de conservation", () => {
  const ilYA = (jours) => new Date(Date.now() - jours * 86_400_000);
  const demande = (data) =>
    prisma.demandeAdhesion.create({
      data: {
        email: `${Math.random().toString(36).slice(2)}@exemple.fr`, nom: "Ancien", prenom: "Test", dateNaissance: new Date("1980-01-01"),
        adresse: "1 rue", codePostal: "24700", commune: "Ménesplet", telephone: "0600000000", droitImage: false,
        montantPropose: 5, modeReglement: "ESPECES", consentementLeveeAnonymat: true, certifieLe: new Date(), consentementRgpdLe: new Date(),
        ...data,
      },
    });

  it("une demande sans cotisation depuis plus d'un mois est classée sans suite (ADH-14)", async () => {
    const vieille = await demande({ createdAt: ilYA(40) });
    const recente = await demande({ createdAt: ilYA(5) });
    const r = await (await lancer()).json();
    expect(r.demandesClassees).toBeGreaterThanOrEqual(1);
    expect((await prisma.demandeAdhesion.findUnique({ where: { id: vieille.id } })).statut).toBe("CLASSEE_SANS_SUITE");
    expect((await prisma.demandeAdhesion.findUnique({ where: { id: recente.id } })).statut).toBe("EN_ATTENTE");
  });

  it("une demande refusée est effacée après un an, le journal après cinq ans", async () => {
    const refusee = await demande({ statut: "REFUSEE", decideLe: ilYA(400) });
    const refuseeRecente = await demande({ statut: "REFUSEE", decideLe: ilYA(30) });
    const vieilleTrace = await prisma.journalAudit.create({ data: { action: "test.ancien", cibleType: "Test", createdAt: ilYA(6 * 365) } });
    await lancer();
    expect(await prisma.demandeAdhesion.findUnique({ where: { id: refusee.id } })).toBeNull();
    expect(await prisma.demandeAdhesion.findUnique({ where: { id: refuseeRecente.id } })).not.toBeNull();
    expect(await prisma.journalAudit.findUnique({ where: { id: vieilleTrace.id } })).toBeNull();
  });

  it("un compte inactif depuis cinq ans est effacé", async () => {
    const m = await prisma.membre.create({
      data: { email: "inactif-cinq-ans@test.local", nom: "Inactif", prenom: "Test", statut: "ACTIF", createdAt: ilYA(6 * 365), derniereConnexion: ilYA(6 * 365) },
    });
    await lancer();
    expect(await prisma.membre.findUnique({ where: { id: m.id } })).toBeNull();
  });
});
