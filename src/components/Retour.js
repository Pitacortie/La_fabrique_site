// Message de retour d'une action serveur : { ok: "…" } ou { erreur: "…" }.
export default function Retour({ etat }) {
  if (!etat) return null;
  if (etat.erreur) return <div className="message-erreur" role="alert">{etat.erreur}</div>;
  if (etat.ok) return <div className="message-info" role="status">{etat.ok}</div>;
  return null;
}
