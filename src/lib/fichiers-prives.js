import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

// Stockage des fichiers PRIVÉS (attestations d'assurance) : hors du dossier des photos publiques,
// jamais servis directement ; seuls les administrateurs y accèdent, par une route contrôlée et journalisée.
export const DOSSIER_PRIVE = path.resolve(process.env.PRIVATE_UPLOADS_DIR || path.join(process.cwd(), "prive"));

const TYPES = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" };
export const TAILLE_MAX_PRIVE = 5 * 1024 * 1024;

// Vérifie les premiers octets du fichier : on ne se fie pas au type annoncé par le navigateur.
function signatureValide(buffer, type) {
  if (type === "application/pdf") return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
  if (type === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  return false;
}

export async function enregistrerFichierPrive(fichier, sousDossier) {
  const extension = TYPES[fichier.type];
  if (!extension) throw new Error("Format accepté : PDF, JPEG ou PNG.");
  if (fichier.size > TAILLE_MAX_PRIVE) throw new Error("Fichier trop lourd (5 Mo maximum).");
  const contenu = Buffer.from(await fichier.arrayBuffer());
  if (!signatureValide(contenu, fichier.type)) throw new Error("Le fichier ne correspond pas à son format.");

  const dossier = path.join(DOSSIER_PRIVE, sousDossier);
  await mkdir(dossier, { recursive: true });
  const nom = `${randomBytes(16).toString("hex")}${extension}`;
  await writeFile(path.join(dossier, nom), contenu);
  return { chemin: `${sousDossier}/${nom}`, type: fichier.type };
}

function resoudre(chemin) {
  const complet = path.resolve(DOSSIER_PRIVE, chemin);
  if (!complet.startsWith(DOSSIER_PRIVE + path.sep)) throw new Error("Chemin invalide.");
  return complet;
}

export const lireFichierPrive = (chemin) => readFile(resoudre(chemin));
export const supprimerFichierPrive = (chemin) => unlink(resoudre(chemin)).catch(() => {});
