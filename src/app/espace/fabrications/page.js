import { permanentRedirect } from "next/navigation";

// Ancienne adresse de « Nos initiatives »
export default function AncienneAdresse() {
  permanentRedirect("/espace/initiatives");
}
