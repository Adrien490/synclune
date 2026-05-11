---
title: Synclune — Audit Framework
version: 2.0.0
last-reviewed: 2026-05-10
owner: Adrien (adrien.poirier49@gmail.com)
status: stable
applies-to:
  - Next.js 16.2
  - React 19.2
  - TypeScript 5.x strict
  - Prisma 7
  - Stripe (latest API version)
license: internal
---

# Synclune — Audit Framework

Source unique pour auditer le code Synclune selon les standards Next.js 16.2, React 19.2 et les conventions DDD du projet. Le framework produit des rapports structurés, mesurables et reproductibles.

## Quick start (3 étapes)

```
1. Choisir une cible :
   - Module isolé   → docs/audit/02-modules.md (1 prompt parmi 22)
   - Cross-module   → docs/audit/03-cross-module.md (cohérence inter-modules)
   - Foundations    → docs/audit/04-foundations.md (shared/, app/, prisma/, configs)

2. Coller dans une session Claude Code fraîche, dans cet ordre :
   - docs/audit/00-standards.md      (standards externes)
   - docs/audit/01-conventions.md    (conventions Synclune)
   - docs/audit/glossary.md          (acronymes)
   - Le prompt cible
   - + facultatif : docs/audit/patterns-cookbook.md (snippets référence)

3. Demander un rapport au format défini ci-dessous (§ Format finding).
   NE PAS demander d'application directe.
```

## Architecture du framework

```
docs/audit/
├── README.md                  ← vous êtes ici (index, priorités, format, DoD)
├── CHANGELOG.md               ← versioning sémantique du framework
├── 00-standards.md            ← Next.js 16.2 / React 19.2 / TS / WCAG / OWASP / perf
├── 01-conventions.md          ← Synclune : layering, auth, cache, forms, Zustand
├── 02-modules.md              ← 22 prompts (un par module DDD)
├── 03-cross-module.md         ← audit transversal (cache tags, state machines, naming)
├── 04-foundations.md          ← shared/, app/, prisma/, config files
├── glossary.md                ← PPR, CVA, AAA, SCA, PSD2, CLS, LCP, INP, etc.
└── patterns-cookbook.md       ← ~30 snippets avant/après idiomatiques
```

**Pourquoi cette séparation ?** Standards externes et conventions projet ont des cycles de vie différents. Une bump Next.js 16.2 → 16.3 modifie `00-standards.md` sans toucher au reste. Un changement de pattern interne touche `01-conventions.md` sans toucher aux standards.

## Définition stricte des priorités

Critères mesurables — pas de subjectivité.

### P0 — Action requise avant prochain déploiement

Au moins UN des critères suivants :

- **Sécurité** : faille auth/autorisation, injection (SQL/XSS/SSRF), secret exposé, open redirect, CSRF, IDOR.
- **Data loss** : suppression non réversible non confirmée, race condition sur stock/paiement, corruption transactionnelle.
- **Conformité** : violation RGPD, conformité fiscale FR (TVA / facture séquentielle), PSD2/SCA absent.
- **Production-blocking** : page 500, build cassé, type erreur, test critical path rouge.

### P1 — Action sous 2 sprints

Au moins UN des critères suivants :

- **Maintenabilité** : duplication > 20 LOC, cyclomatic complexity > 10, fichier > 300 LOC sans split, couplage circulaire.
- **Type safety** : `any` non justifié, `as` cast non type guard, schema/type désynchronisés.
- **Bug non-bloquant** : edge case ignoré, erreur silenciée (try/catch sans log/rethrow).
- **Dette > 1 jour** à corriger.
- **Layering violé** : mutation dans `data/`, I/O dans `services/`, read non transactionnel dans `actions/` hors exceptions documentées.

### P2 — Backlog opportuniste

- **Polish** : naming inconsistant, magic numbers, commentaires redondants.
- **Micro-perf** : optimisation < 5% gain mesuré.
- **Cosmétique** : refactor lisibilité sans impact fonctionnel.

## Format finding (template obligatoire)

Chaque finding du rapport DOIT respecter ce schéma :

````md
### [P0|P1|P2].N — <titre court (≤ 80 char)>

- **Fichier** : `path/to/file.ts:LINE`
- **Problème** : <1-2 phrases factuelles>
- **Impact** : <utilisateur final | sécurité | perf chiffrée | dev experience>
- **Critère** : <quel critère P0/P1/P2 ci-dessus est déclenché>
- **Correctif** :
  ```diff
  - <ancien>
  + <nouveau>
  ```
````

- **Tests à ajouter** : <vitest unit | playwright @critical | aucun>
- **Effort estimé** : <S (≤ 1h) | M (1-4h) | L (1j) | XL (> 1j)>

```

## Definition of done (universelle pour chaque audit)

Un audit est **terminé** quand :

- [ ] Tous les bullets du prompt examinés (justifier les non-applicables — ne pas omettre).
- [ ] Rapport P0/P1/P2 + section "Faux positifs / volontaires" livré.
- [ ] Pour chaque P0/P1 : finding au format ci-dessus complet (pas de bullet flou).
- [ ] `pnpm typecheck` lancé en fin (rapport seulement) — note score.
- [ ] `pnpm test --run modules/<nom>` lancé — note tests passants/total.
- [ ] Si critical path : `pnpm test:critical` lancé — note score.
- [ ] Note avant/après sur 10 documentée par axe (architecture / type safety / lisibilité / a11y / perf / tests / sécurité).
- [ ] Plan d'application : ordre, risques, scope migrations Prisma.

## Anti-patterns absolument proscrits

Quel que soit l'audit, signaler ces patterns en P0 ou P1 selon contexte :

| Pattern | Priorité | Raison |
|---|---|---|
| `useMemo` / `useCallback` / `React.memo` | P1 | React 19 compilateur optimise — bruit + risque contre-productif |
| Mock DB sur tests d'intégration `cart`/`orders`/`payments`/`webhooks`/`auth`/`discounts`/`refunds` | P0 | Incident historique mock/prod divergence |
| `any` non commenté | P1 | Type safety perdue silencieusement |
| `// @ts-ignore` / `// @ts-expect-error` sans raison + ticket | P1 | Dette type masquée |
| `dangerouslySetInnerHTML` non sanitized (DOMPurify) | P0 | XSS |
| `$queryRawUnsafe` avec input user | P0 | SQL injection |
| `console.log` en prod | P1 | Pollution logs + PII potentiel |
| `try/catch` qui swallow (no log, no rethrow, no Sentry) | P1 | Bugs invisibles |
| `useEffect` pour transformer props/state (calcul dérivé) | P1 | Bug double-render StrictMode + perf |
| `setTimeout`/`setInterval`/`addEventListener` dans `useEffect` sans cleanup | P1 | Memory leak |
| `cookies()` / `headers()` / `params` accédés sync (sans `await`) | P0 | Build break Next.js 16 |
| Mutation Prisma dans `data/` | P1 | Layering violé |
| I/O (prisma, fetch) dans `services/` (hors exceptions documentées) | P1 | Layering violé, intestable |
| Server Action sans `requireAuth`/`requireAdmin` quand requis | P0 | Privilege escalation |
| `updateTag` oublié après mutation | P1 | Stale data |
| Touch target < 44×44px sur mobile | P1 | WCAG 2.5.5 + UX |
| Contraste < 4.5:1 (texte normal) ou 3:1 (large) | P1 | WCAG AA |
| Image sans `sizes` prop responsive | P1 | Bandwidth gaspillé |
| Hardcoded couleur/spacing au lieu de design token | P2 | Drift design system |
| Speculation Rules | N/A | Refusé par owner (ne pas proposer) |
| AutoFocus dans form (hors search dialogs) | N/A | Refusé par owner |
| Double back button admin mobile | N/A | Refusé par owner |
| Icônes sur HeroReassuranceBanner | N/A | Refusé par owner |
| `Cancel` button sur create-product-form admin | N/A | Refusé par owner (asymétrie volontaire) |

## Ce qui n'est PAS audité par ce framework

Pour éviter les faux questionnements en cours d'audit :

- `tests/e2e/` Playwright : audité séparément via `pnpm e2e` (couverture, flakiness).
- `public/` assets statiques : hors scope code review.
- `.github/workflows/` : audit CI/CD séparé.
- `scripts/` shell utilitaires : hors scope sauf si contiennent logique métier.
- Migrations Prisma déjà appliquées en prod : irreversibles, focus sur les nouvelles.
- `node_modules/` / `.next/` / build artifacts : évidence.

## Versioning du framework

Voir [CHANGELOG.md](./CHANGELOG.md). Toute mise à jour majeure (split, ajout d'un prompt, changement de format finding) bump la version mineure. Toute correction technique bump le patch.

## Maintenance

| Évènement | Action |
|---|---|
| Bump Next.js minor (16.2 → 16.3) | Relire `00-standards.md`, mettre à jour différences API |
| Bump React minor (19.2 → 19.3) | Idem `00-standards.md` |
| Nouveau module `modules/<nom>` | Ajouter prompt dans `02-modules.md` + entrée TOC |
| Nouveau pattern projet | Ajouter dans `01-conventions.md` + cookbook si snippet utile |
| Memory feedback owner explicite | Matérialiser dans `01-conventions.md` § feedbacks |
| Bug récurrent détecté en prod | Ajouter en anti-pattern P0/P1 dans ce README |

Owner du framework : Adrien. PR `docs:` obligatoire pour toute modification.
```
