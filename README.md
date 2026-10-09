# La Fabrique de Ménesplet — site web

Site principal de l'association : vitrine, demandes d'adhésion, espace adhérent et console d'administration.
Référence fonctionnelle : cahier des charges v0.9 (08/10/2026).

**Pile** : Next.js 15 (App Router, JavaScript) · PostgreSQL · Prisma 6 · CSS sans framework.

## État actuel : squelette

| Partie | État |
| --- | --- |
| Thème (charte graphique, Antonio et Montserrat servies par le site) | fait |
| Pages publiques : accueil, présentation, textes, actualités, SEL, contacts, mentions | fait (contenus provisoires) |
| Formulaire d'adhésion (bulletin 2026, bloc mineurs, 3 cases obligatoires) | interface seule, envoi non branché |
| Espace adhérent, console d'administration | écrans de navigation, données fictives |
| Modèle de données complet de la phase 1 + migration initiale + seed | fait |
| Authentification, enregistrement des demandes, validation par le Bureau | à faire |

> ⚠️ `/espace` et `/admin` ne sont pas encore protégés. Ils n'affichent que des données fictives.

## Démarrer en local

Prérequis : Node.js 20.9 ou plus et PostgreSQL 16.

**Option A — PostgreSQL installé sur Windows** (configuration actuelle du poste de dev)

```powershell
winget install --id OpenJS.NodeJS.22 -e
winget install --id PostgreSQL.PostgreSQL.16 -e
# puis, avec le mot de passe du superutilisateur postgres :
psql -U postgres -h localhost -c "CREATE ROLE fabrique LOGIN PASSWORD 'fabrique' CREATEDB"
psql -U postgres -h localhost -c "CREATE DATABASE fabrique OWNER fabrique ENCODING 'UTF8' TEMPLATE template0"
```

**Option B — Docker** : `docker compose up -d` (PostgreSQL :5432 et Mailpit :8025).

Ensuite, dans les deux cas :

```bash
cp .env.example .env        # puis adapter les valeurs
npm install
npm run db:deploy           # applique les migrations
npm run db:seed             # compte Bureau + textes + articles de démo
npm run dev                 # http://localhost:3000
```

Sans base de données, les pages s'affichent quand même (les contenus de démo sont statiques pour l'instant).
`/api/health` indique l'état de la base.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` / `npm start` | build et serveur de production |
| `npm run db:migrate` | crée une migration après modification de `prisma/schema.prisma` |
| `npm run db:deploy` | applique les migrations (production) |
| `npm run db:seed` | données initiales (idempotent) |
| `npm run db:studio` | explorateur de la base |

## Tests

```bash
npm test               # tout : tests unitaires + site complet (≈ 2 min la première fois, build compris)
npm run test:unit      # seulement les fonctions isolées (1 seconde)
TEST_SANS_BUILD=1 npm test   # réutilise le dernier build de test (≈ 20 s)
```

Les tests de bout en bout construisent le site, le lancent sur le port 3199 et l'utilisent comme un navigateur
(formulaires, connexions, droits d'accès, courriels…). Ils travaillent sur une base **dédiée** `fabrique_test`,
vidée à chaque lancement ; la base de développement n'est jamais touchée (garde-fou : le nom doit finir par `_test`).
Les courriels sont lus dans le journal du serveur de test (`tests/.tmp/serveur.log`).

| Fichier | Ce qui est vérifié |
| --- | --- |
| `tests/unit/*` | adresses d'articles, dates, limites de débit, IP derrière un proxy, chemins des photos, courriels |
| `pages-publiques` | toutes les pages, 404, en-têtes de sécurité, polices locales, textes officiels, filtres |
| `acces` | qui peut ouvrir quelle page (visiteur, adhérent, administrateur, Bureau) |
| `connexion` | identifiants, limites d'essais, « rester connecté », redirections, déconnexion |
| `mots-de-passe` | changement, mot de passe oublié, liens à usage unique et expirés |
| `coordonnees` | validation, droit à l'image journalisé |
| `edition` | crayons ✏️, Nos Fabrications, requêtes rejouées par un non-admin |
| `articles` | brouillon, photos (redimensionnement, texte alternatif, droit à l'image), publication, retrait |
| `textes-officiels` | versions, dates d'entrée en vigueur, réservé au Bureau |
| `signalements` | bouton « Signaler un bug », anti-robot, traitement dans la console |
| `adhesion` | demande (cases obligatoires, mineurs, doublons), validation par le Bureau, activation, refus |
| `contact` | formulaire Contacts, accusé de réception, réponse depuis la console |
| `compte` | changement d'adresse e-mail, nouvelle acceptation quand un texte change |
| `rappels` | tâches quotidiennes : rappels de cotisation (dates simulées), ménage |
| `sel` | accès, inscription et assurance, annonces, recherche, anonymat, messagerie, rendez-vous, briques, solde minimum, litiges, modération |

## Le SEL (`/sel`)

Espace à part, réservé aux adhérents à jour de cotisation, inscrits au SEL (Charte et Règlement du SEL acceptés)
et dont l'attestation d'assurance RC a été vérifiée par un administrateur. Sinon : connexion, page Adhérer
(message rouge) ou page d'inscription, selon le cas. La présentation publique est sur `/le-sel`.

- **Anonymat** : annonces, messages et échanges ne référencent que le code (`Alias`), jamais l'identité.
  Les noms ne sont révélés qu'avec l'accord des deux personnes, obligatoire avant un rendez-vous en personne.
- **Échange** : le bénéficiaire propose un rendez-vous (date, heure de Ménesplet, lieu) → le prestataire confirme
  → après le service, le prestataire déclare le temps passé → le bénéficiaire confirme : les briques sont
  transférées (1 minute = 1 brique), avec une ligne dans `TransactionBriques`. Solde minimum -120 (dérogation
  possible), alerte au-delà de 600. Une contestation ouvre un litige tranché dans la console.
- **Attestations d'assurance** : stockées dans `prive/` (hors git, jamais servies publiquement), supprimées dès
  la vérification. En production, ce dossier doit être sur un disque persistant.
- **Données de démo** : `npm run db:demo` crée deux adhérents prêts pour le SEL, avec une annonce chacun.

## Courriels automatiques

| Quand | Qui reçoit | Quoi |
| --- | --- | --- |
| Demande d'adhésion déposée | postulant / Bureau | confirmation + modalités de paiement / alerte « nouvelle demande » |
| Demande validée | nouveau membre | code personnel + lien d'activation (7 jours) |
| Demande refusée | postulant | courriel poli, avec le motif s'il est indiqué |
| Mot de passe oublié | membre | lien de réinitialisation (1 heure) |
| Mot de passe ou e-mail modifié | membre | alerte de sécurité |
| Changement d'adresse | nouvelle adresse | lien de confirmation (1 heure) |
| Message via Contacts | association / expéditeur | message (« Répondre » écrit à l'expéditeur) / accusé de réception |
| Réponse depuis la console | expéditeur | réponse au nom de l'association |
| 1er décembre → 31 janvier | membres non renouvelés | rappel de cotisation (au plus tous les 14 jours) |
| Bug signalé | association | contenu du signalement |

Sans `SMTP_HOST`, les courriels sont affichés dans le terminal au lieu d'être envoyés.
Les modalités de paiement se modifient au crayon ✏️ sur la page Adhérer.

## Tâches quotidiennes

Rappels de cotisation et ménage (sessions et liens expirés) : `POST /api/taches/quotidiennes`
avec l'en-tête `Authorization: Bearer <TACHES_SECRET>`. Le plan gratuit de Render n'ayant pas de tâches
planifiées, c'est GitHub qui l'appelle chaque matin (`.github/workflows/taches-quotidiennes.yml`) :
dans GitHub › Settings › Secrets and variables › Actions, créer `SITE_URL` et `TACHES_SECRET`
(la même valeur que dans Render › Environment). Le Bureau peut aussi lancer les rappels depuis
la console (page Cotisations).

## Déployer sur Render (aperçu)

1. Pousser le dépôt sur GitHub.
2. Render › **New** › **Blueprint** › choisir le dépôt : `render.yaml` crée le service web et la base PostgreSQL (région Francfort).
3. Renseigner `APP_URL` avec l'URL fournie par Render, ainsi que `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD`
   (le compte Bureau, créé au premier déploiement : choisir un mot de passe solide, le site est public).
4. Avec `DEMO_COMPTES=1` (réglé dans `render.yaml`), les 4 adhérents de démo sont créés au premier déploiement,
   puis jamais modifiés : `camille@`, `dominique@`, `sacha@`, `lou@fabrique.local`, mots de passe `prénom2026`.
   Pour le vrai site, passer `DEMO_COMPTES` à `0` et supprimer ces comptes.

Le plan gratuit met le service en veille après 15 minutes d'inactivité (premier chargement lent),
et la base PostgreSQL gratuite expire au bout de 30 jours : suffisant pour un aperçu, pas pour la production.

## Organisation du code

```
prisma/
  schema.prisma          modèle de données (cahier des charges, section 9)
  migrations/            migrations SQL
  seed.mjs               données initiales
src/
  app/
    (site)/              pages publiques (en-tête + pied de page)
    espace/              espace adhérent
    admin/               console d'administration
    api/health/          sonde de santé
    globals.css          thème : couleurs et composants de la charte
  components/            en-tête, pied de page, coque admin, cartes
  lib/                   client Prisma, informations du site, formatage, données de démo
```

## Principes à respecter

- **Identité et alias séparés** : les futures tables du SEL ne référencent que `Alias`, jamais `Membre`.
- **Acceptations versionnées** : chaque case cochée crée une `Acceptation` liée à une version précise de `TexteJuridique`.
- **Aucun paiement en ligne** : la cotisation est saisie par un membre du Bureau (`Cotisation.saisieParId`).
- **Traçabilité** : décisions d'adhésion, accès aux identités et publications passent par `JournalAudit`.
- **Neutralité** : aucun contenu partisan ou électoral (statuts, art. 3 et 19).
- **Photos** : stockées dans `uploads/` (hors git), servies par `/medias/…`. En production, ce dossier doit être sur un disque persistant.
- **Édition sur place** : connecté en administrateur, les textes et les services « Nos Fabrications » se modifient directement sur les pages publiques (crayons ✏️). Pour rendre un nouveau texte modifiable : le déclarer dans `src/lib/contenus.js` et l'afficher avec `<BlocEditable>`.
- **Contraste AA** : jamais de texte en ocre doré sur crème ; l'ocre sert aux aplats et aux détails.
