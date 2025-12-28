# Checklist Mise en Production - Synclune

> Document genere le 28/12/2024 - Audit complet du site e-commerce

## Legende

- **CRITIQUE** - Bloquant pour la mise en production
- **IMPORTANT** - A faire avant le lancement
- **RECOMMANDE** - Peut etre fait apres le lancement
- **CREATRICE** - Necessite une action/validation de Leane
- **TECHNIQUE** - Configuration technique

---

## 1. Stripe & Paiements

### A propos du compte Stripe

Un compte Stripe TEST existe deja avec les informations de Leane (TADDEI LEANE, SIRET 839 183 027 00037).

**Question a poser a Leane:** "As-tu cree le compte Stripe de test ou c'est moi qui l'ai fait?"

- **Si Leane a cree le compte:** Elle doit juste activer le mode Live dans Stripe Dashboard
- **Si quelqu'un d'autre l'a cree:** Elle doit creer son propre compte avec son identite legale

### CRITIQUE - Cles API (avec Leane)

| Tache | Responsable | Notes |
|-------|-------------|-------|
| [ ] Verifier qui a cree le compte Stripe test | CREATRICE | Voir question ci-dessus |
| [ ] Activer le mode Live OU creer un nouveau compte | CREATRICE | dashboard.stripe.com |
| [ ] Recuperer la cle secrete live (`sk_live_...`) | CREATRICE | Dashboard > Developers > API keys |
| [ ] Recuperer la cle publique live (`pk_live_...`) | CREATRICE | Dashboard > Developers > API keys |
| [ ] Mettre a jour `STRIPE_SECRET_KEY` dans Vercel | TECHNIQUE | |
| [ ] Mettre a jour `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` dans Vercel | TECHNIQUE | |

### CRITIQUE - Webhook Stripe

| Tache | Responsable | Notes |
|-------|-------------|-------|
| [ ] Creer le webhook dans Stripe Dashboard | CREATRICE | Developers > Webhooks |
| [ ] URL: `https://synclune.fr/api/webhooks/stripe` | | |
| [ ] Activer les evenements requis (voir liste ci-dessous) | | |
| [ ] Copier le secret webhook (`whsec_...`) | CREATRICE | |
| [ ] Mettre a jour `STRIPE_WEBHOOK_SECRET` dans Vercel | TECHNIQUE | |

**Evenements a activer:**
- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.refunded`
- `refund.created`
- `refund.updated`
- `refund.failed`

### CRITIQUE - Tarifs de Livraison

Creer 4 tarifs dans **Stripe Dashboard > Products > Shipping rates**:

| Zone | Prix | Variable env | A creer |
|------|------|--------------|---------|
| France Metropolitaine | 6,00 EUR | `STRIPE_SHIPPING_RATE_FRANCE` | [ ] |
| Corse | 10,00 EUR | `STRIPE_SHIPPING_RATE_CORSE` | [ ] MANQUANT |
| DOM-TOM | ? | `STRIPE_SHIPPING_RATE_DOM_TOM` | [ ] |
| Europe | 15,00 EUR | `STRIPE_SHIPPING_RATE_EUROPE` | [ ] |

### IMPORTANT - Informations Vendeur (Factures)

Ces informations apparaissent sur les factures Stripe. Verifier/mettre a jour dans le code ou via variables d'environnement:

| Information | Valeur actuelle | A verifier |
|-------------|-----------------|------------|
| Raison sociale | TADDEI LEANE - Entrepreneur Individuel | [ ] OK |
| SIRET | 839 183 027 00037 | [ ] OK |
| N TVA | FR35839183027 | [ ] OK |
| Assurance RC Pro | "En cours de souscription" | [ ] A METTRE A JOUR |
| Adresse | 77 Boulevard du Tertre, 44100 Nantes | [ ] OK |

**Variables d'environnement optionnelles** (si different du code):
- `VENDOR_LEGAL_NAME`
- `VENDOR_SIRET`
- `VENDOR_VAT_NUMBER`
- `VENDOR_INSURANCE_COMPANY`
- `VENDOR_INSURANCE_POLICY`

---

## 2. Google & Analytics

### CRITIQUE - Google Search Console (avec Leane)

| Tache | Responsable | Notes |
|-------|-------------|-------|
| [ ] Creer un compte Google Search Console | CREATRICE | search.google.com/search-console |
| [ ] Ajouter la propriete `synclune.fr` | CREATRICE | |
| [ ] Choisir methode de verification (balise meta recommande) | CREATRICE | |
| [ ] Copier le code de verification | CREATRICE | |
| [ ] Ajouter `GOOGLE_SITE_VERIFICATION` dans Vercel | TECHNIQUE | |
| [ ] Soumettre le sitemap: `https://synclune.fr/sitemap.xml` | CREATRICE | |
| [ ] Soumettre le sitemap images: `https://synclune.fr/sitemap-images.xml` | CREATRICE | |

### IMPORTANT - Google Analytics 4 avec Tracking E-commerce (avec Leane)

| Tache | Responsable | Notes |
|-------|-------------|-------|
| [ ] Creer un compte Google Analytics 4 | CREATRICE | analytics.google.com |
| [ ] Creer une propriete pour synclune.fr | CREATRICE | |
| [ ] Recuperer l'ID de mesure (`G-XXXXXXXX`) | CREATRICE | |
| [ ] Ajouter `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` dans Vercel | TECHNIQUE | |
| [ ] Implementer le script gtag (voir code ci-dessous) | TECHNIQUE | |
| [ ] Activer le mode e-commerce ameliore dans GA4 | CREATRICE | Admin > Data Streams > Enhanced measurement |

**Evenements e-commerce a tracker:**

| Evenement | Declencheur | Donnees envoyees |
|-----------|-------------|------------------|
| `view_item` | Page produit | product_id, name, price, category |
| `add_to_cart` | Ajout panier | product_id, name, price, quantity |
| `remove_from_cart` | Retrait panier | product_id, name, price, quantity |
| `view_cart` | Page panier | items, cart_total |
| `begin_checkout` | Debut paiement | items, cart_total |
| `add_shipping_info` | Adresse renseignee | shipping_tier |
| `add_payment_info` | Mode paiement choisi | payment_type |
| `purchase` | Commande validee | transaction_id, value, items |

**Code a ajouter dans `app/layout.tsx`:**

```tsx
// Ajouter apres les imports
import Script from 'next/script'

// Dans le return, avant </body>
{process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
  <>
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`}
      strategy="afterInteractive"
    />
    <Script id="google-analytics" strategy="afterInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}');
      `}
    </Script>
  </>
)}
```

**Utilitaire pour les evenements e-commerce:**

Creer `shared/lib/analytics.ts`:

```typescript
export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', eventName, params)
  }
}

export function trackPurchase(order: {
  id: string
  total: number
  items: Array<{ id: string; name: string; price: number; quantity: number }>
}) {
  trackEvent('purchase', {
    transaction_id: order.id,
    value: order.total,
    currency: 'EUR',
    items: order.items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  })
}

export function trackAddToCart(product: { id: string; name: string; price: number; quantity: number }) {
  trackEvent('add_to_cart', {
    currency: 'EUR',
    value: product.price * product.quantity,
    items: [{
      item_id: product.id,
      item_name: product.name,
      price: product.price,
      quantity: product.quantity,
    }],
  })
}
```

### IMPORTANT - Google Business Profile (avec Leane)

| Tache | Responsable | Notes |
|-------|-------------|-------|
| [ ] Creer/revendiquer la fiche Google Business | CREATRICE | business.google.com |
| [ ] Adresse: 77 Boulevard du Tertre, 44100 Nantes | | |
| [ ] Ajouter photos des creations | CREATRICE | |
| [ ] Definir les horaires (sur RDV ?) | CREATRICE | |
| [ ] Lier au site web | CREATRICE | |

---

## 3. Authentification

### CRITIQUE - Secrets d'authentification

| Tache | Responsable | Notes |
|-------|-------------|-------|
| [ ] Generer un nouveau `BETTER_AUTH_SECRET` (32+ caracteres) | TECHNIQUE | `openssl rand -base64 32` |
| [ ] Mettre a jour dans Vercel | TECHNIQUE | |
| [ ] Verifier `BETTER_AUTH_URL=https://synclune.fr` | TECHNIQUE | |

### IMPORTANT - Google OAuth Production (avec Leane)

| Tache | Responsable | Notes |
|-------|-------------|-------|
| [ ] Acceder a Google Cloud Console | CREATRICE | console.cloud.google.com |
| [ ] Creer un projet "Synclune Production" (ou reutiliser existant) | CREATRICE | |
| [ ] APIs & Services > Credentials > Create OAuth Client | CREATRICE | |
| [ ] Type: Web application | | |
| [ ] Authorized origins: `https://synclune.fr` | | |
| [ ] Authorized redirect: `https://synclune.fr/api/auth/callback/google` | | |
| [ ] Copier Client ID et Client Secret | CREATRICE | |
| [ ] Mettre a jour `GOOGLE_CLIENT_ID` dans Vercel | TECHNIQUE | |
| [ ] Mettre a jour `GOOGLE_CLIENT_SECRET` dans Vercel | TECHNIQUE | |
| [ ] Configurer l'ecran de consentement OAuth | CREATRICE | Nom, logo, email support |

---

## 4. Emails

### CRITIQUE - Configuration Resend

| Tache | Responsable | Notes |
|-------|-------------|-------|
| [ ] Verifier le domaine synclune.fr dans Resend | TECHNIQUE | resend.com/domains |
| [ ] Configurer les enregistrements DNS (SPF, DKIM, DMARC) | TECHNIQUE | Voir section DNS ci-dessous |
| [ ] Verifier `RESEND_API_KEY` dans Vercel | TECHNIQUE | |
| [ ] Verifier `RESEND_CONTACT_EMAIL=contact@synclune.fr` | TECHNIQUE | |

### IMPORTANT - Enregistrements DNS pour emails

Ajouter ces enregistrements chez le registrar du domaine:

| Type | Nom | Valeur | A faire |
|------|-----|--------|---------|
| TXT | @ | `v=spf1 include:_spf.resend.com ~all` | [ ] SPF |
| CNAME | resend._domainkey | `resend._domainkey.resend.dev` | [ ] DKIM |
| TXT | _dmarc | `v=DMARC1; p=none; rua=mailto:contact@synclune.fr` | [ ] DMARC |

### IMPORTANT - Test des emails (avec Leane)

| Email | A tester | Valide |
|-------|----------|--------|
| [ ] Inscription - Email de verification | | |
| [ ] Mot de passe oublie | | |
| [ ] Confirmation de commande | | |
| [ ] Expedition de commande | | |
| [ ] Newsletter - Bienvenue | | |
| [ ] Demande d'avis produit | | |

---

## 5. Pages Legales

### IMPORTANT - Verification du contenu (avec Leane)

| Page | URL | A verifier |
|------|-----|------------|
| [ ] Mentions legales | `/mentions-legales` | Infos entreprise correctes |
| [ ] CGV | `/cgv` | Conditions de vente, retours, garanties |
| [ ] Politique de confidentialite | `/confidentialite` | Traitement des donnees |
| [ ] Politique cookies | `/cookies` | Types de cookies utilises |
| [ ] Droit de retractation | `/retractation` | Formulaire de retractation |

### CRITIQUE - Informations obligatoires

Verifier que ces informations sont correctes partout:

| Information | Valeur | Present dans |
|-------------|--------|--------------|
| Nom commercial | Synclune | [ ] Mentions legales |
| Raison sociale | TADDEI LEANE | [ ] Mentions legales |
| SIRET | 839 183 027 00037 | [ ] Mentions legales, CGV |
| Adresse | 77 Boulevard du Tertre, 44100 Nantes | [ ] Mentions legales |
| Email contact | contact@synclune.fr | [ ] Mentions legales |
| Hebergeur | Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723 | [ ] Mentions legales |
| Mediateur | CNPM | [ ] CGV |

---

## 6. SEO & Reseaux Sociaux

### IMPORTANT - Reseaux sociaux (avec Leane)

| Reseau | Handle configure | Compte actif | A verifier |
|--------|-----------------|--------------|------------|
| Instagram | @synclune.bijoux | [ ] | [ ] Lien dans bio vers site |
| TikTok | @synclune | [ ] | [ ] Lien dans bio vers site |
| Pinterest | Non configure | [ ] | [ ] Creer si pertinent |

### RECOMMANDE - SEO - Deja configure

- [x] Sitemap dynamique avec tous les produits
- [x] Sitemap images pour Google Images
- [x] Robots.txt avec exclusions admin/API
- [x] Balises Open Graph et Twitter Cards
- [x] Donnees structurees (Product, LocalBusiness, Organization)
- [x] PWA avec manifest et service worker

---

## 7. Base de Donnees & Infrastructure

### CRITIQUE - Database Neon

| Tache | Responsable | Notes |
|-------|-------------|-------|
| [ ] Verifier que la base de production Neon est creee | TECHNIQUE | console.neon.tech |
| [ ] Copier `DATABASE_URL` de production dans Vercel | TECHNIQUE | |
| [ ] Executer les migrations: `prisma migrate deploy` | TECHNIQUE | Avant le premier deploiement |
| [ ] Activer les backups automatiques sur Neon | TECHNIQUE | Settings > Backups |
| [ ] Nettoyer les donnees de test/seed | TECHNIQUE | Supprimer produits/commandes de test |

### IMPORTANT - Configuration Next.js

| Tache | Responsable | Notes |
|-------|-------------|-------|
| [ ] Verifier `NODE_ENV=production` dans Vercel | TECHNIQUE | Settings > Environment Variables |
| [ ] Retirer les domaines d'images placeholder | TECHNIQUE | Voir ci-dessous |

**Domaines a retirer de `next.config.ts`** (ligne 55-57):
- `picsum.photos` - Service d'images placeholder
- `images.unsplash.com` - Images stock (sauf si utilise pour avatars)

### RECOMMANDE - Monitoring d'erreurs

| Tache | Responsable | Notes |
|-------|-------------|-------|
| [ ] Configurer Sentry ou Vercel Error Tracking | TECHNIQUE | sentry.io |
| [ ] Ajouter `SENTRY_DSN` dans Vercel (si Sentry) | TECHNIQUE | |
| [ ] Configurer les alertes email pour erreurs critiques | TECHNIQUE | |

### RECOMMANDE - Header HSTS

Ajouter dans `next.config.ts` pour forcer HTTPS:

```typescript
{
  key: "Strict-Transport-Security",
  value: "max-age=31536000; includeSubDomains"
}
```

---

## 8. Securite & Technique

### IMPORTANT - Compte Admin

| Tache | Responsable | Notes |
|-------|-------------|-------|
| [ ] Creer le compte de Leane via inscription normale | CREATRICE | |
| [ ] Promouvoir le compte en ADMIN via Prisma Studio | TECHNIQUE | `pnpm prisma studio` |
| [ ] Tester l'acces au dashboard admin | CREATRICE | `/admin` |

### RECOMMANDE - Rate Limiting (deja configure)

- [x] Protection globale: 10 req/10 sec par IP
- [x] Auth: 5 tentatives/15 min
- [x] Newsletter: 5 inscriptions/heure
- [x] Checkout: 10/minute

### RECOMMANDE - Headers de securite (deja configures)

- [x] X-Content-Type-Options: nosniff
- [x] X-Frame-Options: DENY
- [x] Referrer-Policy: strict-origin-when-cross-origin

---

## 9. Variables d'Environnement Vercel

### Recapitulatif complet

| Variable | Valeur | Priorite |
|----------|--------|----------|
| `DATABASE_URL` | URL Neon production | CRITIQUE |
| `BETTER_AUTH_SECRET` | Nouveau secret 32+ chars | CRITIQUE |
| `BETTER_AUTH_URL` | `https://synclune.fr` | CRITIQUE |
| `STRIPE_SECRET_KEY` | `sk_live_...` | CRITIQUE |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | CRITIQUE |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | CRITIQUE |
| `STRIPE_SHIPPING_RATE_FRANCE` | `shr_...` | CRITIQUE |
| `STRIPE_SHIPPING_RATE_CORSE` | `shr_...` | CRITIQUE |
| `STRIPE_SHIPPING_RATE_DOM_TOM` | `shr_...` | CRITIQUE |
| `STRIPE_SHIPPING_RATE_EUROPE` | `shr_...` | CRITIQUE |
| `GOOGLE_CLIENT_ID` | ID OAuth production | IMPORTANT |
| `GOOGLE_CLIENT_SECRET` | Secret OAuth production | IMPORTANT |
| `RESEND_API_KEY` | `re_...` | CRITIQUE |
| `RESEND_CONTACT_EMAIL` | `contact@synclune.fr` | IMPORTANT |
| `UPLOADTHING_TOKEN` | Token production | CRITIQUE |
| `GOOGLE_SITE_VERIFICATION` | Code GSC | IMPORTANT |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | `G-XXXXXXXX` | IMPORTANT |
| `ARCJET_KEY` | Optionnel | RECOMMANDE |

---

## 10. Tests Finaux

### CRITIQUE - Parcours d'achat complet

| Etape | A tester | Valide |
|-------|----------|--------|
| [ ] Ajouter un produit au panier | | |
| [ ] Modifier la quantite | | |
| [ ] Appliquer un code promo | | |
| [ ] Passer a la caisse | | |
| [ ] Entrer une adresse de livraison | | |
| [ ] Payer avec carte de test Stripe | | |
| [ ] Recevoir l'email de confirmation | | |
| [ ] Verifier la commande dans l'admin | | |

### IMPORTANT - Autres parcours

| Parcours | A tester | Valide |
|----------|----------|--------|
| [ ] Inscription par email | | |
| [ ] Connexion Google OAuth | | |
| [ ] Mot de passe oublie | | |
| [ ] Inscription newsletter | | |
| [ ] Demande de personnalisation | | |
| [ ] Ajout aux favoris | | |

### IMPORTANT - PWA

| Test | A verifier | Valide |
|------|------------|--------|
| [ ] Installation sur Android | | |
| [ ] Installation sur iOS | | |
| [ ] Mode hors-ligne (page d'erreur) | | |

---

## 11. Post-Lancement

### Premiere semaine

| Tache | Responsable |
|-------|-------------|
| [ ] Surveiller les logs Stripe (webhooks) | TECHNIQUE |
| [ ] Surveiller Google Search Console (erreurs) | CREATRICE |
| [ ] Verifier l'indexation des pages | CREATRICE |
| [ ] Tester une vraie commande de bout en bout | CREATRICE |

### Premier mois

| Tache | Responsable |
|-------|-------------|
| [ ] Analyser les donnees Google Analytics | CREATRICE |
| [ ] Repondre aux premiers avis clients | CREATRICE |
| [ ] Ajuster les tarifs de livraison si necessaire | CREATRICE |

---

## Notes & Questions pour Leane

1. **Compte Stripe**: As-tu cree le compte Stripe de test ou c'est moi qui l'ai fait? (important pour savoir si tu dois juste activer le mode Live ou creer un nouveau compte)
2. **Assurance RC Pro**: Le site mentionne "En cours de souscription" - mettre a jour une fois obtenue
3. **Tarif livraison Corse**: Confirmer le prix (suggere: 10 EUR)
4. **Tarif livraison DOM-TOM**: Confirmer le prix
5. **Pinterest**: Pertinent pour les bijoux - souhaites-tu l'ajouter aux reseaux sociaux ?

---

*Document genere automatiquement - A mettre a jour au fur et a mesure de l'avancement*
