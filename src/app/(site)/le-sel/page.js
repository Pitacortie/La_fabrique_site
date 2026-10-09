import Link from "next/link";
import BlocEditable from "@/components/edition/BlocEditable";
import { getContenus } from "@/lib/contenus";
import { prisma } from "@/lib/db";
import { etatSel } from "@/lib/sel/acces";
import { filtreAnnoncesVisibles } from "@/lib/sel/donnees";
import { PLANCHER_BRIQUES } from "@/lib/sel/regles";

export const metadata = { title: "Le SEL" };

const COULEURS = ["vert", "bleu", "terracotta", "ocre"];

// Présentation publique du SEL (SEL-1) et porte d'entrée vers l'espace SEL (/sel), réservé aux adhérents.
export default async function Sel() {
  const [textes, rubriques, nbAnnonces, etat] = await Promise.all([
    getContenus(["sel.intro"]),
    prisma.rubriqueSel.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }).catch(() => []),
    prisma.annonce.count({ where: filtreAnnoncesVisibles() }).catch(() => 0),
    etatSel(),
  ]);

  // Bouton principal selon la situation de la personne
  const entree = {
    ok: { href: "/sel", texte: "Entrer dans le SEL" },
    inscription: { href: "/sel/inscription", texte: "M'inscrire au SEL" },
    textes: { href: "/sel/inscription", texte: "Accepter les nouveaux textes du SEL" },
    attestation: { href: "/sel/inscription", texte: "Déposer mon attestation d'assurance" },
    attestation_expiree: { href: "/sel/inscription", texte: "Renouveler mon attestation d'assurance" },
    verification: { href: "/sel/inscription", texte: "Voir mon inscription (en cours de vérification)" },
    suspendu: { href: "/sel/inscription", texte: "Voir mon accès au SEL" },
    cotisation: { href: "/adherer?raison=sel", texte: "Renouveler ma cotisation" },
    connexion: { href: "/sel", texte: "Entrer dans le SEL" },
  }[etat.code];

  return (
    <div className="conteneur section">
      <h1>Le SEL</h1>
      <p className="accroche">Service d'échange local : ni grand, ni petit savoir</p>
      <BlocEditable cle="sel.intro" texte={textes["sel.intro"]} className="chapo" />
      <div className="actions">
        <Link href={entree.href} className="bouton">{entree.texte}</Link>
        {etat.code === "connexion" && <Link href="/adherer">Pas encore adhérent ? Adhérer →</Link>}
        {nbAnnonces > 0 && <span className="meta">{nbAnnonces} annonce{nbAnnonces > 1 ? "s" : ""} en ligne en ce moment</span>}
      </div>

      <section className="section">
        <h2>Comment ça marche ?</h2>
        <ol className="etapes">
          <li><strong>J'adhère à La Fabrique</strong> et je reçois mon code personnel (par exemple FAB-7KQ2XM).</li>
          <li><strong>Je m'inscris au SEL</strong> : j'accepte la Charte et le Règlement du SEL et je dépose mon attestation d'assurance responsabilité civile.</li>
          <li><strong>Je publie une annonce</strong> (je propose ou je demande un service, un prêt, un don, un objet) <strong>ou je réponds</strong> à celle d'un autre membre.</li>
          <li><strong>On s'organise par la messagerie</strong>, toujours sous nos codes. Pour se rencontrer, chacun accepte de révéler son identité.</li>
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
            Tout le monde commence à zéro. Le solde peut être négatif, jusqu'à {PLANCHER_BRIQUES} briques : on peut recevoir
            avant de donner.
          </p>
        </div>
        <div className="carte carte-bleu">
          <h2>Votre anonymat</h2>
          <p>
            Dans le SEL, vous apparaissez sous votre code, jamais sous votre nom. Votre identité n'est révélée qu'à la
            personne avec qui vous échangez, et seulement si vous êtes d'accord tous les deux.
          </p>
          <p>Les frais éventuels (carburant, fournitures) se règlent en euros, convenus avant l'échange.</p>
        </div>
      </section>

      {rubriques.length > 0 && (
        <section className="section">
          <h2>Ce qu'on peut échanger</h2>
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

      <section>
        <div className="encart">
          <p>
            <strong>Le SEL est réservé aux adhérents de La Fabrique</strong> à jour de cotisation et disposant d'une
            attestation d'assurance responsabilité civile.
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
