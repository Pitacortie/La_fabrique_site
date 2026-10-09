import { prisma } from "@/lib/db";

// Conversation dont l'alias fait partie, sinon null (MSG-11 : personne d'autre ne lit le fil).
// Volontairement HORS d'un fichier « use server » : elle ne doit pas pouvoir être appelée depuis un navigateur.
export async function conversationDe(id, aliasId) {
  if (!id || !aliasId) return null;
  const c = await prisma.conversation.findUnique({ where: { id }, include: { annonce: true } });
  return c && (c.auteurId === aliasId || c.interlocuteurId === aliasId) ? c : null;
}
