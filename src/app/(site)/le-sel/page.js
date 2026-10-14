import Link from "next/link";
import BlocEditable from "@/components/edition/BlocEditable";
import { getContenus } from "@/lib/contenus";
import { prisma } from "@/lib/db";
import { etatSel } from "@/lib/sel/acces";
import { filtreAnnoncesVisibles } from "@/lib/sel/donnees";

export const metadata = { title: "Le SEL" };

const COULEURS = ["vert", "bleu", "terracotta", "ocre"];

// Présentation publique du SEL (SEL-1) et porte d'entrée vers l'espace SEL (/sel), réservé aux adhérents.
export default async function Sel() {
  const [textes, rubriques, nbAnnonces, etat] = await Promise.all([
    getContenus(["sel.intro", "sel.fonctionnement", "sel.echanges", "sel.plus", "sel.citation"]),
    prisma.rubriqueSel.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }).catch(() => []),
    prisma.annonce.count({ where: filtreAnnoncesVisibles() }).catch(() => 0),
    etatSel(),
  ]);

  // Bouton principal selon la situation de la personne
  const entree = {
    ok: { href: "/sel", texte: "Entrer dans le SEL" },
    inscription: { href: "/sel/inscription", texte: "M'inscrire au SEL" },
    textes: { href: "/sel/inscription", texte: "Accepter les nouveaux textes du SEL" },
    assurance: { href: "/sel/inscription", texte: "Déclarer mon assurance responsabilité civile" },
    suspendu: { href: "/sel/inscription", texte: "Voir mon accès au SEL" },
    cotisation: { href: "/adherer?raison=sel", texte: "Renouveler ma cotisation" },
    connexion: { href: "/sel", texte: "Entrer dans le SEL" },
  }[etat.code];

  return (
    <div className="conteneur section">
      <h1>Le SEL</h1>
      <p className="accroche">Échanger autrement, près de chez soi</p>
      <BlocEditable cle="sel.intro" texte={textes["sel.intro"]} className="chapo" />
      <div className="actions">
        <Link href={entree.href} className="bouton">{entree.texte}</Link>
        {etat.code === "connexion" && <Link href="/adherer">Pas encore adhérent ? Adhérer →</Link>}
        {nbAnnonces > 0 && <span className="meta">{nbAnnonces} annonce{nbAnnonces > 1 ? "s" : ""} en ligne en ce moment</span>}
      </div>

      <section className="section">
        <h2>Comment fonctionne le SEL ?</h2>
        <BlocEditable cle="sel.fonctionnement" texte={textes["sel.fonctionnement"]} />
      </section>

      <section className="section">
        <h2>En pratique</h2>
        <ol className="etapes">
          <li><strong>J'adhère à La Fabrique</strong> et je reçois mon code personnel (par exemple FAB-7KQ2XM).</li>
          <li><strong>Je m'inscris au SEL</strong> : j'accepte la Charte et le Règlement du SEL et je déclare mon assurance responsabilité civile.</li>
          <li><strong>Je publie une annonce</strong> (je propose ou je demande un service, un prêt, un don, un objet) <strong>ou je réponds</strong> à celle d'un autre membre.</li>
          <li><strong>On s'organise par la messagerie</strong>, toujours sous nos codes. Pour se rencontrer en personne, chacun accepte de révéler son identité ; sinon, l'échange se fait à distance.</li>
          <li><strong>On fixe le rendez-vous</strong> : la personne qui reçoit le service propose une date et un lieu, l'autre confirme.</li>
          <li><strong>Après le service</strong>, celui qui l'a rendu indique le temps passé, l'autre confirme : les briques sont transférées.</li>
        </ol>
      </section>

      <section className="grille" style={{ alignItems: "start" }}>
        <div className="carte carte-terracotta">
          <h2>Les briques</h2>
          <p>
            <strong>1 minute de service = 1 brique</strong>, quel que soit le service : une heure de jardinage vaut une heure
            de cours d'informatique. Pour un objet, la valeur est fixée par celui qui le propose, et peut se discuter.
          </p>
          <p>
            Tout le monde commence à zéro. Le solde peut être négatif : on peut recevoir avant de donner. Un compte de
            solidarité, alimenté par des dons de briques, permet aussi d'aider un membre en difficulté.
          </p>
        </div>
        <div className="carte carte-bleu">
          <h2>Votre anonymat</h2>
          <p>
            Dans le SEL, vous apparaissez sous votre code, jamais sous votre nom. Votre identité (nom, prénom et adresse)
            n'est révélée qu'à la personne avec qui vous échangez, et seulement si vous êtes d'accord tous les deux. C'est
            obligatoire pour un échange en personne et dès qu'un mineur est concerné.
          </p>
          <p>Les frais éventuels (carburant, fournitures) se règlent en euros, convenus avant l'échange.</p>
        </div>
      </section>

      <section className="section">
        <h2>Que peut-on échanger ?</h2>
        <BlocEditable cle="sel.echanges" texte={textes["sel.echanges"]} />
      </section>

      {rubriques.length > 0 && (
        <section className="section">
          <h2>Les catégories</h2>
          <div className="grille">
            {rubriques.map((r, i) => (
              <div key={r.id} className={`carte carte-${COULEURS[i % COULEURS.length]}`}>
                <h3>{r.libelle}</h3>
                {r.exemples && <p>{r.exemples}</p>}
              </div>
            ))}
          </div>
          <p className="meta" style={{ marginTop: "1rem" }}>
            Ce ne sont que des idées : chacun peut proposer autre chose. Il n'est pas nécessaire d'être professionnel pour
            avoir quelque chose à transmettre.
          </p>
        </section>
      )}

      <section className="section">
        <h2>Plus qu'un échange de services</h2>
        <BlocEditable cle="sel.plus" texte={textes["sel.plus"]} />
        <blockquote className="sel-citation">
          <BlocEditable cle="sel.citation" texte={textes["sel.citation"]} ligne />
        </blockquote>
      </section>

      <section>
        <div className="encart">
          <p>
            <strong>Le SEL est réservé aux adhérents de La Fabrique</strong> à jour de cotisation et disposant d'une
            assurance responsabilité civile.
          </p>
          <div className="actions">
            <Link href={entree.href} className="bouton">{entree.texte}</Link>
            <Link href="/documents">Lire nos textes →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
