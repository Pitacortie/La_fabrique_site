import BibliothequeAnnonces from "../BibliothequeAnnonces";

export const metadata = { title: "Services demandés" };

export default function Demandes({ searchParams }) {
  return <BibliothequeAnnonces type="DEMANDE" searchParams={searchParams} chemin="/sel/demandes" />;
}
