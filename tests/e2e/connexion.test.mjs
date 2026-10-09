import { describe, expect, it } from "vitest";
import { COMPTES, Navigateur, prisma } from "./outils.mjs";

const ERREUR = "Adresse e-mail ou mot de passe incorrect.";
const tenter = (nav, email, motDePasse, extra = {}) =>
  nav.soumettre("/connexion", 'name="motDePasse"', { email, motDePasse, ...extra });

describe("connexion (CON-1 à CON-5)", () => {
  it("les bons identifiants ouvrent une session et mènent à « Nos Fabrications »", async () => {
    const nav = new Navigateur();
    const r = await tenter(nav, COMPTES.adherent.email, COMPTES.adherent.motDePasse);
    expect(r.status).toBe(303);
    expect(r.location).toBe("/espace/fabrications");
    expect(nav.cookie).toMatch(/^fabrique_session=/);
    expect((await nav.page("/espace")).status).toBe(200);
  });

  it("l'e-mail est insensible à la casse et aux espaces", async () => {
    const r = await tenter(new Navigateur(), `  ${COMPTES.adherent.email.toUpperCase()} `, COMPTES.adherent.motDePasse);
    expect(r.status).toBe(303);
  });

  it("même message que le compte existe ou non (CON-2)", async () => {
    const mauvaisMdp = await tenter(new Navigateur(), COMPTES.adherent.email, "mauvais mot de passe");
    const compteInconnu = await tenter(new Navigateur(), "inconnu@test.local", "mauvais mot de passe");
    expect(mauvaisMdp.message).toBe(ERREUR);
    expect(compteInconnu.message).toBe(ERREUR);
  });

  it("un compte suspendu ne peut pas se connecter et reçoit un message neutre (CON-4)", async () => {
    const r = await tenter(new Navigateur(), COMPTES.suspendu.email, COMPTES.suspendu.motDePasse);
    expect(r.status).toBe(200);
    expect(r.message).toMatch(/ne permet pas de se connecter/);
  });

  it("la 6ᵉ tentative ratée en 15 minutes est bloquée, même avec le bon mot de passe (CON-2)", async () => {
    const nav = new Navigateur();
    for (let i = 0; i < 5; i++) expect((await tenter(nav, COMPTES.bureau.email, "faux")).message).toBe(ERREUR);
    const r = await tenter(nav, COMPTES.bureau.email, COMPTES.bureau.motDePasse);
    expect(r.message).toMatch(/Trop de tentatives/);
  });

  it("se connecter souvent avec le bon mot de passe ne bloque jamais", async () => {
    for (let i = 0; i < 25; i++) await new Navigateur().connexion(COMPTES.adherent);
  });

  it("20 échecs sur un même compte depuis 20 adresses différentes bloquent ce compte", async () => {
    const email = COMPTES.suspendu.email; // compte qui ne sert à aucune autre connexion réussie
    for (let i = 0; i < 20; i++) await tenter(new Navigateur(), email, "faux");
    const r = await tenter(new Navigateur(), email, COMPTES.suspendu.motDePasse);
    expect(r.message).toMatch(/Trop de tentatives/);
  });

  it("une IP inventée en tête de X-Forwarded-For ne contourne pas la limite", async () => {
    const nav = new Navigateur();
    const ipReelle = nav.ip; // ajoutée en dernier par le proxy : c'est elle qui compte
    let dernier;
    for (let i = 0; i < 6; i++) {
      nav.ip = `ip-inventee-${i}, ${ipReelle}`;
      dernier = await tenter(nav, COMPTES.admin.email, "faux");
    }
    expect(dernier.message).toMatch(/Trop de tentatives/);
  });

  it("« Rester connecté » donne un cookie de 30 jours, sinon un cookie effacé à la fermeture", async () => {
    const lireCookie = async (rester) => {
      const nav = new Navigateur();
      const donnees = await nav.formulaire("/connexion", 'name="motDePasse"');
      donnees.set("email", COMPTES.adherent.email);
      donnees.set("motDePasse", COMPTES.adherent.motDePasse);
      if (rester) donnees.set("resterConnecte", "on");
      const r = await nav.requete("/connexion", { method: "POST", body: donnees });
      return r.headers.get("set-cookie");
    };
    expect(await lireCookie(false)).not.toMatch(/Expires=/i);
    const expire = new Date(/Expires=([^;]+)/i.exec(await lireCookie(true))[1]);
    const jours = (expire - Date.now()) / 86_400_000;
    expect(jours).toBeGreaterThan(29);
    expect(jours).toBeLessThan(31);
  });

  it("la session courte expire en base après 12 heures", async () => {
    const avant = new Date();
    await new Navigateur().connexion(COMPTES.adherent);
    const session = await prisma.session.findFirst({ where: { createdAt: { gte: avant } }, orderBy: { createdAt: "desc" } });
    const heures = (session.expireLe - session.createdAt) / 3_600_000;
    expect(Math.round(heures)).toBe(12);
  });

  it("le paramètre « suite » ne permet pas de rediriger vers un autre site", async () => {
    const nav = new Navigateur();
    const donnees = await nav.formulaire("/connexion?suite=//site-pirate.example", 'name="motDePasse"');
    donnees.set("email", COMPTES.adherent.email);
    donnees.set("motDePasse", COMPTES.adherent.motDePasse);
    const r = await nav.envoyer("/connexion", donnees);
    expect(r.location).toBe("/espace/fabrications");
  });

  it("« suite » ramène vers la page demandée avant la connexion", async () => {
    const nav = new Navigateur();
    const { location } = await nav.page("/espace/coordonnees");
    expect(location).toContain("suite=%2Fespace%2Fcoordonnees");
    const donnees = await nav.formulaire(location.replace(/^https?:\/\/[^/]+/, ""), 'name="motDePasse"');
    donnees.set("email", COMPTES.adherent.email);
    donnees.set("motDePasse", COMPTES.adherent.motDePasse);
    expect((await nav.envoyer("/connexion", donnees)).location).toBe("/espace/coordonnees");
  });

  it("« Sortir » ferme la session : l'ancien cookie ne donne plus accès à rien (CON-5)", async () => {
    const nav = await new Navigateur().connexion(COMPTES.adherent);
    const ancienCookie = nav.cookie;
    const r = await nav.soumettre("/espace", ">Sortir<");
    expect(r.location).toBe("/");
    const espion = new Navigateur();
    espion.cookie = ancienCookie;
    expect((await espion.page("/espace")).status).toBe(307);
  });

  it("un cookie de session inventé ne donne aucun accès", async () => {
    const nav = new Navigateur();
    nav.cookie = "fabrique_session=jeton-invente";
    expect((await nav.page("/espace")).location).toMatch(/^\/connexion/);
  });

  it("le mot de passe est stocké haché avec argon2, jamais en clair (11.1)", async () => {
    const m = await prisma.membre.findUnique({ where: { email: COMPTES.adherent.email } });
    expect(m.motDePasseHash).toMatch(/^\$argon2id\$/);
    expect(m.motDePasseHash).not.toContain(COMPTES.adherent.motDePasse);
  });
});
