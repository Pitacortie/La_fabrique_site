import { headers } from "next/headers";

// Adresse IP du visiteur, pour la limitation de débit.
// Derrière un proxy (Render, OVH…), X-Forwarded-For vaut « ip-déclarée-par-le-client, …, ip-réelle » :
// seule la DERNIÈRE entrée est ajoutée par le proxy ; les précédentes peuvent être inventées par le client.
export function extraireIp(xForwardedFor) {
  const entrees = (xForwardedFor ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return entrees.at(-1) ?? "local";
}

export async function ipClient() {
  return extraireIp((await headers()).get("x-forwarded-for"));
}
