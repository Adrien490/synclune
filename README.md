# 💎 Synclune - Boutique E-commerce Artisanale

> Boutique en ligne de bijoux faits main avec amour par une créatrice indépendante basée à Nantes.

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.18-2D3748?logo=prisma)](https://www.prisma.io/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

---

## ✨ Caractéristiques

### 🎨 Expérience Utilisateur

- **Navigation instantanée** grâce au caching Next.js 16 avancé
- **Interface élégante** inspirée de l'artisanat et de la nature
- **Animations fluides** avec Framer Motion
- **Responsive design** optimisé mobile-first
- **Core Web Vitals** : LCP < 2.5s, FID < 100ms, CLS < 0.1

### 🛒 Fonctionnalités E-commerce

- **Catalogue produits** avec filtres avancés (type, couleur, prix, matériau)
- **Panier intelligent** avec persistance session/utilisateur
- **Paiement Stripe** sécurisé
- **Gestion commandes** avec suivi d'état
- **Recommandations personnalisées** basées sur l'historique

### 👤 Espace Client

- **Authentification** avec Better Auth (email/password, OAuth GitHub/Google)
- **Historique des commandes** personnalisé
- **Gestion profil** et adresses de livraison
- **Wishlist** (à venir)

### 🎛️ Dashboard Admin

- **KPIs en temps réel** : CA, commandes, stock
- **Gestion catalogue** : produits, SKUs, collections, médias
- **Gestion commandes** : statuts, paiements, expéditions
- **Analytics avancées** : graphiques revenus, top produits, TVA

### ⚡ Performance & Technique

- **Next.js 16** avec App Router et Cache Components
- **Caching stratégique** : 3 directives (`use cache`, `use cache: private`, `use cache: remote`)
- **Streaming & Suspense** pour chargement progressif
- **Images optimisées** : AVIF/WebP avec lazy loading
- **SEO optimisé** : Schema.org, sitemap, metadata dynamiques

---

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 20+ et npm/pnpm
- PostgreSQL 14+
- Compte Vercel (optionnel, pour déploiement)
- Compte Stripe (pour paiements)

### Installation

```bash
# Cloner le repository
git clone https://github.com/[votre-username]/synclune-bijoux.git
cd synclune-bijoux

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env.local

# Éditer .env.local avec vos valeurs
# → DATABASE_URL, STRIPE_SECRET_KEY, etc.

# Initialiser la base de données
npx prisma migrate dev

# Seed data (optionnel)
npm run seed

# Démarrer en développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## 📚 Documentation

### Pour la Créatrice (Non-Technique)

📋 **[Guide Rapide Cache](./docs/GUIDE_RAPIDE_CACHE.md)** - Ajuster les durées de cache selon vos besoins

### Pour les Développeurs (Technique)

- 🎨 **[Stratégie de Caching Complète](./docs/CACHING_STRATEGY.md)** - Architecture Next.js 16 détaillée
- 📖 **[Documentation Hub](./docs/README.md)** - Index de toute la documentation

---

## 🏗️ Architecture

### Stack Technique

- **Frontend** : Next.js 16 (App Router), React 19, TypeScript
- **Styling** : Tailwind CSS 4, Radix UI, Framer Motion
- **Backend** : Next.js Server Actions, Prisma ORM
- **Database** : PostgreSQL (Vercel Postgres)
- **Auth** : Better Auth (email/password, OAuth)
- **Paiements** : Stripe
- **Storage** : UploadThing (images)
- **Deployment** : Vercel
- **Analytics** : Vercel Analytics (Core Web Vitals)

### Structure Projet

```
synclune-bijoux/
├── app/                    # Routes Next.js App Router
│   ├── (auth)/             # Authentification
│   ├── (customer)/         # Espace client
│   ├── (storefront)/       # Boutique publique
│   ├── dashboard/          # Admin
│   └── api/                # API routes
├── components/             # Composants React réutilisables
├── domains/                # Logique métier par domaine (DDD)
│   ├── cart/               # Panier
│   ├── order/              # Commandes
│   ├── product/            # Produits
│   └── ...
├── docs/                   # 📚 Documentation complète
├── lib/                    # Utilitaires (cache, prisma, etc.)
├── prisma/                 # Schéma DB et migrations
└── next.config.ts          # ⚙️ Configuration (CACHE)
```

### Stratégie de Caching

L'application utilise les **3 directives de cache** Next.js 16 :

```typescript
// 1. Cache PUBLIC (partagé entre utilisateurs)
"use cache"
→ Produits, collections, pages légales

// 2. Cache PRIVATE (par utilisateur/session)
"use cache: private"
→ Panier, commandes utilisateur, recommandations

// 3. Cache REMOTE (contexte dynamique partagé)
"use cache: remote"
→ Dashboard admin, analytics
```

**Résultat** : Navigation instantanée, -80% de requêtes DB, LCP < 2.5s

---

## 🔧 Commandes Utiles

### Développement

```bash
npm run dev          # Serveur développement (localhost:3000)
npm run build        # Build production
npm run start        # Serveur production local
npm run lint         # Linter ESLint
npm test             # Tests Vitest
```

### Database

```bash
npx prisma migrate dev            # Créer migration
npx prisma migrate reset          # ⚠️ Reset DB (supprime données)
npx prisma studio                 # Interface graphique DB
npx prisma generate              # Régénérer Prisma Client
npm run seed                      # Seed data
```

### Déploiement

```bash
git push origin main  # Push vers GitHub
# → Vercel déploie automatiquement ✅
```

---

## 📊 Core Web Vitals

L'application est optimisée pour les Core Web Vitals :

| Métrique                           | Cible   | Résultat Actuel |
| ---------------------------------- | ------- | --------------- |
| **LCP** (Largest Contentful Paint) | < 2.5s  | ✅ ~2.0s        |
| **FID** (First Input Delay)        | < 100ms | ✅ ~50ms        |
| **CLS** (Cumulative Layout Shift)  | < 0.1   | ✅ ~0.05        |

**Monitoring** : Vercel Analytics → https://vercel.com/[projet]/analytics

---

## 🔐 Variables d'Environnement

Créer `.env.local` avec :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/synclune"

# Better Auth
BETTER_AUTH_SECRET="votre-secret-auth"
BETTER_AUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# UploadThing
UPLOADTHING_TOKEN="..."

# Email (Resend)
RESEND_API_KEY="re_..."

# (Optionnel) Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID="..."
```

Voir [`.env.example`](./.env.example) pour la liste complète.

---

## 🧪 Tests

```bash
# Lancer tous les tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# UI interactive
npm run test:ui
```

---

## 🚢 Déploiement

### Vercel (Recommandé)

1. Push sur GitHub
2. Connecter repository sur Vercel
3. Configurer variables d'environnement
4. Déployer ✅

Vercel détecte automatiquement Next.js et configure le build.

### Autre (Docker, VPS, etc.)

```bash
# Build
npm run build

# Start
npm run start
# → Serveur sur port 3000
```

**Note** : Nécessite PostgreSQL accessible et variables d'environnement configurées.

---

## 📈 Monitoring

### Vercel Dashboard

- **Analytics** : Core Web Vitals temps réel
- **Logs** : Erreurs et warnings
- **Cache Hit Rate** : Efficacité du cache

### Google Search Console

- **SEO** : Indexation, performances
- **Core Web Vitals** : Données terrain réelles
- **Sitemaps** : https://synclune.fr/sitemap.xml

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment contribuer :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Conventions

- **Code** : Prettier + ESLint
- **Commits** : Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)
- **Tests** : Ajouter tests pour nouvelles features

---

## 📄 Licence

Projet privé - © 2025 Synclune. Tous droits réservés.

---

## 📚 Documentation

### 💳 Stripe Invoicing (Version Simplifiée)
**Guide rapide** : [`/documentation/STRIPE_FACTURES.md`](./documentation/STRIPE_FACTURES.md)

**Tout en 1 document** :
- ✅ Comment ça marche (automatique)
- ✅ Créer un avoir (remboursement)
- ✅ Exporter pour comptabilité
- ✅ Configuration webhooks
- ✅ Dépannage rapide

👉 **Lecture : 5 minutes** | Documentation complète : [`/documentation`](./documentation/README.md)

---

## 📞 Support

- **Issues** : [GitHub Issues](https://github.com/[votre-username]/synclune-bijoux/issues)
- **Email** : contact@synclune.fr
- **Documentation** : [`/documentation`](./documentation/README.md)

---

## 🙏 Remerciements

- [Next.js](https://nextjs.org/) - Framework React
- [Vercel](https://vercel.com/) - Hébergement et analytics
- [Prisma](https://www.prisma.io/) - ORM TypeScript
- [Stripe](https://stripe.com/) - Paiements
- [Radix UI](https://www.radix-ui.com/) - Composants accessibles
- [Better Auth](https://www.better-auth.com/) - Authentification
- [shadcn/ui](https://ui.shadcn.com/) - Composants UI

---

**Fait avec ❤️ par une créatrice passionnée de bijoux artisanaux**

**Dernière mise à jour** : 2025-01-23
