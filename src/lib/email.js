import { headers } from "next/headers";
import nodemailer from "nodemailer";

// Envoi des courriels transactionnels (activation, mot de passe oublié…).
// Sans SMTP_HOST, aucun courriel ne part : il est affiché dans le terminal du serveur (développement, aperçu Render).
const smtpConfigure = Boolean(process.env.SMTP_HOST);

let transport;
function getTransport() {
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transport;
}

// `repondreA` : adresse utilisée quand le destinataire clique sur « Répondre ».
export async function envoyerEmail({ a, sujet, texte, html, repondreA }) {
  const from = process.env.MAIL_FROM || "La Fabrique de Ménesplet <contact@lafabriquedemenesplet.fr>";
  if (!smtpConfigure) {
    console.log(`\n──── Courriel (non envoyé : SMTP_HOST vide) ────\nÀ : ${a}\nObjet : ${sujet}\n\n${texte}\n────────────────────────────────────────────────\n`);
    return;
  }
  await getTransport().sendMail({ from, to: a, subject: sujet, text: texte, html, replyTo: repondreA });
}

// Adresse publique du site pour les liens des courriels : APP_URL, sinon l'adresse de la requête en cours.
export async function urlDuSite() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocole = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https");
  return `${protocole}://${hote}`;
}
