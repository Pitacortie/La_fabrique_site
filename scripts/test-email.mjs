// Envoie un courriel de test avec la configuration SMTP du fichier .env : npm run email:test -- moi@exemple.fr
// Sert à vérifier les identifiants Brevo (ou d'un autre fournisseur) avant de tester les vrais parcours.
import nodemailer from "nodemailer";

const destinataire = process.argv[2];
if (!destinataire) {
  console.error("Indiquez l'adresse de test : npm run email:test -- moi@exemple.fr");
  process.exit(1);
}
const { SMTP_HOST, SMTP_PORT = "587", SMTP_USER, SMTP_PASSWORD, MAIL_FROM } = process.env;
if (!SMTP_HOST) {
  console.error("SMTP_HOST est vide dans .env : les courriels ne partent pas (ils s'affichent dans le terminal).");
  process.exit(1);
}

const transport = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465,
  auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
});

try {
  console.log(`Connexion à ${SMTP_HOST}:${SMTP_PORT} avec ${SMTP_USER || "(sans identifiant)"}…`);
  await transport.verify();
  console.log("✓ Identifiants acceptés.");
  const info = await transport.sendMail({
    from: MAIL_FROM,
    to: destinataire,
    subject: "Test d'envoi : La Fabrique de Ménesplet",
    text: "Si vous lisez ce message, l'envoi des courriels du site fonctionne.\n\nLa Fabrique de Ménesplet",
  });
  console.log(`✓ Courriel envoyé à ${destinataire} (expéditeur : ${MAIL_FROM}).`);
  console.log(`  Réponse du serveur : ${info.response}`);
  console.log("  Vérifiez la boîte de réception, et les indésirables.");
} catch (e) {
  console.error(`✗ Échec : ${e.message}`);
  if (/auth|credentials|535/i.test(e.message)) console.error("  → Identifiant ou clé SMTP incorrects (Brevo › SMTP & API).");
  if (/sender|from|not.*valid/i.test(e.message)) console.error("  → L'adresse d'expédition (MAIL_FROM) n'est pas autorisée chez Brevo : authentifiez le domaine.");
  process.exit(1);
}
