# Synclune - Boutique E-commerce Artisanale

> Boutique en ligne de **bijoux createurs et colores, faits main** par une creatrice independante
> basee en France. Petite **micro-entreprise** (entrepreneur individuel en franchise de TVA),
> operee par **une seule personne**, qui vend en **France et dans l'Union europeenne**.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

---

## Le contexte, avant le code

Ce depot est dimensionne pour **~20 commandes/mois** et **une opératrice unique**. Ce n'est pas un
manque d'ambition : c'est ce qui justifie la plupart des choix que vous allez croiser (boutons
d'administration plutot que crons, rate limiting en memoire, un seul compte admin, ni i18n ni
multi-devise). Une contribution qui presuppose une equipe ou un gros trafic passe a cote.

⚠️ **Bijoux colores et creatifs — pas de la joaillerie precieuse.** La marque exprime la creativite
coloree de la createrice : joyeux, personnel, artisanal. C'est un piege recurrent en design : toute
direction batie sur le metal precieux, la gravure ou le « luxe discret » est le contre-pied du
brief. Positionnement complet et chiffre : [`docs/BUSINESS.md`](./docs/BUSINESS.md).

---

## Stack Technique

- **Frontend** : Next.js 16 (App Router), React 19, TypeScript
- **Styling** : Tailwind CSS 4, shadcn/ui sur **Base UI** (`@base-ui/react`), Motion (v12)
- **Backend** : Next.js Server Actions, Prisma 7
- **Database** : PostgreSQL (Neon)
- **Auth** : Better Auth (email/password) — **connexion reservee a l'administration**, inscription fermee, pas de provider OAuth
- **Paiements** : Stripe (parcours d'achat 100 % invite)
- **Uploads** : UploadThing
- **Emails** : React Email + Resend (8 templates)
- **Monitoring** : Sentry

---

## Demarrage Rapide

### Prerequis

- Node.js 22+ (see `.nvmrc`)
- pnpm 10+ (`corepack enable`)
- PostgreSQL 14+ (hosted on [Neon](https://neon.tech) or local)
- Compte Stripe (pour paiements)
- Compte Resend (emails transactionnels)
- Compte UploadThing (upload medias)

### Installation

```bash
# Cloner le repository
git clone https://github.com/Adrien490/synclune.git
cd synclune

# Installer les dependances
pnpm install

# Copier les variables d'environnement et remplir les valeurs
# ⚠️ .env, PAS .env.local : le CLI Prisma passe par prisma.config.ts, qui fait
# `import "dotenv/config"` — dotenv ne charge que `.env`. Avec un seul .env.local,
# `prisma generate` echoue en PrismaConfigEnvError sur DATABASE_URL.
cp .env.example .env

# Generer Prisma client
pnpm prisma generate

# Initialiser la base de donnees (base VIDE : deploy, pas dev)
# `prisma migrate dev` echoue en P3006 ici tant que SHADOW_DATABASE_URL n'est pas
# defini — cf. le commentaire dans prisma.config.ts et CLAUDE.md § Migrations.
pnpm prisma migrate deploy

# Seed data (optionnel) — ⚠️ DESTRUCTIF : wipe la base avant de la re-remplir
# (SEED_CLEANUP vaut true par defaut). L'opt-in SEED_ALLOW est une garde anti-prod.
SEED_ALLOW=true pnpm seed

# Demarrer en developpement
pnpm dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

> Next.js, lui, lit bien `.env.local` (et il a priorite sur `.env`). Si vous tenez aux deux
> fichiers, gardez au minimum `DATABASE_URL` dans `.env` pour le CLI Prisma.

---

## Structure Projet

```
app/
├── (auth)/                  # Connexion (admin), mot de passe, verification email
├── (shop)/                  # Storefront (accueil, produits, collections, creations, favoris)
├── (legal)/                 # Pages legales (CGV, mentions, confidentialite)
├── admin/                   # Dashboard admin (catalogue, ventes, marketing, contenu, configuration)
├── api/                     # Routes API (auth, cron, webhooks, uploadthing)
├── paiement/                # Pages paiement (confirmation, annulation, retour)
├── suivi-commande/          # Suivi de commande invite (token HMAC) — seul acces client
└── sitemap-images.xml/      # Generation sitemap images

modules/                     # DDD - 22 modules metier
├── [module]/
│   ├── actions/             # Server Actions (mutations)
│   ├── data/                # Data fetching + cache ("use cache")
│   ├── services/            # Pure business logic
│   ├── components/          # React components
│   ├── schemas/             # Zod schemas
│   └── hooks/               # Custom React hooks

shared/                      # Cross-cutting concerns
├── components/              # UI (shadcn/ui sur Base UI), animations, forms, icons
├── constants/               # Cache tags, breakpoints, SEO, navigation
├── hooks/                   # ~30 hooks
├── lib/                     # Core: prisma, stripe, email, cache, rate-limit
├── providers/               # Root providers
├── schemas/                 # Shared Zod schemas
├── stores/                  # Zustand stores (6 stores)
└── utils/                   # Formatting, slug, date, currency
```

> Il n'y a **pas** d'espace client (retire le 2026-07-31) : panier et favoris vivent dans des
> cookies, le checkout est invite, et une commande se consulte par le lien tokenise de l'email de
> confirmation (`/suivi-commande`).

---

## Commandes

### Developpement

```bash
pnpm dev                    # Serveur developpement
pnpm build                  # Build production
pnpm start                  # Serveur production
pnpm lint                   # ESLint
pnpm typecheck              # Verification types (tsc --noEmit)
pnpm format                 # Prettier (format)
pnpm format:check           # Prettier (check only)
pnpm test                   # Tests Vitest
pnpm test:critical          # Tests critical path (flows revenus/securite)
pnpm test:coverage          # Tests avec couverture
pnpm test:integration       # Tests integration DB (INTEGRATION_DATABASE_URL)
pnpm e2e                    # Tests E2E Playwright
pnpm e2e:ui                 # Playwright UI mode
pnpm size                   # Bundle size check (size-limit)
```

### Database

```bash
pnpm prisma migrate deploy  # Appliquer les migrations (base vide : dev, staging, CI)
pnpm db:migrate             # Creer une migration — exige SHADOW_DATABASE_URL, sinon P3006
pnpm db:studio              # Interface graphique DB (prisma studio)
SEED_ALLOW=true pnpm seed   # Seed data — ⚠️ DESTRUCTIF (wipe puis re-remplit)
```

> ⚠️ Ne **jamais** editer `prisma/migrations/0_init` : son checksum est enregistre dans
> `_prisma_migrations`, le modifier casse `migrate deploy`. Toute evolution de schema passe par une
> nouvelle migration, accompagnee de son `down.sql`. Cf. `CLAUDE.md` § Migrations & rollback.

### Emails

```bash
pnpm email:dev              # Preview emails (port 3001)
```

---

## Variables d'Environnement

Copier `.env.example` vers `.env` et remplir les valeurs :

```bash
cp .env.example .env
```

Voir [`.env.example`](./.env.example) pour la liste complete des variables. Toutes sont validees au
boot par Zod (`shared/schemas/env.schema.ts`) : une variable requise absente fait echouer le
demarrage plutot que de degrader en silence.

---

## Tests

| Type          | Outil      | Commande             |
| ------------- | ---------- | -------------------- |
| Unitaires     | Vitest     | `pnpm test`          |
| E2E           | Playwright | `pnpm e2e`           |
| Couverture    | V8         | `pnpm test:coverage` |
| Accessibilite | axe-core   | Integre dans E2E     |

---

## Conventions

| Type        | Convention                            |
| ----------- | ------------------------------------- |
| Fichiers    | `kebab-case.ts`                       |
| Composants  | `PascalCase`                          |
| Fonctions   | `camelCase`                           |
| Constantes  | `UPPER_SNAKE_CASE`                    |
| UI texte    | Francais, **tutoiement**              |
| Code        | Anglais                               |
| Commits     | `feat:`, `fix:`, `docs:`, `refactor:` |
| Indentation | Tabs                                  |

---

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — Architecture detaillee, patterns, cache profiles, conventions
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Guide de contribution (modules, Git workflow, tests)
- **[docs/](./docs/)** — Modele d'activite ([BUSINESS.md](./docs/BUSINESS.md)), runbook operations ([RUNBOOK.md](./docs/RUNBOOK.md)), constats connus ([KNOWN-ISSUES.md](./docs/KNOWN-ISSUES.md))
- **[docs/prompts/](./docs/prompts/)** — Les 4 catalogues de prompts (audit, refonte, maquettage) et leur [mode d'emploi](./docs/prompts/README.md)

---

## Deploiement

Deploye sur [Vercel](https://vercel.com). Push sur `main` declenche le deploiement automatique.

**3 cron jobs** definis dans `vercel.json` (mirror SSOT `modules/cron/constants/schedules.ts`,
coherence verrouillee par `cron-schedules-match-vercel.test.ts`) : `reconcile-invoices` (quotidien,
seul monitore via Sentry Cron), `cleanup-pending-orders` (quotidien), `hard-delete-retention`
(mensuel). Les autres rattrapages sont des **boutons** sur `/admin/configuration/maintenance`.

⛔ **Plafond dur Vercel Hobby : une execution par jour et par cron.** Une seule expression
infra-journalière fait refuser le deploiement entier, avant le build.

---

## Licence

Projet prive - Synclune. Tous droits reserves.
