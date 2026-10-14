import { getMembreConnecte, supprimerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ACC-4 : signal d'activité envoyé par la page ouverte (saisie d'un long message, lecture…) : repousse l'échéance.
export async function POST() {
  const membre = await getMembreConnecte();
  return Response.json({ connecte: !!membre }, { status: membre ? 200 : 401 });
}

// Déconnexion automatique après 5 minutes sans activité
export async function DELETE() {
  await supprimerSession();
  return new Response(null, { status: 204 });
}
