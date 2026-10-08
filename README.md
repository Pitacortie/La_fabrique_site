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

## Déployer sur Render (aperçu)

1. Pousser le dépôt sur GitHub.
2. Render › **New** › **Blueprint** › choisir le dépôt : `render.yaml` crée le service web et la base PostgreSQL (région Francfort).
3. Renseigner `APP_URL` avec l'URL fournie par Render.

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
