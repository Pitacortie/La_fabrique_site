import Link from "next/link";
import BlocEditable from "@/components/edition/BlocEditable";
import { getContenus } from "@/lib/contenus";

export const metadata = { title: "Présentation" };

export default async function Presentation() {
  const textes = await getContenus(["presentation.qui", "presentation.neutralite"]);
  return (
    <div className="conteneur section">
      <h1>Présentation</h1>
      <p className="accroche">Un collectif citoyen au service de la commune</p>

      <section>
        <h2>Qui sommes-nous ?</h2>
        <BlocEditable cle="presentation.qui" texte={textes["presentation.qui"]} className="chapo" />
      </section>

      <section className="section">
        <h2>Notre objet</h2>
        <div className="grille">
          <div className="carte carte-bleu"><h3>Porter la parole</h3><p>Porter la parole des habitants et soutenir les initiatives citoyennes.</p></div>
          <div className="carte carte-terracotta"><h3>Vivre ensemble</h3><p>Organiser événements, ateliers et rencontres pour dynamiser la vie locale.</p></div>
          <div className="carte carte-vert"><h3>Solidarité</h3><p>Mener des actions de solidarité, d'entraide et d'accès aux droits.</p></div>
          <div className="carte carte-ocre"><h3>Générations</h3><p>Créer des liens intergénérationnels et encourager la participation.</p></div>
        </div>
      </section>

      <section>
        <h2>Neutralité et indépendance</h2>
        <div className="encart">
          <BlocEditable cle="presentation.neutralite" texte={textes["presentation.neutralite"]} />
        </div>
      </section>

      <section className="section">
        <h2>Comment fonctionne l'association ?</h2>
        <dl className="liste-def">
          <dt>Membres</dt>
          <dd>Fondateurs, actifs, adhérents (sympathisants) et bienfaiteurs. Fondateurs et membres actifs votent en assemblée générale.</dd>
          <dt>Conseil d'administration</dt>
          <dd>Six à douze membres : les six fondateurs et jusqu'à six membres élus pour deux ans.</dd>
          <dt>Bureau</dt>
          <dd>Président (ou co-présidence), trésorier, secrétaire : la gestion courante.</dd>
          <dt>Cotisation</dt>
          <dd>Un euro minimum par personne et par année civile.</dd>
        </dl>
      </section>

      <section>
        <h2>Nos textes</h2>
        <p>Les statuts, le règlement intérieur et la charte de neutralité et de participation sont consultables en ligne.</p>
        <div className="actions">
          <Link href="/documents" className="bouton bouton-secondaire">Lire les textes</Link>
          <Link href="/adherer" className="bouton">Adhérer</Link>
          <Link href="/contact">Nous contacter →</Link>
        </div>
      </section>
    </div>
  );
}
