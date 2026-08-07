# Contributing to Synclune

## Setup

See [README.md](./README.md#demarrage-rapide) for initial setup.

## Architecture

The codebase follows **Domain-Driven Design** with 22 modules under `modules/`. Each module has a layered structure:

| Layer         | Purpose                    | Rules                                             |
| ------------- | -------------------------- | ------------------------------------------------- |
| `data/`       | Cached DB reads            | `"use cache"`, no mutations                       |
| `services/`   | Pure business logic        | No side effects, no `"use server"`, no DB writes  |
| `actions/`    | Server Actions (mutations) | Auth + validation + DB write + cache invalidation |
| `schemas/`    | Zod validation schemas     | Shared between client and server                  |
| `components/` | React components           | Module-specific UI                                |
| `utils/`      | Helpers, type guards       | Simple transformations                            |

### Decision matrix

| Need                      | Layer       |
| ------------------------- | ----------- |
| Read data with cache      | `data/`     |
| Transform/compute (no DB) | `services/` |
| Mutate the database       | `actions/`  |
| Build WHERE clauses       | `services/` |
| Simple helpers            | `utils/`    |

### Exceptions

- **`modules/webhooks/`** — Webhook handlers contain full transactional logic (read + write) for atomicity.
- **Reads in `actions/`** — Existence checks before mutations (`findUnique`/`findFirst`) are acceptable.

## Adding a New Module

```bash
# Create the module structure
mkdir -p modules/my-module/{actions,data,services,components,schemas}
```

1. Define Zod schemas in `schemas/`
2. Add cached queries in `data/` using `"use cache"`
3. Add pure business logic in `services/`
4. Add Server Actions in `actions/` following the pattern in `CLAUDE.md`
5. Add components in `components/`

## Server Actions Pattern

```typescript
"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, success, handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";

export async function createSomething(
	prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	const validation = validateInput(schema, { name: formData.get("name") });
	if (!validation.success) return error(validation.error.errors[0]?.message);

	try {
		await prisma.model.create({ data: validation.data });
		updateTag("cache-tag");
		return success("Created successfully");
	} catch (e) {
		return handleActionError(e, "Creation error");
	}
}
```

## Conventions

| Type                  | Convention         |
| --------------------- | ------------------ |
| Files                 | `kebab-case.ts`    |
| Components            | `PascalCase`       |
| Functions             | `camelCase`        |
| Constants             | `UPPER_SNAKE_CASE` |
| UI text               | French             |
| Code (vars, comments) | English            |
| Indentation           | Tabs               |

### React 19

The React 19 compiler handles memoization automatically. **Do NOT use** `useMemo()`, `useCallback()`, or `React.memo()`.

### Imports

- Use `@/*` alias for all imports (maps to project root)
- Import specific files directly — no barrel re-exports (`index.ts`)

## Git Workflow

### Branch naming

```
feat/short-description
fix/short-description
refactor/short-description
```

### Commit messages

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/). The format is enforced by **commitlint** (see `commitlint.config.ts`) via the husky `commit-msg` hook and the CI quality job.

**Format**: `type(scope): subject` — subject ≤ 100 chars, scope optional but recommended.

**Allowed types** (`type-enum`):

| Type       | When to use                                                  |
| ---------- | ------------------------------------------------------------ |
| `feat`     | New feature visible to users                                 |
| `fix`      | Bug fix                                                      |
| `perf`     | Performance improvement (no behavior change)                 |
| `refactor` | Code change that doesn't add features or fix bugs            |
| `style`    | Formatting, whitespace, missing semis (no code logic change) |
| `test`     | Adding or fixing tests                                       |
| `docs`     | Documentation only                                           |
| `build`    | Build system, dependencies, package.json scripts             |
| `ci`       | CI configuration (GitHub Actions, workflows)                 |
| `chore`    | Maintenance tasks (no production code change)                |
| `revert`   | Revert a previous commit                                     |

**Allowed scopes** — module name (e.g. `cart`, `auth`, `webhooks`) OR cross-cutting (`a11y`, `admin`, `api`, `deps`, `perf`, `prisma`, `ui`, etc.). See `commitlint.config.ts` for the full list.

**Examples**:

```
feat(cart): add undo toast after item removal
fix(stripe): handle webhook idempotency race on concurrent retries
perf(media): defer thumbnail generation to worker queue
refactor(auth): extract session validation to require-auth
chore(deps): bump prisma to 7.10
docs(refunds): document atomic restock service exception
test(webhooks): cover P2002 duplicate webhook event branch
ci(quality): block merge on lint warnings
revert: feat(cart) sticky CTA mobile (caused mid-scroll jitter)
```

**Common anti-patterns to avoid**:

- `Update cart.ts` — no type, no scope, vague subject
- `wip` / `fix stuff` / `h` — meaningless; rebase or amend before pushing
- `feat: add stuff` — no scope, vague subject
- `feat(Cart):` — scope must be `kebab-case`

If you bypass the local hook with `--no-verify`, the CI will reject the commit. Either fix the message via `git commit --amend` or use the husky hook (it's there for a reason).

### Merge strategy

Use **squash merge** for all PRs to keep a clean linear history on `main`. Each PR becomes a single commit.

### Pre-commit hooks

Husky + lint-staged runs automatically on commit:

- ESLint with `--fix` on `.ts/.tsx/.js/.jsx` files
- Prettier on all supported files

## Branch Protection

The `main` branch is protected with the following rules:

- **Required status checks**: the jobs of `.github/workflows/ci.yml` — `commitlint`, `quality`, `tests-critical`, `tests-integration`, `build`, `tests`, `e2e`. ⚠️ There is **no `e2e-smoke` job**: it was removed (cost audit P2-3 — it rebuilt and reseeded everything just to replay `--grep @smoke`). If `E2E smoke tests` is still listed as a required check in the GitHub settings, remove it there — a required check that no job reports blocks every PR forever.
- **Required reviews**: At least 1 approving review
- **Force push**: Disabled on `main`
- **Up-to-date branches**: Required before merging
- **Squash merge**: Default merge strategy for clean linear history (PR title becomes the commit message — must also be Conventional)

## Testing

### Unit tests (Vitest)

```bash
pnpm test              # Watch mode
pnpm test:coverage     # Coverage report
```

Test files live next to source: `services/__tests__/my-service.test.ts`

Use factories from `test/factories.ts` for consistent mock data.

### E2E tests (Playwright)

```bash
pnpm e2e               # Run all
pnpm e2e:ui            # Interactive UI mode
```

E2E specs are in `e2e/` with Page Object Model pattern. Factories in `e2e/factories/`.

## Environment Variables

All required env vars are validated at startup via Zod (`shared/schemas/env.schema.ts`).

To add a new variable:

1. Add it to `shared/schemas/env.schema.ts`
2. Add it to `.env.example` with a placeholder value
3. Access it via `import { env } from "@/shared/lib/env"` — not `process.env` directly

## Useful Resources

- **[CLAUDE.md](./CLAUDE.md)** — Full architecture reference, cache profiles, module patterns
- **[docs/](./docs/)** — brand lexicon ([BRAND-DA.md](./docs/BRAND-DA.md)), landing audit grid ([LANDING-BEST-PRACTICES.md](./docs/LANDING-BEST-PRACTICES.md)), Stripe doc mirror ([stripe/](./docs/stripe/))
