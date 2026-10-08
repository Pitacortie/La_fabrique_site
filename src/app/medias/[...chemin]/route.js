import { readFile } from "node:fs/promises";
import { cheminDepuisUrl } from "@/lib/medias";

// Sert les photos importées depuis la console (dossier uploads/).
export async function GET(_request, { params }) {
  const { chemin } = await params;
  const fichier = cheminDepuisUrl(chemin);
  if (!fichier || !fichier.endsWith(".webp")) return new Response("Introuvable", { status: 404 });
  try {
    const contenu = await readFile(fichier);
    return new Response(contenu, {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
