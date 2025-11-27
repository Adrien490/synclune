# Changelog Dialog

Système de changelog basé sur MDX avec Server Components Next.js 16.

## Structure

```
changelog-dialog/
├── _content/                    # Fichiers MDX des versions
│   ├── v1.0.0.mdx
│   └── v1.1.0.mdx
├── _constants.ts                # Configuration
├── _types.ts                    # Types TypeScript
├── changelog-dialog.tsx         # Server Component principal
├── changelog-dialog-skeleton.tsx # Skeleton pour Suspense
├── index.ts                     # Exports publics
└── README.md
```

## Usage

```tsx
import { Suspense } from "react";
import { ChangelogDialog, ChangelogDialogSkeleton } from "@/modules/dashboard/components/changelog-dialog";

export function Header() {
  return (
    <Suspense fallback={<ChangelogDialogSkeleton />}>
      <ChangelogDialog />
    </Suspense>
  );
}
```

## Ajouter une version

Créer un fichier `_content/vX.Y.Z.mdx` :

```mdx
export const metadata = {
  version: "1.2.0",
  date: "2025-02-01",
  description: "Description courte de la version",
}

## Nouvelles fonctionnalités

- Fonctionnalité 1
- [Lien vers une page](/admin/exemple)

## Corrections

- Bug corrigé
```

Le système détecte automatiquement les nouveaux fichiers.

## Format des métadonnées

| Champ | Type | Description |
|-------|------|-------------|
| `version` | `string` | Version sémantique (ex: "1.2.0") |
| `date` | `string` | Date ISO YYYY-MM-DD |
| `description` | `string` | Description courte |

## Exports

```typescript
// Composants
export { ChangelogDialog } from "./changelog-dialog";
export { ChangelogDialogSkeleton } from "./changelog-dialog-skeleton";

// Fonctions
export { getChangelogs, getLatestChangelog, getChangelogByVersion };

// Types
export type { ChangelogData, ChangelogMetadata, MDXModule };

// Constantes
export { CHANGELOG_CONFIG, METADATA_FIELDS, RECENT_RELEASE_DAYS };
```
