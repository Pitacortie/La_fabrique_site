import { readFile } from "node:fs/promises";
import { cheminDepuisUrl } from "@/lib/medias";

// Sert les photos (WebP) et les numéros de la gazette (PDF) importés depuis la console (dossier uploads/).
const TYPES = { ".webp": "image/webp", ".pdf": "application/pdf" };

export async function GET(_request, { params }) {
  const { chemin } = await params;
  const fichier = cheminDepuisUrl(chemin);
  const type = fichier && TYPES[fichier.slice(fichier.lastIndexOf("."))];
  if (!type) return new Response("Introuvable", { status: 404 });
  try {
    const contenu = await readFile(fichier);
    return new Response(contenu, {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
