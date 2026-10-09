"use server";

import { hash, verify } from "@node-rs/argon2";
import { ipClient } from "@/lib/requete";
import { redirect } from "next/navigation";
import { z } from "zod";
import { creerSession, supprimerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { compterEchec, estBloque, reinitialiser } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  motDePasse: z.string().min(1).max(200),
  suite: z.string().optional(),
});

// CON-2 : même message que l'identifiant ou le mot de passe soit faux.
const ERREUR_IDENTIFIANTS = "Adresse e-mail ou mot de passe incorrect.";

// Hachage factice : la vérification prend le même temps qu'un compte existe ou non.
const hachageFactice = hash("mot-de-passe-factice");

// N'accepte qu'un chemin interne comme destination après connexion (pas de redirection ouverte).
function destinationSure(suite) {
  return suite && suite.startsWith("/") && !suite.startsWith("//") ? suite : "/espace/fabrications";
}

export async function seConnecter(_etat, formData) {
  const donnees = schema.safeParse({
    email: formData.get("email"),
    motDePasse: formData.get("motDePasse"),
    suite: formData.get("suite") || undefined,
  });
  if (!donnees.success) return { erreur: ERREUR_IDENTIFIANTS };
  const { email, motDePasse, suite } = donnees.data;

  const ip = await ipClient();
  // Deux limites, qui ne comptent que les échecs : 5 par IP et par compte, et 20 par compte toutes IP
  // confondues (attaque répartie sur plusieurs adresses). Fenêtre de 15 minutes.
  const FENETRE = { fenetreMs: 15 * 60 * 1000 };
  const cleIp = `connexion:${ip}:${email}`;
  const cleCompte = `connexion-compte:${email}`;
  if (estBloque(cleIp, { max: 5 }) || estBloque(cleCompte, { max: 20 })) {
    return { erreur: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  const membre = await prisma.membre.findUnique({ where: { email } });
  const valide = await verify(membre?.motDePasseHash ?? (await hachageFactice), motDePasse);
  if (!membre || !membre.motDePasseHash || !valide) {
    compterEchec(cleIp, FENETRE);
    compterEchec(cleCompte, FENETRE);
    return { erreur: ERREUR_IDENTIFIANTS };
  }

  // CON-4 : compte suspendu ou clôturé, message neutre.
  if (membre.statut !== "ACTIF") {
    return { erreur: "Ce compte ne permet pas de se connecter pour le moment. Contactez l'association." };
  }

  reinitialiser(cleIp);
  reinitialiser(cleCompte);
  await prisma.membre.update({ where: { id: membre.id }, data: { derniereConnexion: new Date() } });
  await creerSession(membre.id, { resterConnecte: formData.get("resterConnecte") === "on" });
  redirect(destinationSure(suite));
}

// CON-5 / ACC-4 : « Sortir » déconnecte et ramène à l'accueil.
export async function seDeconnecter() {
  await supprimerSession();
  redirect("/");
}
