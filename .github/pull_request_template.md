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
