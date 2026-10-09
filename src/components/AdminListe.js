// Page de liste de la console : titre, description, colonnes et état vide.
// Les lignes viendront de Prisma quand chaque écran sera branché.
export default function AdminListe({ titre, description, colonnes, vide, action }) {
  return (
    <>
      <div className="coque-entete">
        <h1>{titre}</h1>
        {action && (
          <button type="button" className="bouton" disabled>
            {action}
          </button>
        )}
      </div>
      {description && <p className="chapo">{description}</p>}
      <div className="tableau-conteneur">
        <table>
          <thead>
            <tr>
              {colonnes.map((c) => (
                <th key={c} scope="col">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="vide" colSpan={colonnes.length}>{vide}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
