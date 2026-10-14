import { prisma } from "@/lib/db";

// Conversation dont l'alias fait partie, sinon null (MSG-11 : personne d'autre ne lit le fil).
// Volontairement HORS d'un fichier « use server » : elle ne doit pas pouvoir être appelée depuis un navigateur.
export async function conversationDe(id, aliasId) {
  if (!id || !aliasId) return null;
  const c = await prisma.conversation.findUnique({ where: { id }, include: { annonce: true } });
  return c && (c.auteurId === aliasId || c.interlocuteurId === aliasId) ? c : null;
}

// RG-14 : la levée d'anonymat est obligatoire dès qu'un mineur est concerné par l'échange
export async function mineurConcerne(conversation) {
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - 18);
  const mineurs = await prisma.alias.count({
    where: { id: { in: [conversation.auteurId, conversation.interlocuteurId] }, membre: { dateNaissance: { gt: limite } } },
  });
  return mineurs > 0;
}
