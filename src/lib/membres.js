import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Ce que le membre a laissé dans la vie de l'association, et qui concerne d'autres personnes.
export async function historiqueMembre(membreId) {
  const alias = await prisma.alias.findUnique({ where: { membreId } });
  const aliasId = alias?.id ?? "aucun";
  const [transactions, echanges, messages, conversations, articles, cotisationsSaisies] = await Promise.all([
    prisma.transactionBriques.count({ where: { OR: [{ debiteId: aliasId }, { crediteId: aliasId }] } }),
    prisma.echange.count({ where: { OR: [{ beneficiaireId: aliasId }, { prestataireId: aliasId }] } }),
    prisma.message.count({ where: { emetteurId: aliasId } }),
    prisma.conversation.count({ where: { OR: [{ auteurId: aliasId }, { interlocuteurId: aliasId }] } }),
    prisma.article.count({ where: { auteurId: membreId } }),
    prisma.cotisation.count({ where: { saisieParId: membreId, membreId: { not: membreId } } }),
  ]);
  const total = transactions + echanges + messages + conversations + articles + cotisationsSaisies;
  return { alias, transactions, echanges, messages, conversations, articles, cotisationsSaisies, vide: total === 0 };
}

// Suppression complète : uniquement pour un membre sans historique partagé (compte de test, jamais utilisé).
async function supprimerCompletement(membreId, alias) {
  await prisma.$transaction(async (tx) => {
    if (alias) {
      await tx.signalementSel.deleteMany({ where: { OR: [{ signaleurId: alias.id }, { annonce: { auteurId: alias.id } }] } });
      await tx.annonce.deleteMany({ where: { auteurId: alias.id } });
    }
    await tx.acceptation.deleteMany({ where: { OR: [{ membreId }, { demande: { membreId } }] } });
    await tx.demandeAdhesion.deleteMany({ where: { membreId } });
    await tx.cotisation.deleteMany({ where: { membreId } });
    await tx.signalementBug.updateMany({ where: { membreId }, data: { membreId: null } });
    // Traces d'administration conservées, détachées de la personne
    await tx.journalAudit.updateMany({ where: { acteurId: membreId }, data: { acteurId: null } });
    await tx.contenuEditorial.updateMany({ where: { modifieParId: membreId }, data: { modifieParId: null } });
    await tx.demandeAdhesion.updateMany({ where: { decideParId: membreId }, data: { decideParId: null } });
    // Sessions, liens, inscription au SEL et alias sont supprimés en cascade
    await tx.membre.delete({ where: { id: membreId } });
  });
}

// Anonymisation : l'identité est effacée, le compte clôturé ; l'historique partagé (échanges, briques, messages)
// reste cohérent pour les autres membres, sous le seul code de la personne. Le solde rejoint le compte de solidarité (RG-17).
async function anonymiser(membreId, alias) {
  const maintenant = new Date();
  await prisma.$transaction(async (tx) => {
    if (alias) {
      const a = await tx.alias.findUnique({ where: { id: alias.id } });
      if (a.soldeBriques !== 0) {
        await tx.transactionBriques.create({
          data:
            a.soldeBriques > 0
              ? { montant: a.soldeBriques, debiteId: a.id, crediteId: null, libelle: "Clôture du compte : solde versé au compte de solidarité" }
              : { montant: -a.soldeBriques, debiteId: null, crediteId: a.id, libelle: "Clôture du compte : solde négatif repris par le compte de solidarité" },
        });
        await tx.alias.update({ where: { id: a.id }, data: { soldeBriques: 0 } });
      }
      await tx.annonce.updateMany({ where: { auteurId: a.id, statut: "PUBLIEE" }, data: { statut: "CLOTUREE" } });
      await tx.echange.updateMany({
        where: { OR: [{ beneficiaireId: a.id }, { prestataireId: a.id }], statut: { in: ["PROPOSE", "CONFIRME"] } },
        data: { statut: "ANNULE", motifAnnulation: "Compte clôturé" },
      });
      await tx.conversation.updateMany({
        where: { OR: [{ auteurId: a.id }, { interlocuteurId: a.id }], statut: "OUVERTE" },
        data: { statut: "FERMEE", fermeeParId: a.id },
      });
    }
    await tx.inscriptionSel.updateMany({ where: { membreId }, data: { statut: "SUSPENDUE", motifSuspension: "Compte clôturé", assuranceRc: Prisma.DbNull } });
    // La demande d'adhésion contient l'identité complète : supprimée ; les acceptations (preuves) restent liées au membre
    await tx.acceptation.deleteMany({ where: { membreId: null, demande: { membreId } } });
    await tx.acceptation.updateMany({ where: { demande: { membreId } }, data: { demandeId: null } });
    await tx.demandeAdhesion.deleteMany({ where: { membreId } });
    await tx.session.deleteMany({ where: { membreId } });
    await tx.jeton.deleteMany({ where: { membreId } });
    await tx.membre.update({
      where: { id: membreId },
      data: {
        email: `supprime-${membreId}@membre-supprime.invalid`,
        nom: "Membre supprimé",
        prenom: "",
        motDePasseHash: null,
        dateNaissance: null,
        adresse: null,
        codePostal: null,
        commune: null,
        telephone: null,
        responsableNom: null,
        responsableLien: null,
        responsableTelephone: null,
        droitImage: false,
        role: "ADHERENT",
        statut: "CLOTURE",
        motifStatut: `Supprimé le ${maintenant.toLocaleDateString("fr-FR")}`,
      },
    });
  });
}

// Supprime le membre s'il n'a aucun historique partagé, sinon l'anonymise. Renvoie la méthode employée.
export async function supprimerMembre(membreId) {
  const h = await historiqueMembre(membreId);
  if (h.vide) {
    await supprimerCompletement(membreId, h.alias);
    return { methode: "suppression", alias: h.alias?.code ?? null };
  }
  await anonymiser(membreId, h.alias);
  return { methode: "anonymisation", alias: h.alias?.code ?? null };
}
