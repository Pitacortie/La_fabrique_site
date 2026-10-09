export const metadata = { title: "Données personnelles" };

export default function Confidentialite() {
  return (
    <div className="conteneur section">
      <h1>Données personnelles</h1>
      <p className="chapo">
        Les coordonnées des adhérents sont réservées à l'usage interne de l'association : aucun usage commercial ou
        personnel, aucune cession à des tiers.
      </p>
      <h2>Ce que nous collectons</h2>
      <p>Les informations du bulletin d'adhésion : identité, coordonnées, date de naissance, choix de droit à l'image, cotisation.</p>
      <h2>Le SEL</h2>
      <p>
        Dans le SEL, vos annonces et vos messages sont enregistrés sous votre code personnel, jamais sous votre nom. Votre
        identité n'est communiquée qu'à la personne avec qui vous échangez, avec votre accord et le sien. Votre
        attestation d'assurance est supprimée dès qu'elle a été vérifiée : seule sa date de validité est conservée.
        Les administrateurs ne lisent une conversation qu'en cas de signalement ou de litige, et chaque lecture est
        enregistrée.
      </p>
      <h2>Vos droits</h2>
      <p>Accès, rectification, effacement, retrait du consentement : écrivez-nous via la page Contacts.</p>
      <h2>Cookies</h2>
      <p>Le site n'utilise qu'un cookie de session, strictement nécessaire à la connexion.</p>
      <p className="refs" style={{ marginTop: "2rem" }}>
        Politique complète à rédiger : finalités, durées de conservation, référent.
      </p>
    </div>
  );
}
