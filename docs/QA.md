# QA — Synclune

> Checklist QA opérationnelle et regression playbook. Complète la stratégie de tests décrite dans `CLAUDE.md § Testing Strategy`.

## 1. Smoke pre-merge (toute PR non-triviale)

Avant de demander une review :

- `pnpm typecheck && pnpm lint && pnpm format:check`
- `pnpm test:critical` si la PR touche `cart`, `orders`, `payments`, `webhooks`, `auth`, `discounts`, `refunds` (le hook husky le fait automatiquement, mais à relancer manuellement avant push si plusieurs commits)
- `pnpm e2e --grep @smoke` en local au moins une fois par session
- Vérification visuelle mobile dans le navigateur (DevTools responsive ou device réel) sur les pages touchées

## 2. QA risque revenu (zones sensibles)

À effectuer dès qu'une PR touche un module critical path ou un flow paiement :

| Action                        | Commande                                                        |
| ----------------------------- | --------------------------------------------------------------- |
| Stripe CLI relay local        | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |
| Trigger d'event Stripe ad hoc | `stripe trigger checkout.session.completed`                     |
| Re-jouer un event versionné   | `stripe events resend evt_<id>`                                 |
| Coverage local par module     | `pnpm test:coverage -- modules/<nom>`                           |
| Régression complète locked    | `pnpm test --grep regression`                                   |

Pour CHAQUE handler webhook modifié :

1. La fixture `test/fixtures/stripe/<event>.json` est-elle à jour ? Si Stripe a changé le payload, capturer une nouvelle version (`stripe trigger <event> --print-json > test/fixtures/stripe/<event>.json`).
2. Le contract test `test/contract/stripe-events.test.ts` passe-t-il ?
3. Le test unit du handler couvre-t-il : happy path, P2002 race concurrent, race-guard upsert, erreur Stripe API ?

## 3. Matrice devices manuel

Au moins une PR sur 5 touchant le storefront doit être testée sur appareils réels :

| Device                  | Browser | Priorité                           |
| ----------------------- | ------- | ---------------------------------- |
| iPhone récent (iOS 17+) | Safari  | P0 — base PWA + checkout Apple Pay |
| Android moyen de gamme  | Chrome  | P0 — base e-commerce FR            |
| iPad                    | Safari  | P1 — admin responsive              |
| Desktop 1920×1080       | Chrome  | P0 — surface admin                 |
| Desktop 1366×768        | Firefox | P1 — couverture moteur tier        |
| Desktop > 2560px        | Chrome  | P2 — pas de régression layout      |

## 4. Accessibility

- En local : extension axe DevTools sur les pages touchées (cibler 0 violation `serious` ou `critical`).
- Automatisé : `pnpm e2e e2e/accessibility.spec.ts e2e/a11y/` sur les pages touchées.
- Si nouveau composant UI : ajouter un test dans `e2e/a11y/components-a11y.spec.ts`.
- Si nouveau flow clavier : ajouter dans `e2e/a11y/keyboard-navigation.spec.ts`.

## 5. Regression playbook — bugs locked à NE PAS ré-introduire

Quand tu touches une zone listée, vérifier explicitement que le test régression associé passe encore.

### Webhooks Stripe

- **P2002 concurrent webhooks** (`webhooks-audit-2026-05-17`) — Si tu modifies `app/api/webhooks/stripe/route.ts` ou `modules/webhooks/services/checkout-order-processing.service.ts` : le mock Prisma DOIT throw une subclass réelle `Prisma.PrismaClientKnownRequestError` (via `vi.hoisted` + `vi.mock("@/app/generated/prisma/client", () => ({ Prisma: { PrismaClientKnownRequestError: <fake-class> } }))`). Un `Object.assign(new Error(), { code: "P2002" })` passe le test mais N'EST PAS `instanceof PrismaClientKnownRequestError` → branche outer-catch jamais hit, test « green for the wrong reason ». Test à vérifier : `app/api/webhooks/stripe/__tests__/webhook-concurrency.regression.test.ts`.
- **`discountUsage` FOR UPDATE** (`webhooks-audit-2026-05-17`) — Si tu modifies la logique `maxUsagePerUser` dans `checkout-order-processing.service.ts:310-330` : le `SELECT ... FROM "DiscountUsage" ... FOR UPDATE` DOIT précéder l'incrément. Sans lui, 2 webhooks async simultanés bypass la limite. Test : `modules/webhooks/services/__tests__/discount-max-usage.regression.test.ts`.
- **Anti-replay 5min** — Stripe rejouant un event > 5min après émission doit retourner 200 + log `webhook_replay_outside_window`. Test : `app/api/webhooks/stripe/__tests__/route.test.ts` describe `anti-replay`.

### Paiement

- **Idempotence `checkout-${cart.id}-${cart.updatedAt}`** — 2 appels à `createCheckoutSession` avec le même panier inchangé doivent retourner le MÊME `clientSecret`. Test : `modules/payments/actions/__tests__/create-checkout-session.test.ts` describe `idempotency`.

### UI / Navigation

- **`ResponsiveActionMenu` + `<Link>` history.back race** (`responsive-action-menu-link-history-back-bug-2026-05-15`) — Un `<Link>` enfant d'un `<DrawerClose asChild>` doit naviguer ; le wrappedOnOpenChange Vaul ne doit PAS appeler `history.back()` avant `router.push`. Si tu touches le Drawer/Sheet wrapper : test `shared/components/responsive-action-menu/__tests__/link-history-back.regression.test.tsx`.

## 6. Conventions de tests régression

- Suffixe : `<sujet>.regression.test.ts(x)` colocalisé dans le `__tests__/` du module.
- En-tête JSDoc obligatoire :
  ```ts
  /**
   * @regression <memory-slug-ou-incident-id>
   * Bug : <résumé en une phrase>
   * Fix : commit / PR / sprint memory
   * Garde-fou : <ce que le test verrouille>
   */
  ```
- Pas de `it.skip` ni `test.todo` sur un test régression — si le bug ré-émerge en attendant le fix, le test doit échouer rouge.

## 7. Ressources

- Stratégie globale : `CLAUDE.md § Testing Strategy`
- Pattern Server Actions testables : `CLAUDE.md § Server Actions Pattern`
- Auth helpers (mocks) : `modules/auth/lib/require-auth`
- Fixtures Stripe : `test/fixtures/stripe/`
- Contract test runner : `test/contract/stripe-events.test.ts`
- Integration DB setup : `test/integration/setup.ts`
