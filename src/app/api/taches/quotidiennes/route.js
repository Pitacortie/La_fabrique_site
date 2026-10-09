import { timingSafeEqual } from "node:crypto";
import { journaliser } from "@/lib/audit";
import { tachesQuotidiennes } from "@/lib/taches";

export const dynamic = "force-dynamic";

// Tâches quotidiennes (rappels de cotisation, ménage), appelées chaque matin par un planificateur externe
// (GitHub Actions, cron-job.org…) avec l'en-tête « Authorization: Bearer <TACHES_SECRET> ».
function autorise(request) {
  const secret = process.env.TACHES_SECRET;
  const recu = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || secret.length < 16 || recu.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(recu), Buffer.from(secret));
}

export async function POST(request) {
  if (!autorise(request)) return Response.json({ erreur: "Non autorisé" }, { status: 401 });

  // Tests uniquement : simuler une autre date (jamais en production réelle)
  const dateTest = process.env.TACHES_DATE_TEST_AUTORISEE === "1" ? new URL(request.url).searchParams.get("date") : null;
  const resultat = await tachesQuotidiennes(dateTest ? new Date(dateTest) : new Date());
  await journaliser({ action: "taches.quotidiennes", cibleType: "Systeme", details: { ...resultat.rappels, ...resultat.nettoyage } });
  return Response.json(resultat);
}
