import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Fin de la période de cotisation en cours : 31 décembre (année civile, règlement art. 3).
function finAnneeCivile() {
  return new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
}

export default async function TableauDeBord({ searchParams }) {
  const { refus } = await searchParams;
  const admin = await exigerAdmin();
  const [demandes, membres, aRenouveler, messages] = await Promise.all([
    prisma.demandeAdhesion.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.membre.count({ where: { statut: "ACTIF" } }),
    prisma.membre.count({
      where: { statut: "ACTIF", cotisations: { none: { valideJusquau: { gt: finAnneeCivile() } } } },
    }),
    prisma.messageContact.count({ where: { statut: "NOUVEAU" } }),
  ]);

  const indicateurs = [
    { valeur: demandes, libelle: "Demandes en attente", href: "/admin/demandes" },
    { valeur: membres, libelle: "Membres actifs", href: "/admin/membres" },
    { valeur: aRenouveler, libelle: "Cotisations à renouveler avant le 31 janvier", href: "/admin/cotisations" },
    { valeur: messages, libelle: "Messages non traités", href: "/admin/messages" },
  ];

  return (
    <>
      <div className="coque-entete">
        <h1>Tableau de bord</h1>
        <span className="meta">Connecté en tant que {admin.role === "BUREAU" ? "membre du Bureau" : "administrateur"}</span>
      </div>
      {refus === "publication" && (
        <div className="message-erreur" role="alert">
          Publier des actualités est réservé au Bureau et aux administrateurs mandatés (ADM-18).
        </div>
      )}
      <div className="stats">
        {indicateurs.map((i) => (
          <Link key={i.libelle} href={i.href} className="stat" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="valeur">{i.valeur}</div>
            <div className="libelle">{i.libelle}</div>
          </Link>
        ))}
      </div>

      <section className="carte carte-terracotta" style={{ marginBottom: "1.5rem" }}>
        <h2>Modifier le site</h2>
        <p>
          Les textes des pages et les services « Nos Fabrications » se modifient directement sur le site : naviguez
          sur les pages publiques et cliquez sur les crayons ✏️. Le bouton « Aperçu visiteur » de la barre en bas de
          l'écran masque les crayons pour voir la page comme le public.
        </p>
        <Link href="/" className="bouton">Aller sur le site ✏️</Link>
      </section>

      <section className="carte">
        <h2>Parcours d'une adhésion</h2>
        <ol className="etapes">
          <li>Le postulant dépose sa demande en ligne : elle arrive dans <Link href="/admin/demandes">Demandes</Link>.</li>
          <li>Il règle sa cotisation hors du site.</li>
          <li>Un membre du Bureau valide et enregistre la cotisation : le compte, le code et le lien d'activation sont créés.</li>
        </ol>
      </section>
    </>
  );
}
