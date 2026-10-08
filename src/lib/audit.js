import { prisma } from "@/lib/db";

// ADM-8 : trace des actions sensibles (qui, quoi, sur quoi, pourquoi).
export function journaliser({ acteurId, action, cibleType, cibleId, motif, details }) {
  return prisma.journalAudit.create({
    data: { acteurId, action, cibleType, cibleId, motif, details },
  });
}
