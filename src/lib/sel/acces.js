import { redirect } from "next/navigation";
import { cache } from "react";
import { getMembreConnecte } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { textesAAccepter } from "@/lib/textes";
import { TEXTES_SEL } from "./regles";

const aujourdhui = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// État d'accès au SEL (RG-2, RG-15, SEL-18) : adhérent actif, cotisation à jour, inscription SEL active,
// attestation RC validée et en cours de validité, Charte et Règlement du SEL acceptés dans leur version en vigueur.
export const etatSel = cache(async function etatSel() {
  const membre = await getMembreConnecte();
  if (!membre) return { code: "connexion" };

  const jour = aujourdhui();
  const cotisation = await prisma.cotisation.findFirst({ where: { membreId: membre.id, valideJusquau: { gte: jour } } });
  if (!cotisation) return { code: "cotisation", membre };

  const inscription = await prisma.inscriptionSel.findUnique({ where: { membreId: membre.id } });
  const attestation = await prisma.attestationRc.findFirst({ where: { membreId: membre.id }, orderBy: { createdAt: "desc" } });
  const textes = await textesAAccepter(membre.id, TEXTES_SEL);
  const base = { membre, inscription, attestation, textes };

  if (!inscription) return { code: "inscription", ...base };
  if (inscription.statut === "SUSPENDUE") return { code: "suspendu", ...base };
  if (textes.length) return { code: "textes", ...base };
  if (!attestation || attestation.statut === "REFUSEE") return { code: "attestation", ...base };
  if (attestation.statut === "EN_ATTENTE") return { code: "verification", ...base };
  if (attestation.valideJusquau < jour) return { code: "attestation_expiree", ...base };
  return { code: "ok", ...base, alias: membre.alias };
});

// Toute page ou action du SEL commence par là. Le contrôle est refait à chaque requête (pas seulement dans le layout).
export async function exigerAccesSel(suite = "/sel") {
  const etat = await etatSel();
  if (etat.code === "connexion") redirect(`/connexion?suite=${encodeURIComponent(suite)}`);
  if (etat.code === "cotisation") redirect("/adherer?raison=sel");
  if (etat.code !== "ok") redirect("/sel/inscription");
  // L'alias est relu à chaque fois : le solde doit être à jour
  const alias = await prisma.alias.findUnique({ where: { membreId: etat.membre.id } });
  return { membre: etat.membre, alias };
}

// Pour la page d'inscription : connecté et à jour de cotisation suffisent.
export async function exigerAdherentAJour(suite = "/sel/inscription") {
  const etat = await etatSel();
  if (etat.code === "connexion") redirect(`/connexion?suite=${encodeURIComponent(suite)}`);
  if (etat.code === "cotisation") redirect("/adherer?raison=sel");
  return etat;
}
