import BibliothequeAnnonces from "./BibliothequeAnnonces";

export const metadata = { title: "Services proposés" };

export default function Offres({ searchParams }) {
  return <BibliothequeAnnonces type="OFFRE" searchParams={searchParams} chemin="/sel" />;
}
