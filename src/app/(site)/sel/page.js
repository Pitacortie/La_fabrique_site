import Link from "next/link";
import BlocEditable from "@/components/edition/BlocEditable";
import { getContenus } from "@/lib/contenus";

export const metadata = { title: "Le SEL" };

// SEL-1 : présentation publique. Les bibliothèques, la messagerie et les briques arriveront en phase 2.
export default async function Sel() {
  const textes = await getContenus(["sel.intro"]);
  return (
    <div className="conteneur section">
      <h1>Le SEL</h1>
      <p className="accroche">Service d'échange local : ni grand, ni petit savoir</p>
      <BlocEditable cle="sel.intro" texte={textes["sel.intro"]} className="chapo" />

      <section className="section">
        <h2>Comment ça marche ?</h2>
        <ol className="etapes">
          <li><strong>J'adhère à La Fabrique</strong> et je reçois mon code personnel.</li>
          <li><strong>Je m'inscris au SEL</strong> : attestation d'assurance responsabilité civile, charte et règlement du SEL.</li>
          <li><strong>Je publie ou je réponds</strong> à une annonce, toujours sous mon code : personne ne sait qui je suis.</li>
          <li><strong>On s'organise</strong> par la messagerie, et on lève l'anonymat seulement si on est d'accord tous les deux.</li>
        </ol>
      </section>

      <section>
        <h2>Quelques exemples</h2>
        <div className="grille">
          <div className="carte carte-vert"><h3>Jardin et extérieur</h3><p>Tonte, arrosage pendant une absence, graines et plants.</p></div>
          <div className="carte carte-bleu"><h3>Informatique</h3><p>Prise en main d'un smartphone, installation d'une application.</p></div>
          <div className="carte carte-terracotta"><h3>Maison et bricolage</h3><p>Montage de meubles, aide à un déménagement, couture.</p></div>
          <div className="carte carte-ocre"><h3>Objets</h3><p>Prêt, don ou échange d'outils, de livres, de matériel de camping.</p></div>
        </div>
      </section>

      <section className="section">
        <div className="encart">
          <p>
            <strong>Le SEL ouvrira prochainement.</strong> Il est réservé aux adhérents de La Fabrique à jour de
            cotisation et disposant d'une attestation d'assurance responsabilité civile.
          </p>
          <div className="actions">
            <Link href="/adherer" className="bouton">Adhérer</Link>
            <Link href="/connexion">Déjà adhérent ? Se connecter →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
