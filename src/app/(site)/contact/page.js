import Link from "next/link";
import BlocEditable from "@/components/edition/BlocEditable";
import { getMembreConnecte, peutEditerSite } from "@/lib/auth";
import { getContenus } from "@/lib/contenus";
import { SUJETS_CONTACT, site } from "@/lib/site";
import FormulaireContact from "./FormulaireContact";

export const metadata = { title: "Contacts" };

// CTC-1 : formulaire + téléphone. « ?sujet=projet » préselectionne l'objet (PRJ-2 : « Vos attentes » pour les non-adhérents).
export default async function Contact({ searchParams }) {
  const { sujet = "question" } = await searchParams;
  const membre = await getMembreConnecte();
  const c = await getContenus(["site.telephone", "site.email", "site.siege", "site.facebook", "site.instagram"]);
  const edition = await peutEditerSite();
  return (
    <div className="conteneur section">
      <h1>Contacts</h1>
      <p className="chapo">
        Une question, une attente, un projet pour Ménesplet ? Écrivez-nous. Pour devenir membre, passez par la page{" "}
        <Link href="/adherer">Adhérer</Link>.
      </p>

      <div className="grille" style={{ alignItems: "start" }}>
        <div>
          <FormulaireContact nom={membre ? `${membre.prenom} ${membre.nom}` : ""} email={membre?.email ?? ""} sujet={SUJETS_CONTACT[sujet] ? sujet : "question"} />
        </div>

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
          {[
            ["site.facebook", "Facebook"],
            ["site.instagram", "Instagram"],
          ].map(([cle, nom]) =>
            edition ? (
              <div key={cle} className="coordonnee">
                {nom} : <BlocEditable cle={cle} texte={c[cle]} ligne />
              </div>
            ) : (
              c[cle] && (
                <div key={cle} className="coordonnee">
                  <a href={c[cle]} rel="noopener noreferrer">{nom}</a>
                </div>
              )
            ),
          )}
        </aside>
      </div>
    </div>
  );
}
