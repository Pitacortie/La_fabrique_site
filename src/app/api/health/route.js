import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Toujours 200 pour que le déploiement ne dépende pas de la base ; l'état de la base est indiqué.
export async function GET() {
  let db = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "indisponible";
  }
  return Response.json({ statut: "ok", db });
}
