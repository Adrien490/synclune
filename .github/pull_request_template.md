## Summary

<!-- 1-3 phrases describing the change. -->

## Type of change

- [ ] `feat` — New feature
- [ ] `fix` — Bug fix
- [ ] `refactor` — Restructuring without behavior change
- [ ] `perf` — Performance improvement
- [ ] `docs` — Documentation only
- [ ] `test` — Adding/fixing tests
- [ ] `chore` — Tooling, dependencies, config
- [ ] `ci` — CI/CD

## Testing

- [ ] Unit tests (`pnpm test`)
- [ ] E2E smoke tests (`pnpm e2e --grep @smoke`)
- [ ] Manual testing (`pnpm dev`)
- [ ] No tests needed (justify below)

## QA risque revenu (si la PR touche cart / orders / payments / webhooks / refunds / discounts / auth)

- [ ] Critical path tests (`pnpm test:critical`)
- [ ] E2E critical (`pnpm e2e --grep @critical`)
- [ ] Stripe CLI relay testé localement (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
- [ ] axe-core 0 violation serious/critical sur pages touchées
- [ ] Mobile réel testé (Safari iOS + Chrome Android)
- [ ] Fixture Stripe `test/fixtures/stripe/<event>.json` à jour si un handler webhook a été modifié
- [ ] Régression : si un bug locked (cf `docs/QA.md § Regression playbook`) est dans la zone touchée, le test `*.regression.test.*` correspondant passe toujours

## Checklist

- [ ] Module layers pattern respected (data / services / actions)
- [ ] No `useMemo`, `useCallback`, or `React.memo`
- [ ] Env vars added to `.env.example` if needed
- [ ] Cache tags invalidated if necessary (`updateTag(...)`)
- [ ] Soft delete used (no hard delete)
- [ ] UI text in French, code/comments in English
- [ ] Prisma migration created if schema changed
- [ ] Accessibility verified (keyboard navigation, screen reader)
- [ ] Responsive verified (mobile + desktop)
- [ ] No `any` or `@ts-ignore` added
- [ ] Bundle size not degraded (`pnpm size`)
- [ ] No `console.log` left in production code
