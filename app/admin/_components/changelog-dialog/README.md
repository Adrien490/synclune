# Changelog Dialog - Système MDX

Système de changelog complet utilisant MDX, Server Components et les meilleures pratiques Next.js 16.

## 📁 Structure

```
changelog-dialog/
├── _content/              # Fichiers MDX des versions
│   └── v1.0.0.mdx        # Version 1.0.0
├── _constants.ts          # Configuration et constantes
├── _types.ts              # Définitions TypeScript
├── get-changelogs.ts      # Fonctions serveur ("use server")
├── changelog-dialog.tsx   # Server Component (async)
├── changelog-dialog-skeleton.tsx  # Skeleton pour Suspense
├── index.ts               # Exports publics
└── README.md              # Cette documentation
```

## 🚀 Usage

### Utilisation basique

```tsx
import { ChangelogDialog } from "@/app/admin/_components/changelog-dialog";

export default function Layout() {
  return <ChangelogDialog />;
}
```

### Avec personnalisation

```tsx
// Avec nom d'utilisateur
<ChangelogDialog userName="Léane" />

// Avec message personnalisé
<ChangelogDialog greetingMessage="Découvre les nouveautés !" />
```

## ✍️ Ajouter une nouvelle version

### 1. Créer un fichier MDX

Créez `/app/admin/_components/changelog-dialog/_content/v1.1.0.mdx` :

```mdx
export const metadata = {
  version: "1.1.0",
  date: "2025-02-15",
  description: "Améliorations de performance et nouvelles fonctionnalités",
}

## Nouvelles fonctionnalités

- [Export PDF des factures](/admin/ventes/factures)
- Notifications en temps réel
- Mode sombre

## Améliorations

- Performance améliorée de 50%
- Interface plus rapide
- Meilleur temps de chargement

## Corrections de bugs

- Correction du bug de synchronisation
- Fix des filtres de recherche
```

### 2. C'est tout ! 🎉

Le système détecte automatiquement les nouveaux fichiers. Pas besoin de modifier le code.

## 📝 Format MDX

### Metadata (obligatoire)

```mdx
export const metadata = {
  version: "1.0.0",      // Version sémantique (major.minor.patch)
  date: "2025-01-15",    // Format ISO (YYYY-MM-DD)
  description: "...",    // Description courte
}
```

### Contenu Markdown

- **Titres** : Utilisez `## Titre` pour les sections
- **Listes** : Utilisez `-` pour les points
- **Liens** : `[Texte](/lien)`
- **Gras** : `**texte**`
- **Italique** : `_texte_`

### Exemple complet

```mdx
export const metadata = {
  version: "2.0.0",
  date: "2025-03-01",
  description: "Version majeure avec refonte complète",
}

## 🎨 Nouvelle interface

- Design moderne et épuré
- [Nouveau thème personnalisable](/settings/theme)
- Animations fluides

## ⚡ Performance

- Temps de chargement **réduit de 70%**
- Cache optimisé
- Bundle size divisé par 2
```

## 🛠️ Architecture technique

### Server Components (Next.js 16)

Le système utilise les Server Components avec Suspense streaming :

1. **`changelog-dialog.tsx`** (Server Component async)
   - Charge les changelogs côté serveur
   - Utilise `getChangelogs()` pour récupérer les données
   - Affiche l'UI complète (Dialog, Tabs)
   - Pas d'état client nécessaire

2. **`changelog-dialog-skeleton.tsx`** (Skeleton Component)
   - Affiché pendant le chargement Suspense
   - Optimise l'UX avec un état de chargement

3. **`get-changelogs.ts`** ("use server")
   - Fonctions serveur réutilisables
   - Lecture du système de fichiers
   - Tri et validation automatiques

### Avantages

✅ **Performance** : MDX compilé côté serveur
✅ **DX** : Ajout de versions sans toucher au code
✅ **Type-safe** : TypeScript complet
✅ **SEO** : Contenu rendu côté serveur
✅ **Bundle size** : MDX non inclus dans le bundle client

## 🔧 Configuration

### Constantes (`_constants.ts`)

```typescript
export const CHANGELOG_CONFIG = {
  CONTENT_PATH: "app/admin/_components/changelog-dialog/_content",
  // ...
}

export const RECENT_RELEASE_DAYS = 7; // Badge "nouveau"
```

### Types (`_types.ts`)

```typescript
export interface ChangelogMetadata {
  version: string;
  date: string;
  description: string;
}

export interface ChangelogData {
  metadata: ChangelogMetadata;
  slug: string;
  Content: React.ComponentType;
}
```

## 📦 Exports publics

```typescript
// Composants
export { ChangelogDialog }        // Server Component (async)
export { ChangelogDialogSkeleton } // Skeleton pour Suspense

// Fonctions serveur
export { getChangelogs }          // Récupère tous les changelogs
export { getChangelogByVersion }  // Récupère une version spécifique
export { getLatestChangelog }     // Récupère la dernière version

// Types
export type { ChangelogData, ChangelogMetadata }

// Constantes
export { CHANGELOG_CONFIG, METADATA_FIELDS, RECENT_RELEASE_DAYS }
```

## 🎨 Styling

Le composant utilise :
- **Tailwind CSS** avec plugin Typography
- **shadcn/ui** (Dialog, Tabs, Badge, Button)
- **Classe prose** pour le contenu MDX

Pour personnaliser les styles MDX, voir le fichier `/mdx-components.tsx` à la racine.

## 🧪 Tests

```bash
# Vérifier les types
pnpm tsc --noEmit

# Build
pnpm build
```

## 📚 Ressources

- [Documentation MDX Next.js](https://nextjs.org/docs/app/building-your-application/configuring/mdx)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Tailwind Typography](https://tailwindcss.com/docs/typography-plugin)

---

**Développé pour Synclune Bijoux** ✨
