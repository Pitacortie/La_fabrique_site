// Modèles des courriels : une version texte (lisible partout) et une version HTML aux couleurs de la charte.
// Les valeurs insérées dans le HTML sont échappées.

const echapper = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function gabarit({ titre, paragraphes, bouton, apres = [] }) {
  const p = (t) => `<p style="margin:0 0 16px;line-height:1.6">${echapper(t)}</p>`;
  return `<!doctype html>
<html lang="fr"><body style="margin:0;background:#FAF6EF;font-family:Montserrat,Arial,sans-serif;color:#2B2620">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EF;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;border-top:6px solid #3B7A96">
        <tr><td style="padding:28px 28px 8px">
          <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#B35A38;font-weight:bold">La Fabrique de Ménesplet</div>
          <h1 style="font-size:22px;color:#3B7A96;margin:8px 0 20px">${echapper(titre)}</h1>
          ${paragraphes.map(p).join("\n")}
          ${
            bouton
              ? `<p style="margin:24px 0"><a href="${echapper(bouton.lien)}" style="background:#3B7A96;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;display:inline-block">${echapper(bouton.texte)}</a></p>
          <p style="margin:0 0 16px;font-size:13px;color:#5c4a3d;line-height:1.5">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><span style="word-break:break-all">${echapper(bouton.lien)}</span></p>`
              : ""
          }
          ${apres.map(p).join("\n")}
        </td></tr>
        <tr><td style="padding:16px 28px 24px;font-size:12px;color:#5c4a3d;border-top:1px solid #e6dccb">
          Association loi 1901 · courriel automatique, merci de ne pas y répondre.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// CON-3 : mot de passe oublié
export function emailReinitialisation({ prenom, lien, dureeMinutes }) {
  const intro = `Bonjour ${prenom},`;
  const corps = "Vous avez demandé à réinitialiser le mot de passe de votre compte. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.";
  const validite = `Ce lien est valable ${dureeMinutes} minutes et ne peut servir qu'une fois.`;
  const ignorer = "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste inchangé.";
  return {
    sujet: "Réinitialisation de votre mot de passe",
    texte: `${intro}\n\n${corps}\n\n${lien}\n\n${validite}\n\n${ignorer}\n\nLa Fabrique de Ménesplet`,
    html: gabarit({
      titre: "Choisir un nouveau mot de passe",
      paragraphes: [intro, corps],
      bouton: { texte: "Choisir un nouveau mot de passe", lien },
      apres: [validite, ignorer],
    }),
  };
}

// Alerte de sécurité après chaque changement de mot de passe
export function emailMotDePasseModifie({ prenom, lienContact }) {
  const intro = `Bonjour ${prenom},`;
  const corps = "Le mot de passe de votre compte La Fabrique de Ménesplet vient d'être modifié.";
  const alerte = "Si ce n'est pas vous, contactez l'association au plus vite.";
  return {
    sujet: "Votre mot de passe a été modifié",
    texte: `${intro}\n\n${corps}\n\n${alerte}\n${lienContact}\n\nLa Fabrique de Ménesplet`,
    html: gabarit({ titre: "Mot de passe modifié", paragraphes: [intro, corps, alerte], bouton: { texte: "Contacter l'association", lien: lienContact } }),
  };
}
