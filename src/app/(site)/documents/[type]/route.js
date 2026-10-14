import { formatDate } from "@/lib/format";
import { getTextesEnVigueur } from "@/lib/textes";

const TYPES = { statuts: "STATUTS", "reglement-interieur": "REGLEMENT_INTERIEUR", "charte-neutralite": "CHARTE_NEUTRALITE" };

// PRE-2, PRE-5 : chaque texte en vigueur se télécharge (fichier texte, ou le PDF officiel s'il a été fourni)
export async function GET(_request, { params }) {
  const { type } = await params;
  const t = TYPES[type] && (await getTextesEnVigueur([TYPES[type]]))[TYPES[type]];
  if (!t) return new Response("Texte introuvable", { status: 404 });
  if (t.fichierUrl) return Response.redirect(new URL(t.fichierUrl, _request.url), 302);
  const contenu = `${t.titre}\nVersion ${t.version}, en vigueur depuis le ${formatDate(t.enVigueurLe)}\n\n${t.contenu}\n`;
  return new Response(contenu, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-version-${t.version.replace(/[^\w.-]/g, "_")}.txt"`,
    },
  });
}
