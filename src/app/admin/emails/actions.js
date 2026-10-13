"use server";

import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { exigerBureau } from "@/lib/auth";
import { diagnostiquerEmail } from "@/lib/email";
import { limiter } from "@/lib/rate-limit";

// Pistes selon l'erreur, pour un administrateur qui n'est pas forcément technicien
function piste(r) {
  const m = `${r.code ?? ""} ${r.message ?? ""}`;
  if (r.etape === "configuration") return "Renseignez SMTP_HOST, SMTP_PORT, SMTP_USER et SMTP_PASSWORD dans les variables d'environnement, puis redéployez.";
  if (/ETIMEDOUT|ECONNREFUSED|ESOCKET|Greeting never received|timeout/i.test(m)) {
    return "Le serveur d'envoi est injoignable : le port est probablement bloqué par l'hébergeur (Render gratuit bloque 25, 465 et 587). Essayez SMTP_PORT = 2525.";
  }
  if (/EAUTH|535|authentication|credentials/i.test(m)) return "Identifiant ou clé SMTP refusés : vérifiez-les dans Brevo › SMTP et API (la clé SMTP, pas la clé API).";
  if (/unauthori[sz]ed ip|ip address/i.test(m)) return "Brevo bloque cette adresse IP : autorisez-la dans Brevo › Sécurité › IP autorisées.";
  if (/sender|from|not.*valid|domain/i.test(m)) return "L'expéditeur n'est pas accepté par Brevo : vérifiez que le domaine est authentifié et que MAIL_FROM utilise une adresse de ce domaine.";
  return "Consultez les logs de Brevo (Transactionnel › Logs) et ceux du serveur.";
}

export async function testerEmail(_etat, formData) {
  const bureau = await exigerBureau();
  if (!limiter(`test-email:${bureau.id}`, { max: 10, fenetreMs: 60 * 60 * 1000 }).autorise) {
    return { ok: false, message: "Trop de tests en une heure. Réessayez plus tard." };
  }
  const a = z.string().trim().email().safeParse(formData.get("a") ?? "");
  if (!a.success) return { ok: false, message: "Adresse e-mail invalide." };
  const r = await diagnostiquerEmail(a.data);
  await journaliser({ acteurId: bureau.id, action: "email.test", cibleType: "Systeme", details: { ok: r.ok, etape: r.etape ?? "envoi" } });
  return r.ok ? { ...r, a: a.data } : { ...r, piste: piste(r) };
}
