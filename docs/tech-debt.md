# Tech Debt Tracker

> Single source of truth for known technical debt in Synclune. Update on every audit close and on every `chore(debt):` payment. Do not let debt rot in private memory.

**Last updated:** 2026-05-19 (ReviewsSection UI/UX audit)
**Cadence:** revue mensuelle ; chaque audit doit ajouter ou solder une entrée ici.

---

## P1 — High impact / scheduled

### `modules/media/hooks/use-media-upload.ts` — monolithe 904 lignes

- **Why it's debt:** seul vrai monolithe de code production. Mêle queue, retry, offline IndexedDB, progress tracking, validation. Hook unique difficile à tester en isolation.
- **Plan:** splitter en 3 hooks composables — `useUploadQueue` + `useUploadProgress` + `useOfflineQueue` (~300 lignes chacun).
- **Owner:** TBD
- **Test cible:** upload PDP + admin produits + offline queue manuel; tests existants (`modules/media/hooks/__tests__/`) doivent rester verts.
- **Status:** **PENDING** — déprioritisé sprint 2026-05-18, gardé tracké.

### Commits historiques non-Conventional (sur main pre-2026-05-18)

- **Why it's debt:** 318/439 commits sur 3 mois (72%) non-conformes au format Conventional. Brise changelog auto, gêne `git bisect` / `git blame`, masque l'intent.
- **Plan:** ne PAS réécrire l'historique main (force-push interdit). Le CI bloque désormais les nouveaux commits non-conformes (`commitlint` job + PR title validation).
- **Status:** **CONTAINED** — flux entrant proprement géré ; historique non rétroactif accepté.

---

## P2 — Medium impact / nice to have

### Exceptions de structure DDD non documentées dans CONTRIBUTING.md

- **Why it's debt:** 6 modules ont un sous-dossier `lib/` (`auth`, `cart`, `media`, `refunds`, `wishlist`) ; 3 modules spécialisés divergent du pattern complet (`emails/`, `cron/`, `webhooks/`). Documenté dans CLAUDE.md mais pas dans CONTRIBUTING.md.
- **Plan:** ajouter section "Module exceptions" dans CONTRIBUTING.md référençant CLAUDE.md.
- **Status:** **OPEN**.

### Imports Prisma directs (281 occurrences)

- **Why it's debt:** modules importent directement `from "@/app/generated/prisma/{client,browser,enums}"` plutôt qu'un barrel central. DRY violé.
- **Plan:** **ne PAS centraliser** — cf. [[feedback-no-prisma-barrel-no-form-any-justification]]. Décision user : imports directs assumés comme DX préférée. `shared/types/prisma.ts` reste isolé pour `PrismaTransaction` uniquement.
- **Status:** **WONT FIX** (décision design).

### `form: any` dans cards admin produits

- **Why it's debt:** 5 cards (`stock-card.tsx`, `status-card.tsx`, `variant-card.tsx`, `media-array-card.tsx`, `pricing-card.tsx`) utilisent `form: any` avec `eslint-disable-next-line`.
- **Plan:** **ne PAS typer** — TanStack Form `useAppForm` ne se prête pas à un typage générique cross-instance ; JSDoc `media-array-card.tsx:30-37` documente la décision. Cards partagées entre 3 form instances (Create/Edit Product, Create/Edit SKU).
- **Status:** **WONT FIX** (décision design, cf. [[feedback-no-prisma-barrel-no-form-any-justification]]).

### Test fixtures `Color` sans `description` (typecheck failures pré-existantes)

- **Why it's debt:** Le model `Color` a un champ `description: String?` mais les fixtures dans `app/(shop)/creations/[slug]/page.tsx:119,124` et `modules/products/components/__tests__/sticky-cart-cta.test.tsx:394` ne le fournissent pas → 3 erreurs typecheck.
- **Plan:** ajouter `description: null` aux fixtures concernées.
- **Status:** **OPEN** (3 erreurs `pnpm typecheck` à corriger).

### `@deprecated` markers actifs (3)

- `modules/refunds/hooks/use-create-refund-form.ts:35,40` — migration path `@/modules/refunds/services/refund-restock.service`
- `modules/product-types/utils/cache.utils.ts:30` — migration path documenté
- **Plan:** supprimer les exports `@deprecated` après audit consommateurs (`grep -rn` racine).
- **Status:** **OPEN** — vivant tant que consommateurs restent ; risque drift code.

### 4 deps "exotiques" health check 2026-05-18

- `color@5.0.3` — **REMOVED 2026-05-18** (orphelin knip).
- `heic-to@1.4.2` — conversion HEIC pour upload media iPhone. **OK** — sur dernière version, modifié 2026-02-03 (actif).
- `libphonenumber-js@1.12.43` — validation numéros téléphone (forms commande). **BUMP CANDIDATE** — dernière release `1.13.2` (2026-05-15) → bump minor disponible. Surveiller via Dependabot.
- `thumbhash@0.1.1` — placeholder image LQIP. **STALE MAINTAINER** — dernière release 2023-03-22 (3 ans). Petit package (algorithme déterministe), risque faible mais à monitorer. Alternative : `blurhash` si besoin de fork actif.
- **Plan:** vérif trimestrielle via `npm view <pkg> version time` ; remplacer `thumbhash` si CVE remonte.
- **Status:** **TRACKED** — Dependabot couvre les bumps automatiques.

### JSDoc faible sur fonctions publiques `services/` + `data/`

- **Why it's debt:** revendiqué dans l'audit Qualité 2026-05-18 avec ratio ~1.3 `/**` par fichier.
- **Vérification 2026-05-18 :** **FAUX POSITIF partiel** — la métrique `wc /**` par fichier surestimait la dette. Vérification ciblée des 5 modules critiques :
  - `payments/` : 100% des exports publics documentés (services + actions + utils)
  - `orders/` : 57 JSDoc blocks pour 24 fichiers (~2.4/file)
  - `cart/` : 41 blocks pour 11 fichiers (~3.7/file)
  - `refunds/` : 27 blocks pour 8 fichiers (~3.4/file)
  - `webhooks/` : 16 blocks pour 5 fichiers (~3.2/file)
- **Plan:** pas d'action systématique. Ajouter au passage des audits module si une fonction publique est trouvée sans JSDoc.
- **Status:** **WONT FIX BULK** — couverture déjà adéquate sur paths critiques.

### `knip` non intégré en CI

- **Why it's debt:** `knip.config.ts` configuré mais `pnpm knip` jamais exécuté en CI. Orphelins réintroduits silencieusement.
- **Plan:** ajouter job CI `knip` non-bloquant (warning) au `quality` workflow.
- **Status:** **OPEN**.

### Pas de `pnpm.overrides`

- **Why it's debt:** transitive vulnerabilities subies (pas pinées). Dependabot remonte les directs uniquement.
- **Plan:** définir `pnpm.overrides` pour deps critiques sécurité (`stripe`, `zod`, `next`, `prisma`) dans `package.json`.
- **Status:** **OPEN** — risque modéré.

---

## P3 — Low impact / future considerations

### Pas de barrel `index.ts` (choix assumé, friction onboarding)

- **Status:** **WONT FIX** (documenté dans CONTRIBUTING.md:96 "no barrel re-exports").

### Pre-push hook format check

- **Status:** **OPEN** — optionnel ; `lint-staged` couvre pre-commit, `--no-verify` peut bypass.

### ESLint `max-lines-per-function`

- **Status:** **OPEN** — peut catch monolithes futurs.

### Tagger les 4 E2E orphelins (`e2e/quick-search.spec.ts` lignes 178+)

- **Status:** **OPEN** — risque régression silencieuse.

### Page `/avis` publique dédiée (Phase 2 social proof)

- **Why it's debt:** la `ReviewsSection` homepage n'affiche que 6 avis featured ; aucun moyen pour les visiteurs de lire l'ensemble des avis publiés sans naviguer produit par produit. CTA actuel renvoie vers le catalogue trié par note (`/produits?sortBy=rating-descending`) — pertinent côté conversion, pas côté trust.
- **Plan:** créer `app/(shop)/avis/page.tsx` paginated (cache `reference`), helper `getPublishedReviews({ page, perPage, filterRating })`, structured data `Review[]` propre + breadcrumb, lien secondaire "Lire tous les avis" dans la `ReviewsSection`.
- **Status:** **DEFERRED** — user a explicitement choisi de garder le CTA produits (audit 2026-05-19). Reporter quand : (1) signal data analytics montre une demande utilisateur, OU (2) phase de croissance dédiée social proof.

### Badge "Avis vérifiés (achat confirmé)" sous l'agrégat

- **Why it's debt:** signal trust Baymard #84 (review authenticity) absent. Synclune envoie des `send-review-request-email` post-livraison ce qui suggère un mécanisme d'avis vérifié, mais l'UI ne le communique pas.
- **Plan:** (1) confirmer factuellement que tous les avis affichés sont liés à un `order.fulfillmentStatus = DELIVERED` ; (2) si oui, ajouter sous l'agrégat un `<span className="text-muted-foreground text-xs">Tous nos avis sont vérifiés (achat confirmé)</span>`.
- **Status:** **DEFERRED** — vérification mécanisme + arbitrage copy requis.

### Workflow CI auto-review sur modules critiques

- **Status:** **DEFERRED** — `/review` ou `/security-review` automatique sur PRs touchant `modules/payments|webhooks|auth|refunds`. Nécessite secret `ANTHROPIC_API_KEY` + budget API récurrent. CodeQL déjà câblé (`.github/workflows/codeql.yml`) couvre les vulnérabilités statiques. Reporter quand : (1) un incident sécu confirme la valeur, OU (2) la cadence PR critique justifie l'investissement.

### ~~Doc `axe-core/playwright` + tests a11y E2E~~

- **Vérification 2026-05-18 :** **FAUX POSITIF audit Qualité de Code**. `@axe-core/playwright@4.11.3` est déjà en `devDependencies`. Specs câblées : `e2e/accessibility.spec.ts`, `e2e/mobile-accessibility.spec.ts`, `e2e/a11y/` (5 fichiers : `components-a11y`, `keyboard-navigation`, `live-regions`, `skip-links`, `zoom-a11y`), helper `e2e/helpers/axe.ts`.
- **Status:** **WONT FIX** — déjà en place. L'audit avait surestimé l'absence en se basant sur PR template sans grep racine.

---

## Historique de paiement de dette

| Date       | Action                                                                                    | Source                |
| ---------- | ----------------------------------------------------------------------------------------- | --------------------- |
| 2026-05-18 | Suppression 18 fichiers orphelins via knip baseline                                       | Quality of Code audit |
| 2026-05-18 | Retrait dep `color@5.0.3` (orphelin)                                                      | Quality of Code audit |
| 2026-05-18 | `pnpm lint` → `--max-warnings=0` (zero-warning policy)                                    | Quality of Code audit |
| 2026-05-18 | CI : PR title validation commitlint (squash merge case)                                   | Quality of Code audit |
| 2026-05-18 | CONTRIBUTING.md : section Conventional Commits enrichie + commitlint dans required checks | Quality of Code audit |
| 2026-05-18 | Test contract `stripe-events.test.ts:178` `?.due_by` retiré                               | Quality of Code audit |
| 2026-05-19 | ReviewsSection : copy neutralisé + `inView once` + `bg-muted/15` + `formatReviewCount`    | ReviewsSection audit  |
| 2026-05-19 | `homepage-review-card` : `motion-safe:` sur transitions shadow/border                     | ReviewsSection audit  |
| 2026-05-19 | `reviews-section` : `viewTransitionName` orphelin retiré, aria-describedby CTA            | ReviewsSection audit  |

---

## Voir aussi

- **Audits historiques détaillés** : `MEMORY.md` (privé Claude Code) — résumés par sprint (15+ audits depuis 2026-05-12).
- **Audit Qualité de Code 2026-05-18** : `.claude/plans/m-ne-un-audit-complet-zippy-shamir.md`
- **Audit Data Quality 2026-05-18** : `.claude/plans/audit-et-note-ceci-declarative-wind.md`
- **Audit ReviewsSection 2026-05-19** : `.claude/plans/m-ne-un-audit-complet-smooth-clock.md`
