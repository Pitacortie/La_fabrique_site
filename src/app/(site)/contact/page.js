import Link from "next/link";
import BlocEditable from "@/components/edition/BlocEditable";
import { getContenus } from "@/lib/contenus";
import { site } from "@/lib/site";

export const metadata = { title: "Contacts" };

// CTC-1 : formulaire + téléphone. L'envoi (MessageContact + courriel) sera branché à l'étape « Contacts ».
export default async function Contact() {
  const c = await getContenus(["site.telephone", "site.email", "site.siege"]);
  return (
    <div className="conteneur section">
      <h1>Contacts</h1>
      <p className="chapo">
        Une question, une attente, un projet pour Ménesplet ? Écrivez-nous. Pour devenir membre, passez par la page{" "}
        <Link href="/adherer">Adhérer</Link>.
      </p>

      <div className="grille" style={{ alignItems: "start" }}>
        <form className="formulaire">
          <fieldset>
            <legend>Votre message</legend>
            <div className="champs">
              <div className="champ">
                <label htmlFor="nom">Nom et prénom <span className="obligatoire">*</span></label>
                <input id="nom" name="nom" type="text" required autoComplete="name" />
              </div>
              <div className="champ">
                <label htmlFor="email">Adresse e-mail <span className="obligatoire">*</span></label>
                <input id="email" name="email" type="email" required autoComplete="email" />
              </div>
            </div>
            <div className="champ" style={{ marginTop: "1rem" }}>
              <label htmlFor="sujet">Objet</label>
              <select id="sujet" name="sujet" defaultValue="question">
                <option value="question">Une question</option>
                <option value="projet">Vos attentes, vos projets</option>
                <option value="adhesion">Mon adhésion</option>
                <option value="image">Retrait d'une photo (droit à l'image)</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="champ" style={{ marginTop: "1rem" }}>
              <label htmlFor="texte">Message <span className="obligatoire">*</span></label>
              <textarea id="texte" name="texte" required />
            </div>
          </fieldset>
          <div className="actions">
            <button type="submit" className="bouton" disabled>Envoyer (bientôt actif)</button>
          </div>
        </form>

        <aside className="carte carte-terracotta">
          <h3>Nous trouver</h3>
          <p><strong>{site.nom}</strong></p>
          <BlocEditable cle="site.siege" texte={c["site.siege"]} />
          <div className="coordonnee">
            Téléphone : <BlocEditable cle="site.telephone" texte={c["site.telephone"]} ligne />
          </div>
          <div className="coordonnee">
            Courriel : <BlocEditable cle="site.email" texte={c["site.email"]} ligne />
          </div>
        </aside>
      </div>
    </div>
  );
}
