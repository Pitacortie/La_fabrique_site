import Link from "next/link";

export default function NotFound() {
  return (
    <main className="conteneur section">
      <h1>Page introuvable</h1>
      <p>Cette page n'existe pas ou a été déplacée.</p>
      <Link href="/" className="bouton">Retour à l'accueil</Link>
    </main>
  );
}
