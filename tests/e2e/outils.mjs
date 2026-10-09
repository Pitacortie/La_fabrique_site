// Petit « navigateur » pour les tests : garde le cookie de session, lit les formulaires d'une page
// (avec leurs champs cachés, dont l'identifiant de l'action serveur) et les soumet comme un navigateur sans JavaScript.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { BASE, COMPTES, DATABASE_URL_TEST, JOURNAL_SERVEUR } from "./config.mjs";

export { BASE, COMPTES };

export const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL_TEST });

export const decoder = (v) =>
  v.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// Texte visible d'une page HTML (balises et commentaires React retirés), pour chercher une phrase.
export const texteVisible = (html) => decoder(html.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");

let compteurIp = 0;

export class Navigateur {
  constructor() {
    this.cookie = "";
    // Chaque navigateur a sa propre IP : les limites de débit d'un test ne gênent pas les autres.
    this.ip = `10.0.${Math.floor(++compteurIp / 250)}.${compteurIp % 250}`;
  }

  async requete(chemin, options = {}) {
    const r = await fetch(BASE + chemin, {
      redirect: "manual",
      ...options,
      headers: { "x-forwarded-for": this.ip, ...(this.cookie ? { cookie: this.cookie } : {}), ...options.headers },
    });
    const setCookie = r.headers.get("set-cookie");
    if (setCookie?.startsWith("fabrique_session=")) {
      const valeur = setCookie.split(";")[0];
      this.cookie = /fabrique_session=;|Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(setCookie) ? "" : valeur;
    }
    return r;
  }

  async page(chemin) {
    const r = await this.requete(chemin);
    return { status: r.status, location: r.headers.get("location"), html: r.status === 200 ? await r.text() : "" };
  }

  // Lit le premier formulaire de la page qui contient `marqueur` et renvoie ses valeurs par défaut.
  async formulaire(chemin, marqueur) {
    const { html, status } = await this.page(chemin);
    const formulaire = [...html.matchAll(/<form[\s\S]*?<\/form>/g)].map((m) => m[0]).find((f) => f.includes(marqueur));
    if (!formulaire) throw new Error(`Formulaire « ${marqueur} » introuvable sur ${chemin} (HTTP ${status})`);
    const donnees = new FormData();
    for (const m of formulaire.matchAll(/<input([^>]*)>/g)) {
      const attributs = m[1];
      const nom = /name="([^"]+)"/.exec(attributs)?.[1];
      const type = /type="([^"]+)"/.exec(attributs)?.[1] ?? "text";
      if (!nom || type === "file" || type === "submit") continue;
      if (type === "checkbox" || type === "radio") {
        if (/\schecked=""/.test(attributs)) donnees.append(nom, decoder(/value="([^"]*)"/.exec(attributs)?.[1] ?? "on"));
        continue;
      }
      donnees.append(nom, decoder(/value="([^"]*)"/.exec(attributs)?.[1] ?? ""));
    }
    for (const m of formulaire.matchAll(/<textarea[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/textarea>/g)) donnees.append(m[1], decoder(m[2]));
    for (const m of formulaire.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
      const choisi = /<option[^>]*selected=""[^>]*value="([^"]*)"|<option[^>]*value="([^"]*)"[^>]*selected=""/.exec(m[2]);
      donnees.append(m[1], decoder(choisi?.[1] ?? choisi?.[2] ?? /value="([^"]*)"/.exec(m[2])?.[1] ?? ""));
    }
    return donnees;
  }

  // Remplit puis soumet un formulaire. Renvoie le statut, la redirection éventuelle et le message affiché.
  async soumettre(chemin, marqueur, champs = {}) {
    const donnees = await this.formulaire(chemin, marqueur);
    for (const [cle, valeur] of Object.entries(champs)) {
      if (valeur === null) donnees.delete(cle);
      else donnees.set(cle, valeur);
    }
    return this.envoyer(chemin, donnees);
  }

  async envoyer(chemin, donnees) {
    const r = await this.requete(chemin, { method: "POST", body: donnees });
    const html = r.status === 200 ? await r.text() : "";
    const message = /role="(?:status|alert)"[^>]*>([^<]+)/.exec(html)?.[1];
    return { status: r.status, location: r.headers.get("location"), html, message: message && decoder(message) };
  }

  async connexion(compte, { resterConnecte = false } = {}) {
    const champs = { email: compte.email, motDePasse: compte.motDePasse };
    if (resterConnecte) champs.resterConnecte = "on";
    const r = await this.soumettre("/connexion", 'name="motDePasse"', champs);
    if (r.status !== 303) throw new Error(`Connexion impossible pour ${compte.email} : ${r.message ?? r.status}`);
    return this;
  }
}

export async function connecte(cle) {
  return new Navigateur().connexion(COMPTES[cle]);
}

// Courriels « envoyés » : le serveur de test les écrit dans son journal (SMTP_HOST vide).
export function courriels() {
  const journal = readFileSync(JOURNAL_SERVEUR, "utf8");
  return [...journal.matchAll(/──── Courriel \(non envoyé : SMTP_HOST vide\) ────\nÀ : (.*)\nObjet : (.*)\n\n([\s\S]*?)\n─{20,}/g)].map(
    ([, a, objet, texte]) => ({ a, objet, texte }),
  );
}

export const dernierCourriel = (a) => courriels().filter((c) => c.a === a).at(-1);

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Fait accepter au compte tous les textes actuellement en vigueur (après la publication d'une nouvelle version).
export async function accepterTextesEnVigueur(email) {
  const membre = await prisma.membre.findUnique({ where: { email } });
  const textes = await prisma.texteJuridique.findMany({ where: { enVigueurLe: { lte: new Date() } } });
  const deja = new Set((await prisma.acceptation.findMany({ where: { membreId: membre.id } })).map((a) => a.texteId));
  await prisma.acceptation.createMany({ data: textes.filter((t) => !deja.has(t.id)).map((t) => ({ texteId: t.id, membreId: membre.id })) });
}

// Lien (chemin) trouvé dans le dernier courriel reçu par une adresse
export function lienDuCourriel(a, motif) {
  const c = dernierCourriel(a);
  return c && new RegExp(`${motif}[A-Za-z0-9_-]+`).exec(c.texte)?.[0];
}
