# Synclune - Boutique E-commerce Artisanale

> Boutique en ligne de bijoux faits main par une creatrice independante basee a Nantes.

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

---

## Stack Technique

- **Frontend** : Next.js 16 (App Router), React 19, TypeScript
- **Styling** : Tailwind CSS 4, Radix UI, Motion (v12)
- **Backend** : Next.js Server Actions, Prisma 7
- **Database** : PostgreSQL (Neon)
- **Auth** : Better Auth (email/password, Google)
- **Paiements** : Stripe
- **Uploads** : UploadThing
- **Emails** : React Email + Resend (24 templates)
- **PWA** : Serwist
- **Analytics** : Vercel Analytics + Speed Insights

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
git clone https://github.com/[votre-username]/synclune-bijoux.git
cd synclune-bijoux

# Installer les dependances
pnpm install

# Copier les variables d'environnement et remplir les valeurs
cp .env.example .env.local

# Generer Prisma client
pnpm prisma generate

# Initialiser la base de donnees
pnpm prisma migrate dev

# Seed data (optionnel)
pnpm seed

# Demarrer en developpement
pnpm dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## Structure Projet

```
app/
├── (auth)/                  # Connexion, inscription, mot de passe
├── (boutique)/              # Storefront (accueil, produits, collections, compte)
├── admin/                   # Dashboard admin (catalogue, commandes, marketing)
├── api/                     # Routes API (auth, cron, webhooks, search, uploadthing)
├── paiement/                # Pages paiement (confirmation, annulation)
├── serwist/                 # Service Worker PWA
└── ~offline/                # Page offline PWA

modules/                     # DDD - 23 modules metier
├── [module]/
│   ├── actions/             # Server Actions (mutations)
│   ├── data/                # Data fetching + cache ("use cache")
│   ├── services/            # Pure business logic
│   ├── components/          # React components
│   ├── schemas/             # Zod schemas
│   └── hooks/               # Custom React hooks

shared/                      # Cross-cutting concerns
├── components/              # UI (shadcn/ui), animations, forms, icons
├── constants/               # Cache tags, SEO, navigation
├── hooks/                   # ~20 hooks
├── lib/                     # Core: prisma, stripe, email, cache, rate-limit
├── providers/               # Root providers
├── schemas/                 # Shared Zod schemas
├── stores/                  # Zustand stores (5 stores)
└── utils/                   # Formatting, slug, date, currency
```

---

## Commandes

### Developpement

```bash
pnpm dev                    # Serveur developpement
pnpm build                  # Build production
pnpm start                  # Serveur production
pnpm lint                   # ESLint
pnpm format                 # Prettier (format)
pnpm format:check           # Prettier (check only)
pnpm test                   # Tests Vitest
pnpm test:coverage          # Tests avec couverture
pnpm e2e                    # Tests E2E Playwright
pnpm e2e:ui                 # Playwright UI mode
```

### Database

```bash
pnpm prisma migrate dev     # Creer/appliquer migration
pnpm prisma studio          # Interface graphique DB (alias: pnpm db:studio)
pnpm seed                   # Seed data
```

### Emails

```bash
pnpm email:dev              # Preview emails (port 3001)
```

---

## Variables d'Environnement

Copier `.env.example` vers `.env.local` et remplir les valeurs :

```bash
cp .env.example .env.local
```

Voir [`.env.example`](./.env.example) pour la liste complete des variables.

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
| UI texte    | Francais                              |
| Code        | Anglais                               |
| Commits     | `feat:`, `fix:`, `docs:`, `refactor:` |
| Indentation | Tabs                                  |

---

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — Architecture detaillee, patterns, cache profiles, conventions
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Guide de contribution (modules, Git workflow, tests)
- **[docs/](./docs/)** — Audits UX/UI et specs fonctionnelles

---

## Deploiement

Deploye sur [Vercel](https://vercel.com). Push sur `main` declenche le deploiement automatique.

14 cron jobs definis dans `vercel.json`.

---

## Licence

Projet prive - Synclune. Tous droits reserves.
