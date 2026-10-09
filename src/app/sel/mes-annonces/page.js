import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigerAccesSel } from "@/lib/sel/acces";
import { selectAnnonce } from "@/lib/sel/donnees";
import CarteAnnonce from "../CarteAnnonce";

export const metadata = { title: "Mes annonces" };

export default async function MesAnnonces() {
  const { alias } = await exigerAccesSel("/sel/mes-annonces");
  const annonces = await prisma.annonce.findMany({ where: { auteurId: alias.id }, select: selectAnnonce, orderBy: { createdAt: "desc" } });
  const publiees = annonces.filter((a) => a.statut === "PUBLIEE");
  const autres = annonces.filter((a) => a.statut !== "PUBLIEE");

  return (
    <>
      <div className="coque-entete">
        <h1>Mes annonces</h1>
        <Link href="/sel/annonces/nouvelle" className="bouton">+ Publier une annonce</Link>
      </div>
      {annonces.length === 0 && <p>Vous n'avez pas encore publié d'annonce.</p>}
      {publiees.length > 0 && (
        <section className="section-admin">
          <h2>En ligne ({publiees.length})</h2>
          <div className="grille">{publiees.map((a) => <CarteAnnonce key={a.id} annonce={a} mienne />)}</div>
        </section>
      )}
      {autres.length > 0 && (
        <section className="section-admin">
          <h2>Closes ou masquées ({autres.length})</h2>
          <div className="grille">{autres.map((a) => <CarteAnnonce key={a.id} annonce={a} mienne />)}</div>
        </section>
      )}
    </>
  );
}
