import { headers } from "next/headers";
import nodemailer from "nodemailer";

// Envoi des courriels transactionnels (activation, mot de passe oublié…).
// Sans SMTP_HOST, aucun courriel ne part : il est affiché dans le terminal du serveur (développement, aperçu Render).
const smtpConfigure = Boolean(process.env.SMTP_HOST);
const expediteur = () => process.env.MAIL_FROM || "La Fabrique de Ménesplet <contact@lafabriquedemenesplet.fr>";

// Remarque : l'offre gratuite de Render bloque les ports SMTP 25, 465 et 587. Brevo accepte aussi le port 2525.
function creerTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    // Échouer vite (au lieu de 2 minutes) si le port est bloqué ou le serveur injoignable
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

let transport;
const getTransport = () => (transport ??= creerTransport());

// `repondreA` : adresse utilisée quand le destinataire clique sur « Répondre ».
export async function envoyerEmail({ a, sujet, texte, html, repondreA }) {
  if (!smtpConfigure) {
    console.log(`\n──── Courriel (non envoyé : SMTP_HOST vide) ────\nÀ : ${a}\nObjet : ${sujet}\n\n${texte}\n────────────────────────────────────────────────\n`);
    return;
  }
  await getTransport().sendMail({ from: expediteur(), to: a, subject: sujet, text: texte, html, replyTo: repondreA });
}

// Diagnostic pour la console d'administration : vérifie la connexion SMTP, envoie un courriel de test
// et renvoie un compte rendu lisible (sans jamais afficher le mot de passe).
export async function diagnostiquerEmail(a) {
  const config = {
    serveur: process.env.SMTP_HOST || "(vide)",
    port: process.env.SMTP_PORT || "587",
    identifiant: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 4)}…` : "(vide)",
    motDePasse: process.env.SMTP_PASSWORD ? "renseigné" : "(vide)",
    expediteur: expediteur(),
  };
  if (!smtpConfigure) return { ok: false, config, etape: "configuration", message: "SMTP_HOST est vide : les e-mails ne partent pas, ils sont seulement écrits dans les logs du serveur." };
  const t = creerTransport();
  try {
    await t.verify();
  } catch (e) {
    return { ok: false, config, etape: "connexion", message: e.message, code: e.code };
  }
  try {
    const info = await t.sendMail({
      from: expediteur(),
      to: a,
      subject: "Test d'envoi : La Fabrique de Ménesplet",
      text: "Si vous lisez ce message, l'envoi des courriels du site fonctionne.\n\nLa Fabrique de Ménesplet",
    });
    return { ok: true, config, reponse: info.response };
  } catch (e) {
    return { ok: false, config, etape: "envoi", message: e.message, code: e.code };
  }
}

// Adresse publique du site pour les liens des courriels : APP_URL, sinon l'adresse de la requête en cours.
export async function urlDuSite() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocole = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https");
  return `${protocole}://${hote}`;
}
