# Contributing to Synclune

## Setup

See [README.md](./README.md#getting-started) for initial setup.

## Architecture

The codebase follows **Domain-Driven Design** with 23 modules under `modules/`. Each module has a layered structure:

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

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add wishlist sharing
fix: cart total calculation with discounts
refactor: extract checkout service
docs: update caching strategy
```

### Pre-commit hooks

Husky + lint-staged runs automatically on commit:

- ESLint with `--fix` on `.ts/.tsx/.js/.jsx` files
- Prettier on all supported files

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
- **[docs/](./docs/)** — UX/UI audits and functional specs
