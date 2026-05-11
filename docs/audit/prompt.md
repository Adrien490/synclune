Tu vas mener un audit complet d'un module Synclune en suivant le framework `docs/audit/`.

# Préparation

Lis dans cet ordre (CLAUDE.md est déjà chargé automatiquement) :

1. `docs/audit/00-standards.md` — standards externes (Next.js 16.2, React 19.2, TypeScript strict, WCAG, OWASP, perf)
2. `docs/audit/01-conventions.md` — conventions Synclune audit-specific (exceptions layering, règles d'or, memory feedbacks owner)
3. `docs/audit/glossary.md` — acronymes + termes métier projet
4. `docs/audit/02-modules.md` — extraire UNIQUEMENT la section `Audit modules/<MODULE>` correspondant au module demandé en bas de ce prompt
5. `docs/audit/patterns-cookbook.md` — référence "avant/après" si besoin de patterns idiomatiques

# Méthodologie

1. Lis le code du module ciblé en intégralité : `modules/<MODULE>/{actions,data,services,components,schemas,constants,hooks,types,utils,lib}`

- `__tests__`.

2. Pour chaque bullet du prompt module dans `02-modules.md`, vérifie l'application réelle dans le code (pas de présomption — grep / read
   réel).
3. Compare aussi avec :
   - Anti-patterns absolus du `README.md § Anti-patterns absolument proscrits` (proscrire systématiquement).
   - Memory feedbacks owner du `01-conventions.md § Memory feedbacks` (ne JAMAIS proposer ce qui est refusé).
4. Si un bullet ne s'applique pas, le justifier explicitement (ne pas l'omettre).

# Format de sortie

## 1. Synthèse

- Note avant /10 par axe : architecture, type safety, lisibilité, a11y, perf, tests, sécurité.
- Note globale /10.
- Forces (3-5 bullets).
- Faiblesses systémiques (3-5 bullets).

## 2. Findings P0 / P1 / P2

Chaque finding DOIT respecter ce schéma (cf. `README.md § Format finding`) :

````
### [P0|P1|P2].N — <titre court (≤ 80 char)>

- **Fichier** : `path/to/file.ts:LINE`
- **Problème** : <1-2 phrases factuelles>
- **Impact** : <utilisateur final | sécurité | perf chiffrée | dev experience>
- **Critère** : <quel critère P0/P1/P2 du README est déclenché>
- **Correctif** :
  ```diff
  - <ancien>
  + <nouveau>
  ```
- **Tests à ajouter** : <vitest unit | playwright @critical | aucun>
- **Effort estimé** : <S (≤ 1h) | M (1-4h) | L (1j) | XL (> 1j)>
````

Définition stricte des priorités (cf. `README.md`) :

- **P0** = sécurité / data loss / conformité (RGPD, fiscal FR) / production-blocking.
- **P1** = maintenabilité (duplication > 20 LOC, CC > 10, fichier > 300 LOC) / type safety (any non justifié) / bug non-bloquant / layering
  violé hors exceptions documentées.
- **P2** = polish / micro-perf < 5% / cosmétique.

## 3. Faux positifs / volontaires

Liste explicite de patterns qui POURRAIENT sembler problématiques mais sont volontaires :

- Exceptions layering documentées (`01-conventions.md § Exceptions documentées`).
- Memory feedbacks owner (autoFocus refusé, pas de Cancel sur create-product, etc.).
- Choix architectural intentionnel (ex. throw + handleActionError vs Result<T,E>).

## 4. Plan d'application

Ordre d'application recommandé (P0 → P1 → P2), risques par finding, scope migrations Prisma si applicable, tests à lancer après chaque batch.

## 5. Definition of done

Checklist universelle (cf. `README.md § Definition of done`) :

- [ ] Tous les bullets du prompt module examinés.
- [ ] Rapport P0/P1/P2 + faux positifs livré.
- [ ] Format finding respecté pour chaque P0/P1.
- [ ] `pnpm typecheck` lancé en fin — note score.
- [ ] `pnpm test --run modules/<MODULE>` lancé — note tests passants/total.
- [ ] Si critical path (cart/orders/payments/webhooks/auth/discounts/refunds) : `pnpm test:critical` lancé.
- [ ] `pnpm audit:lint` vert (refs valides).
- [ ] Note avant/après sur 10 par axe documentée.

# Règles strictes

- Ne PAS appliquer de fix dans cette session — produire UNIQUEMENT le rapport.
- Ne PAS demander d'application directe.
- Ne PAS proposer les patterns refusés par l'owner (Speculation Rules, autoFocus dans forms hors search dialogs, double back button admin
  mobile, icônes HeroReassuranceBanner, Cancel button create-product-form, newsletter inline, trust counter, cross-doc View Transitions,
  useMemo/useCallback/React.memo).
- Citer les fichiers avec `path:line` exact (`pnpm audit:lint` validera).
- Si tu trouves un anti-pattern du `README.md`, le marquer P0 ou P1 selon contexte.
- Si tu trouves un cas qui devrait être en exception documentée mais ne l'est pas → P1 + propose ajout dans `01-conventions.md`.

---

# Module à auditer

Module ciblé :
