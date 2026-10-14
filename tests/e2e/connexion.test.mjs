import { describe, expect, it } from "vitest";
import { COMPTES, Navigateur, texteVisible, prisma } from "./outils.mjs";

const ERREUR = "Adresse e-mail ou mot de passe incorrect.";
const tenter = (nav, email, motDePasse, extra = {}) =>
  nav.soumettre("/connexion", 'name="motDePasse"', { email, motDePasse, ...extra });

describe("connexion (CON-1 à CON-5)", () => {
  it("les bons identifiants ouvrent une session et mènent à « Nos initiatives »", async () => {
    const nav = new Navigateur();
    const r = await tenter(nav, COMPTES.adherent.email, COMPTES.adherent.motDePasse);
    expect(r.status).toBe(303);
    expect(r.location).toBe("/espace/initiatives");
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

  it("plus de « rester connecté » : le cookie est effacé à la fermeture du navigateur (ACC-4)", async () => {
    const nav = new Navigateur();
    const { html } = await nav.page("/connexion");
    expect(html).not.toContain('name="resterConnecte"');
    const donnees = await nav.formulaire("/connexion", 'name="motDePasse"');
    donnees.set("email", COMPTES.adherent.email);
    donnees.set("motDePasse", COMPTES.adherent.motDePasse);
    const r = await nav.requete("/connexion", { method: "POST", body: donnees });
    expect(r.headers.get("set-cookie")).not.toMatch(/Expires=|Max-Age=/i);
  });

  it("la session expire après 5 minutes sans activité, et chaque visite la prolonge (ACC-4)", async () => {
    const avant = new Date();
    const nav = await new Navigateur().connexion(COMPTES.adherent);
    const session = await prisma.session.findFirst({ where: { createdAt: { gte: avant } }, orderBy: { createdAt: "desc" } });
    expect(Math.round((session.expireLe - session.createdAt) / 60_000)).toBe(5);

    // Échéance proche : une visite la repousse à 5 minutes
    await prisma.session.update({ where: { id: session.id }, data: { expireLe: new Date(Date.now() + 60_000) } });
    expect((await nav.page("/espace")).status).toBe(200);
    const prolongee = await prisma.session.findUnique({ where: { id: session.id } });
    expect((prolongee.expireLe - Date.now()) / 60_000).toBeGreaterThan(4);

    // Le signal d'activité de la page prolonge aussi la session
    await prisma.session.update({ where: { id: session.id }, data: { expireLe: new Date(Date.now() + 60_000) } });
    expect((await nav.requete("/api/session", { method: "POST" })).status).toBe(200);
    expect(((await prisma.session.findUnique({ where: { id: session.id } })).expireLe - Date.now()) / 60_000).toBeGreaterThan(4);

    // Plus de 5 minutes sans activité : déconnecté
    await prisma.session.update({ where: { id: session.id }, data: { expireLe: new Date(Date.now() - 1000) } });
    expect((await nav.page("/espace")).location).toMatch(/^\/connexion/);
    expect((await nav.requete("/api/session", { method: "POST" })).status).toBe(401);
  });

  it("la page de connexion explique une déconnexion pour inactivité", async () => {
    expect(texteVisible((await new Navigateur().page("/connexion?expire=1")).html)).toContain("déconnecté après 5 minutes sans activité");
  });

  it("le paramètre « suite » ne permet pas de rediriger vers un autre site", async () => {
    const nav = new Navigateur();
    const donnees = await nav.formulaire("/connexion?suite=//site-pirate.example", 'name="motDePasse"');
    donnees.set("email", COMPTES.adherent.email);
    donnees.set("motDePasse", COMPTES.adherent.motDePasse);
    const r = await nav.envoyer("/connexion", donnees);
    expect(r.location).toBe("/espace/initiatives");
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
