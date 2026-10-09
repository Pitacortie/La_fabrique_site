import Link from "next/link";
import { formatDate } from "@/lib/format";
import { etatSel } from "@/lib/sel/acces";

// Encadré du profil : où en est l'adhérent avec le SEL, et le bon bouton pour continuer.
export default async function CarteSel() {
  const etat = await etatSel();

  const contenu = {
    ok: {
      texte: (
        <>
          Votre solde : <strong>🧱 {etat.alias?.soldeBriques ?? 0} brique{Math.abs(etat.alias?.soldeBriques ?? 0) > 1 ? "s" : ""}</strong>. Votre
          assurance est enregistrée jusqu'au {etat.attestation && formatDate(etat.attestation.valideJusquau)}.
        </>
      ),
      lien: { href: "/sel", texte: "Ouvrir le SEL" },
    },
    inscription: {
      texte: "Échangez services et objets avec les autres adhérents, sans argent : 1 minute de service = 1 brique.",
      lien: { href: "/sel/inscription", texte: "Rejoindre le SEL" },
    },
    textes: { texte: "La Charte ou le Règlement du SEL ont changé : acceptez la nouvelle version pour continuer.", lien: { href: "/sel/inscription", texte: "Lire et accepter" } },
    verification: { texte: "Votre inscription est enregistrée : votre attestation d'assurance est en cours de vérification par le Bureau.", lien: null },
    attestation: { texte: "Votre attestation d'assurance n'a pas pu être validée : déposez-en une nouvelle.", lien: { href: "/sel/inscription", texte: "Déposer une attestation" } },
    attestation_expiree: { texte: "Votre attestation d'assurance a expiré : déposez la nouvelle pour retrouver l'accès au SEL.", lien: { href: "/sel/inscription", texte: "Déposer une attestation" } },
    suspendu: { texte: "Votre accès au SEL est suspendu. Votre solde de briques est conservé.", lien: { href: "/contact", texte: "Contacter l'association" } },
    cotisation: { texte: "Le SEL est réservé aux adhérents à jour de leur cotisation.", lien: { href: "/adherer?raison=sel", texte: "Renouveler ma cotisation" } },
  }[etat.code];
  if (!contenu) return null;

  return (
    <section className="carte carte-terracotta" style={{ marginBottom: "1.5rem" }}>
      <h2>Le SEL</h2>
      <p>{contenu.texte}</p>
      <div className="actions">
        {contenu.lien && <Link href={contenu.lien.href} className="bouton">{contenu.lien.texte}</Link>}
        <Link href="/le-sel">Comment ça marche ?</Link>
      </div>
    </section>
  );
}
