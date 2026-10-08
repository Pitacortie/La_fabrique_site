import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";

// Les photos sont stockées sur le disque, dans « uploads/ » (hors dépôt git), et servies par /medias/…
// En production, ce dossier devra être sur un disque persistant (ou un stockage objet).
export const DOSSIER_UPLOADS = path.join(process.cwd(), "uploads");

const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];
export const TAILLE_MAX = 10 * 1024 * 1024;

// ACT-9 : redimensionnée (1600 px max) et compressée en WebP à l'import.
export async function enregistrerImage(fichier, sousDossier) {
  if (!TYPES_ACCEPTES.includes(fichier.type)) throw new Error("Format accepté : JPEG, PNG ou WebP.");
  if (fichier.size > TAILLE_MAX) throw new Error("Image trop lourde (10 Mo maximum).");

  const entree = Buffer.from(await fichier.arrayBuffer());
  const sortie = await sharp(entree)
    .rotate() // respecte l'orientation des photos de téléphone
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const nom = `${randomBytes(12).toString("hex")}.webp`;
  const dossier = path.join(DOSSIER_UPLOADS, sousDossier);
  await mkdir(dossier, { recursive: true });
  await writeFile(path.join(dossier, nom), sortie);
  return `/medias/${sousDossier}/${nom}`;
}

export async function supprimerImage(url) {
  const chemin = cheminDepuisUrl(url.replace(/^\/medias\//, "").split("/"));
  if (chemin) await unlink(chemin).catch(() => {});
}

// Résout un chemin demandé en restant strictement dans le dossier uploads (pas de « ../ »).
export function cheminDepuisUrl(segments) {
  const chemin = path.resolve(DOSSIER_UPLOADS, ...segments);
  return chemin.startsWith(DOSSIER_UPLOADS + path.sep) ? chemin : null;
}
