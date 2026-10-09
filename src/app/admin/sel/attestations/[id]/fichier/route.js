import { journaliser } from "@/lib/audit";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { lireFichierPrive } from "@/lib/fichiers-prives";

export const dynamic = "force-dynamic";

// Attestation d'assurance : donnée personnelle sensible (11.2). Réservée aux administrateurs, chaque ouverture est journalisée.
export async function GET(_request, { params }) {
  const admin = await exigerAdmin();
  const { id } = await params;
  const attestation = await prisma.attestationRc.findUnique({ where: { id } });
  if (!attestation?.fichier) return new Response("Fichier introuvable ou déjà supprimé après vérification.", { status: 404 });
  await journaliser({ acteurId: admin.id, action: "sel.attestation_consultee", cibleType: "AttestationRc", cibleId: id });
  const contenu = await lireFichierPrive(attestation.fichier);
  return new Response(contenu, {
    headers: {
      "Content-Type": attestation.fichierType ?? "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
