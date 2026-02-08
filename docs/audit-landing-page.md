# Audit Landing Page Synclune - Best Practices E-Commerce 2026

**Date :** Fevrier 2026
**Scope :** Page d'accueil Synclune (`app/(boutique)/(accueil)/page.tsx` + 9 sections)
**Benchmark :** Meilleures pratiques e-commerce 2026

---

## Flux actuel de la page

La page suit un arc narratif en 9 sections :

1. **HeroSection** - Accroche avec texte rotatif + 2 CTA
2. **ValuePropositionBar** - 4 piliers de marque (fait main, Nantes, colore, avec amour)
3. **CuratedPicks** - 4 "coups de coeur" de Leane (produits manuellement selectionnes)
4. **LatestCreations** - 4 dernieres creations (dynamique)
5. **CollectionsSection** - Carrousel de collections thematiques
6. **AtelierStory** - Storytelling personnel + galerie polaroid
7. **CreativeProcess** - 4 etapes du processus creatif (timeline parallax)
8. **FaqSection** - 6 questions/reponses avec schema FAQ
9. **NewsletterSection** - Inscription newsletter

---

## PARTIE 1 : Ce qui est excellent (a conserver)

### 1.1 Architecture narrative et flux de conversion

**Verdict : Exemplaire**

Le parcours de scroll suit exactement l'arc narratif recommande en 2026 :
accroche (hero) > confiance (value props) > produits (2 sections) > exploration (collections) > connexion emotionnelle (atelier + processus) > objections (FAQ) > conversion (newsletter).

C'est le pattern "narrative long-scroll" qui performe le mieux actuellement.

### 1.2 Performance et streaming

**Verdict : Au-dessus de la moyenne du marche**

- **Streaming SSR** avec Suspense + skeletons CLS-safe sur les 3 sections dynamiques (CuratedPicks, LatestCreations, CollectionsSection)
- **`"use cache"`** component-level sur les 5 sections statiques (Hero, ValueProps, AtelierStory, CreativeProcess, Newsletter)
- **Lazy loading conditionnel** : particules desktop-only (`ssr: false`, `matchMedia` 768px), CartSheet dynamique
- **Deduplication des promises** : `cartPromise` partagee entre CartSheet et CartIcon, `wishlistIdsPromise` partagee entre CuratedPicks et LatestCreations
- **Parallax desactive sur mobile** (economie de TBT/INP)
- **Preconnect CDN images** (UploadThing) dans layout.tsx
- **Code splitting** : CartSheet et SkuSelectorDialog en dynamic imports
- **Service worker Serwist** pour cache offline
- **Blur data URLs** sur toutes les images produit et atelier

**47% seulement des sites e-commerce passent les Core Web Vitals** -- Synclune est bien positionne.

### 1.3 Accessibilite

**Verdict : Quasi-WCAG 2.2 AA complet**

- **Skip links multiples** : global (layout), carousel collections, creative process (vers CTA)
- **Touch targets 44-48px** partout (depasse le minimum WCAG 2.2 de 24px)
- **`prefers-reduced-motion`** respecte sur CHAQUE animation via `motion-safe:` prefixes
- **Hierarchie de headings** correcte (h1 hero > h2 sections > h3 produits)
- **ARIA** systematique : `aria-labelledby`, `aria-describedby`, `role="list"`, `role="group"`, `role="img"`
- **Focus visible** avec ring 2px offset sur tous les elements interactifs
- **`<html lang="fr">`** declare
- **Titres sr-only** pour les sections ou le titre visuel est decore (AtelierStory)
- **Emojis accessibles** : `<span role="img" aria-label="...">` dans AtelierStory
- **Icones decoratives** marquees `aria-hidden="true"` systematiquement
- **Labels de navigation** : fleches carousel labelisees, boutons CTA avec `aria-describedby`

Couverture tres rare pour une boutique artisanale.

### 1.4 SEO / Donnees structurees

**Verdict : Tres complet**

- **JSON-LD `@graph`** global dans StructuredData (Organization, WebSite, LocalBusiness, Person, Article)
- **FAQPage schema** inline dans FaqSection (6 questions - eligible aux rich snippets)
- **ItemList schema** pour les coups de coeur (avec prix, disponibilite, auteur)
- **SearchAction** pour les sitelinks dans WebSite schema
- **AggregateRating** dans LocalBusiness (quand reviews existent)
- **Metadata OG/Twitter** complete avec canonical dans page.tsx
- **`data-voice-queries`** pour la recherche vocale/IA dans AtelierStory (avant-gardiste)
- **Microdata ItemList** dans ValuePropositionBar (position, name, description)
- **Article schema** pour le storytelling atelier (E-E-A-T avec liens sociaux auteur)
- **Product Offers** dans le schema CuratedPicks (prix en EUR, stock status)

### 1.5 Storytelling artisanal

**Verdict : Differenciateur fort**

- **AtelierStory** avec narration personnelle de Leane (exactement le pattern "crafter's story" recommande pour le luxe artisanal)
- **Polaroids avec washi tape** (esthetique scrapbook authentique, 4 photos rotations alternees)
- **CreativeProcess en 4 etapes** avec intensite visuelle progressive (ring + shadow grandissent a chaque etape)
- **Signature cursive** (Dancing Script) dans CuratedPicks et Newsletter (touche personnelle)
- **Citation personnelle** : "Celles que je porterais tous les jours !" dans CuratedPicks
- **Badge "Fait main"** dans CreativeProcess

> "Every piece tells a story -- your website should too" -- c'est exactement ce que fait Synclune.

### 1.6 RGPD / Cookie consent

**Verdict : Conforme CNIL**

- Boutons Accepter/Refuser de poids egal (pas de dark pattern)
- Expiration 6 mois
- Analytics conditionnelles au consentement
- Versioning de la politique

### 1.7 PWA et mobile

**Verdict : Tres bon**

- Service worker Serwist
- `dvh` units avec fallback
- Safe area insets pour les encoches
- Input font-size >= 16px (anti-zoom iOS)
- Breakpoint `xs: 375px` pour iPhone SE
- Carrousel collections avec `clamp(200px, 72vw, 280px)` pour responsive fluide
- Particules desactivees sur mobile (pas de JS inutile)

---

## PARTIE 2 : Problemes et ameliorations prioritaires

### 2.1 CRITIQUE -- Aucune preuve sociale visible sur la homepage

**Impact : -30 a -50% de conversions potentielles perdues**

C'est le probleme #1. Les stats sont claires :
- Afficher 5+ avis peut augmenter les conversions de **270%**
- 93% des consommateurs disent que les avis impactent leurs achats
- 88% font autant confiance aux avis en ligne qu'aux recommandations personnelles

**Etat actuel :** Les review stats existent dans les donnees structurees (`AggregateRating` dans LocalBusiness) mais sont **totalement invisibles** pour l'utilisateur. Aucun avis client, aucune note etoilee, aucune photo client n'apparait sur la homepage.

Le module `reviews/` est complet (creation, moderation, stats, medias, reponses admin) mais rien n'est expose sur la homepage.

**Recommandation :**
- **Section temoignages/avis** (nouvelle section entre Collections et AtelierStory) avec 3-5 avis clients sous forme de cartes avec etoiles, photo optionnelle, texte, et produit achete
- **Bandeau social proof dans le hero** : "X clients satisfaits" ou "Note moyenne 4.8/5" visible above-the-fold
- **Etoiles sur les ProductCard** : afficher la note moyenne et le nombre d'avis sur chaque carte produit

**Fichiers concernes :**
- `app/(boutique)/(accueil)/page.tsx` -- ajouter section + data fetch
- `modules/products/components/product-card.tsx` -- ajouter RatingStars (le composant existe deja dans `shared/components/rating-stars.tsx`)
- Nouvelle section `_components/testimonials-section.tsx`
- `modules/reviews/data/` -- nouvelle query pour les meilleurs avis homepage

### 2.2 IMPORTANT -- Hero sans produit visible

**Impact : Faible engagement above-the-fold**

Le hero actuel affiche des particules animees (coeurs + perles en drift) + texte rotatif ("colores", "uniques", "joyeux") + 2 CTA. C'est visuellement agreable mais ne montre **aucun bijou**. En 2026, les hero e-commerce performants montrent le produit immediatement -- le visiteur doit comprendre en < 3 secondes ce qui est vendu.

**Recommandation :**
- Ajouter une image hero de bijoux (lifestyle shot ou macro detail) ou un carrousel de produits phares
- Alternative : video autoplay muette (6-10s) montrant les bijoux portes ou le processus de creation
- Garder les particules comme fond subtil derriere l'image/video
- Ajouter un indicateur de social proof above-the-fold (note globale + nombre de clients)

**Fichiers concernes :**
- `app/(boutique)/(accueil)/_components/hero-section.tsx`

### 2.3 IMPORTANT -- Pas de UGC (User Generated Content)

**Impact : Manque de preuves "real life"**

Les photos polaroid de l'atelier sont statiques et montrent le processus, pas les clients portant les bijoux. En 2026, les galeries UGC shoppables (photos Instagram/TikTok de vrais clients) sont un standard pour les marques artisanales.

**Recommandation :**
- **Galerie Instagram/UGC** : Section "Portees par vous" ou "#Synclune" avec photos de clientes portant les bijoux, cliquables vers les produits correspondants
- A minima, integrer un lien vers le feed Instagram avec preview de quelques posts recents

### 2.4 IMPORTANT -- Newsletter sans incentive

**Impact : Taux d'inscription sous-optimal**

La section newsletter actuelle propose :
- Titre : "Ma newsletter"
- Texte : "Les nouveautes en avant-premiere, des offres exclusives et des surprises reservees aux abonnees !"
- Anti-spam : "1 a 2 emails par mois maximum"

C'est bien ecrit mais il manque un **incentive concret**. Les meilleures pratiques montrent que proposer un avantage clair augmente les inscriptions de 30-50%.

**Recommandation :**
- Ajouter un incentive clair : "-10% sur ta premiere commande" ou "Guide d'entretien bijoux offert"
- Rendre l'incentive visuel et prominent (badge ou highlight)

**Fichiers concernes :**
- `app/(boutique)/(accueil)/_components/newsletter-section.tsx`

### 2.5 MOYEN -- Pas de sticky CTA mobile

**Impact : Perte de conversions mobile (59% du trafic e-commerce en 2026)**

Apres avoir scroll passe le hero, le CTA principal disparait. Sur mobile, un bouton CTA sticky (en bas de l'ecran) ou une mini-barre de navigation flottante maintient l'intention d'achat tout au long du scroll.

**Recommandation :**
- Barre sticky mobile en bas de l'ecran apparaissant apres le hero : "Decouvrir la boutique" (CTA principal)
- Ou : integrer le lien boutique dans la navbar qui est deja sticky avec effet glass

### 2.6 MOYEN -- PlaceholderImage dans AtelierStory

Le composant `PlaceholderImage` est utilise pour les photos de l'atelier et de Leane. Si les vraies photos ne sont pas encore uploadees, c'est un probleme majeur de credibilite. Les vraies photos de l'atelier et de Leane sont essentielles pour le storytelling artisanal.

### 2.7 MINEUR -- Pas de compteurs/metriques de confiance

Des chiffres concrets rassurent : "200+ bijoux crees", "150+ clients satisfaits", "4.8/5 note moyenne". Un bandeau de chiffres cles entre les sections produits et l'histoire pourrait renforcer la confiance. Le composant `AnimatedNumber` existe deja dans `shared/components/animations/animated-number.tsx`.

### 2.8 MINEUR -- Inconsistances techniques

- **Schemas mixtes** : ValuePropositionBar utilise des microdata HTML tandis que le reste utilise JSON-LD. Google recommande de standardiser sur JSON-LD.
- **Breakpoint particles hardcode** : `desktop-particles.tsx` utilise `768px` en dur au lieu d'importer depuis les constantes partagees.
- **FAQ link injection fragile** : Le systeme `{{link0}}` dans `faq-section.tsx` pourrait casser si le texte de reponse contient accidentellement `{{linkN}}`. Pas de fallback si le tableau `links` est plus court que les placeholders.
- **Magic numbers animations** : Les delais de stagger (0.08, 0.1) et durees (0.6s) sont hardcodes dans chaque composant. Pourraient etre centralises.
- **Aucune validation des slugs** : `CURATED_PICKS_SLUGS` dans `curated-picks.ts` contient des slugs hardcodes sans verification d'existence en base.

---

## PARTIE 3 : Nouvelles implementations recommandees (par priorite)

### P1 -- Section Temoignages Clients (Impact: Tres eleve)

**Quoi :** Nouvelle section entre CollectionsSection et AtelierStory affichant 3-5 avis clients reels avec :
- Photo (optionnelle) + prenom + ville
- Note etoilee (composant `RatingStars` existe deja)
- Texte de l'avis
- Photo du produit achete (lien vers la fiche)
- Carrousel sur mobile, grille sur desktop

**Pourquoi :** Preuve sociale = levier de conversion #1 en 2026. Passer de 0 a 5 avis visibles peut generer +270% de conversions.

**Complexite :** Moyenne. Le module `reviews` est complet (`ReviewPublic` type avec user, rating, content, medias, response). Query `getAllProductReviews` existe. Il faut une nouvelle query pour les "meilleurs avis" homepage (5 etoiles, avec texte substantiel, recent) et un composant d'affichage.

### P2 -- Etoiles sur les Product Cards (Impact: Eleve)

**Quoi :** Afficher la note moyenne (etoiles) et le nombre d'avis sous le nom du produit dans les `ProductCard` de la homepage.

**Pourquoi :** Les etoiles sur les cartes produit augmentent le CTR de 15-25%.

**Complexite :** Faible. Le composant `RatingStars` existe deja avec support des decimales. Il faut enrichir les donnees produit avec les stats de reviews (`ProductReviewStats` via `getProductReviewStatsRaw`), ou passer les stats en prop. Ajouter 2-3 lignes dans `product-card.tsx`.

### P3 -- Indicateur de social proof dans le Hero (Impact: Eleve)

**Quoi :** Petit badge sous les CTA du hero : "4.8/5 -- 120+ avis clients" avec etoiles.

**Pourquoi :** Social proof above-the-fold = l'un des 5 elements critiques du "3-second test" en 2026.

**Complexite :** Faible. Les review stats sont deja fetchees en haut de page.tsx (`getGlobalReviewStats()`). Le hero utilise `"use cache"` donc il faut soit un composant client separe qui recoit la promise, soit deplacer le badge hors du hero cache. Type `GlobalReviewStats` = `{ totalReviews: number, averageRating: number }`.

### P4 -- Image/Video produit dans le Hero (Impact: Eleve)

**Quoi :** Remplacer ou completer le fond de particules par une photo lifestyle de bijoux.

**Pourquoi :** Le visiteur doit voir le produit en < 3 secondes. Les particules (coeurs + perles) sont jolies mais ne communiquent pas "bijoux".

**Complexite :** Faible a moyenne selon le choix (image statique vs video).

### P5 -- Section "Chiffres cles" (Impact: Moyen)

**Quoi :** Bandeau avec compteurs animes : "X bijoux crees", "X clients satisfaits", "4.X/5 note moyenne", "Fait main a Nantes".

**Pourquoi :** Les metriques concretes transforment les promesses en preuves.

**Complexite :** Faible. Le composant `AnimatedNumber` existe deja avec spring animation, formatage FR, et support reduced-motion. Il suffit de creer une section wrapper et de fetcher les stats depuis la base.

### P6 -- Incentive Newsletter (Impact: Moyen)

**Quoi :** Ajouter "-10% sur ta premiere commande" ou equivalent.

**Pourquoi :** +30-50% d'inscriptions newsletter avec un incentive concret.

**Complexite :** Tres faible. Modification de texte + eventuellement un badge visuel dans `newsletter-section.tsx`.

### P7 -- Galerie UGC / Instagram (Impact: Moyen)

**Quoi :** Section "Vu sur Instagram" ou "Portees par vous" avec 4-8 photos de clientes portant les bijoux.

**Pourquoi :** UGC = preuve sociale la plus credible.

**Complexite :** Moyenne a elevee selon l'approche (integration API Instagram vs upload manuel).

### P8 -- AI Chat Assistant (Impact: Moyen-Eleve, long terme)

**Quoi :** Chatbot IA pour conseils (taille, materiaux, idees cadeaux, personnalisation).

**Pourquoi :** Les visiteurs interagissant avec un chat IA convertissent a 12.3% vs 3.1% sans. Pertinent pour la personnalisation de bijoux.

**Complexite :** Elevee.

### P9 -- Personnalisation dynamique homepage (Impact: Moyen, long terme)

**Quoi :** Adapter les "Coups de coeur" et "Nouveautes" selon l'historique de navigation.

**Pourquoi :** 91% des consommateurs preferent les marques qui personnalisent.

**Complexite :** Elevee. Le moteur `get-related-products.ts` existe mais n'est pas utilise sur la homepage.

---

## PARTIE 4 : Verdict par section

| Section | Utile ? | Verdict |
|---------|---------|---------|
| **HeroSection** (texte rotatif + particules) | Oui, mais incomplet | Le texte rotatif est engageant, mais il manque une image produit et du social proof |
| **ValuePropositionBar** (4 piliers) | Tres utile | Pattern classique qui fonctionne. Les 4 piliers sont pertinents. Garder tel quel |
| **CuratedPicks** (coups de coeur) | Tres utile | L'authenticite "choix de Leane" + citation personnelle est differenciante. Ajouter les etoiles |
| **LatestCreations** (nouveautes) | Tres utile | Contenu dynamique qui incite au retour. Ajouter les etoiles |
| **CollectionsSection** (carrousel) | Utile | Bon pour l'exploration. Carrousel bien implemente avec skip link et fleches labelisees |
| **AtelierStory** (histoire + polaroids) | Tres utile | Differenciateur #1. Le storytelling artisanal est exactement ce que recommandent les experts 2026 |
| **CreativeProcess** (4 etapes) | Utile | Transparence sur le savoir-faire = confiance. Le parallax desktop est bien dose |
| **FaqSection** (6 questions) | Tres utile | Couvre les objections principales. Le schema FAQPage est un bon SEO move |
| **NewsletterSection** | Utile, a ameliorer | Bonne position en fin de page mais manque d'incentive |
| **Particules desktop** (coeurs + perles) | Discutable | Beau techniquement mais ne communique pas "bijoux". Pourrait etre remplace par du contenu produit |
| **Galerie polaroid** (atelier) | Tres utile | Esthetique authentique et chaleureuse, parfait pour l'artisanal |
| **ScrollProgressLine** | Utile | Micro-interaction subtile qui renforce le sentiment de progression |
| **GlitterSparkles** (newsletter bg) | Delicat | Coherent avec l'univers bijoux mais masque sur mobile (bon choix performance) |
| **StructuredData** (@graph) | Tres utile | Consolidation exemplaire des schemas. Streaming non-bloquant via Suspense |

---

## PARTIE 5 : Analyse technique detaillee par fichier

### page.tsx

| Aspect | Evaluation |
|--------|------------|
| Architecture | Streaming SSR exemplaire : promises paralleles + Suspense boundaries |
| Cache | Delegation aux composants enfants (`"use cache"` dans chaque section statique) |
| Data flow | `reviewStatsPromise` + `wishlistIdsPromise` dupliques intelligemment |
| Skeletons | CLS-safe avec `CuratedPicksSkeleton`, `LatestCreationsSkeleton`, `CollectionsSectionSkeleton` |

### hero-section.tsx

| Aspect | Evaluation |
|--------|------------|
| Cache | `"use cache"` + `cacheLife("reference")` -- contenu statique, cache long |
| Performance | Particules en lazy load desktop-only, pas d'images (pas de LCP penalise) |
| A11y | `role="region"`, `aria-labelledby`, `aria-describedby`, `ScrollIndicator` masque mobile |
| SEO | `itemProp="headline"` sur le h1 |
| Manque | Image produit, social proof, le hero ne montre pas ce qui est vendu |

### value-proposition-bar.tsx

| Aspect | Evaluation |
|--------|------------|
| Cache | `"use cache"` + `cacheLife("reference")` |
| A11y | Titre sr-only, `role="list"` + `role="listitem"`, icones `aria-hidden` |
| SEO | Microdata ItemList (position, name, description par pilier) |
| Animation | `motion-safe:` prefixes, glow via CSS custom properties |
| Note | Seule section utilisant microdata au lieu de JSON-LD (inconsistance mineure) |

### curated-picks.tsx

| Aspect | Evaluation |
|--------|------------|
| Data | Promise streaming via `use()`, guard `< 2 products` |
| SEO | Schema ItemList inline via `generateCuratedPicksSchema` |
| A11y | sr-only description "Selection de bijoux artisanaux...", `aria-describedby` sur CTA |
| Storytelling | Citation Dancing Script + emojis Leane |
| Config | Slugs hardcodes dans `curated-picks.ts` (pas de validation DB) |

### latest-creations.tsx

| Aspect | Evaluation |
|--------|------------|
| Data | Promise streaming via `use()`, guard `length === 0` |
| A11y | `aria-labelledby`, `aria-describedby`, sr-only CTA description |
| UX | Baymard-compliant "Nouvelles creations" (full scope label, pas juste "Nouveautes") |

### collections-section.tsx

| Aspect | Evaluation |
|--------|------------|
| Data | Promise streaming, extraction d'images via `extractCollectionImages()` |
| A11y | Skip link carousel, fleches labelisees, `containScroll="trimSnaps"` |
| Responsive | `clamp(200px, 72vw, 280px)` mobile, `md:basis-1/3 lg:basis-1/4` desktop |
| Guard | `showArrows = collections.length > 3` (suppose 3 items visibles -- fragile) |

### atelier-story.tsx

| Aspect | Evaluation |
|--------|------------|
| Cache | `"use cache"` + `cacheLife("reference")` |
| Storytelling | Narration personnelle, polaroids rotatifs, washi tape |
| A11y | Titre h2 sr-only, emojis `role="img"`, decoratifs `aria-hidden`, group pour galerie |
| SEO | `data-voice-queries`, `data-content-type="about-creator"` |
| Attention | Utilise `PlaceholderImage` -- verifier que les vraies photos sont uploadees |

### creative-process.tsx

| Aspect | Evaluation |
|--------|------------|
| Cache | `"use cache"` + `cacheLife("reference")` |
| A11y | Skip link vers CTA, numeros d'etapes sr-only, articles semantiques, 48px touch targets |
| Animation | Intensite progressive par etape (ring + shadow), hover par icone (rotation, scale, glow) |
| Performance | Parallax desktop-only via `ParallaxImage`, `quality={80}`, blur data URL |
| Risque | `ScrollProgressLine` -- verifier que le scroll listener utilise `requestAnimationFrame` |

### faq-section.tsx

| Aspect | Evaluation |
|--------|------------|
| SEO | FAQPage JSON-LD inline, `inLanguage: "fr-FR"`, escape `\\u003c` |
| A11y | `aria-labelledby`, accordion delegue au composant enfant `FaqAccordion` |
| Fragilite | Injection de liens via `{{link\d+}}` regex -- pas de fallback si index manquant |
| Pas de cache | Synchrone, pas de `"use cache"` (pourrait beneficier de cache reference) |

### newsletter-section.tsx

| Aspect | Evaluation |
|--------|------------|
| Cache | `"use cache"` + `cacheLife("reference")` |
| A11y | `aria-labelledby`, `aria-describedby` |
| UX | Anti-spam + signature cursive |
| Manque | Pas d'incentive concret (-10%, guide offert, etc.) |
| Background | GlitterSparkles desktop-only (12 sparkles, 4-8px) |

### product-card.tsx

| Aspect | Evaluation |
|--------|------------|
| Performance | Priority loading pour les 4 premieres images, sizes responsive, blur placeholder |
| A11y | IDs uniques via `sectionId`, badges `role="status"`, wishlist/cart accessible |
| UX | Badge urgency stock bas, glow pastel hover, lift effect 2D, reduced-motion safe |
| Manque | Pas d'etoiles / note moyenne affichee |
| Data | `getProductCardData()` O(n) single-pass pour SKU, prix, stock, image, couleurs |

### structured-data.tsx

| Aspect | Evaluation |
|--------|------------|
| SEO | `@graph` consolide : Organization, WebSite, LocalBusiness, Person, Article |
| Performance | Promise streaming via `use()` + Suspense |
| AggregateRating | Inclus dans LocalBusiness si reviews existent |
| Note | Article schema hardcode dans le composant (pourrait etre factorise) |

---

## PARTIE 6 : Ordre d'implementation recommande

### Sprint 1 (Impact immediat, complexite faible)

| # | Tache | Priorite | Effort |
|---|-------|----------|--------|
| 1 | Indicateur social proof dans le hero (P3) | Critique | ~2h |
| 2 | Etoiles sur les ProductCard homepage (P2) | Eleve | ~3h |
| 3 | Incentive newsletter (P6) | Moyen | ~30min |

### Sprint 2 (Impact eleve, complexite moyenne)

| # | Tache | Priorite | Effort |
|---|-------|----------|--------|
| 4 | Section temoignages clients (P1) | Critique | ~6h |
| 5 | Image/video produit dans le hero (P4) | Eleve | ~4h |
| 6 | Section chiffres cles (P5) | Moyen | ~3h |

### Sprint 3 (Enrichissement)

| # | Tache | Priorite | Effort |
|---|-------|----------|--------|
| 7 | Galerie UGC / Instagram (P7) | Moyen | ~8h |
| 8 | Sticky CTA mobile (2.5) | Moyen | ~3h |
| 9 | Verifier/remplacer PlaceholderImages (2.6) | Moyen | ~1h |
| 10 | Corriger inconsistances techniques (2.8) | Mineur | ~2h |

### Sprint 4 (Long terme)

| # | Tache | Priorite | Effort |
|---|-------|----------|--------|
| 11 | AI Chat Assistant (P8) | Moyen | ~20h+ |
| 12 | Personnalisation dynamique (P9) | Moyen | ~15h+ |
| 13 | A/B testing infrastructure | Moyen | ~10h+ |

---

## PARTIE 7 : Verification

Pour valider les ameliorations :

- **Performance :** `pnpm build` + Lighthouse audit (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- **SEO :** Verifier les JSON-LD via Google Rich Results Test
- **Accessibilite :** Audit axe-core + navigation clavier manuelle + VoiceOver
- **Mobile :** Tester sur iPhone SE (375px), iPhone standard, et tablette
- **Conversions :** Mettre en place Vercel Analytics pour mesurer l'impact avant/apres

---

## Resume executif

**Score global : 8/10** -- La landing page est techniquement excellente (performance, accessibilite, SEO, storytelling). Le deficit principal est l'absence totale de preuve sociale visible (avis clients, etoiles, temoignages) malgre un module reviews complet en backend. Combler ce manque est la priorite #1 pour maximiser les conversions.

| Categorie | Note | Commentaire |
|-----------|------|-------------|
| Performance | 9/10 | Streaming SSR, cache, code splitting, lazy loading |
| Accessibilite | 9/10 | Skip links, ARIA, reduced-motion, touch targets |
| SEO | 8.5/10 | @graph, FAQPage, ItemList, microdata |
| Storytelling | 9/10 | Narration authentique, polaroids, processus creatif |
| Preuve sociale | 2/10 | Aucun avis, etoile ou temoignage visible |
| Conversion | 6/10 | Bon flux narratif mais manque de social proof et incentive |
| Mobile | 8/10 | PWA, responsive, mais pas de sticky CTA |
