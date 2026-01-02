# Audit d'Architecture de Code

Prompt réutilisable pour auditer modules, composants ou dossiers du projet Synclune.

## Prompt Principal

```
Fais un audit complet de [CIBLE: module X / composants Y / dossier Z] en analysant:

## 1. NOMMAGE
- Fichiers: kebab-case respecté ?
- Composants/fonctions: noms explicites reflétant la responsabilité ?
- Pas de noms trompeurs (ex: "sorting" qui fait de l'affichage) ?
- Suffixes cohérents (.service, .utils, .types, etc.) ?

## 2. RANGEMENT
- Chaque fichier dans le bon dossier selon sa responsabilité
- Respect de l'architecture du projet (services=pur, data=DB, actions=mutations)
- Fichiers trop gros (>300-400 LOC) = multi-responsabilité ?
- Fichiers orphelins ou mal placés ?

## 3. COHÉRENCE
- Mêmes patterns que les autres modules similaires ?
- Imports directs depuis la source (pas via intermédiaires/re-exports) ?
- Conventions identiques partout ?

## 4. RÉUTILISABILITÉ
- Fonctions génériques extractibles vers shared/ ?
- Code dupliqué entre fichiers ?
- Couplage fort évitable ?

## 5. DÉPENDANCES
- Imports circulaires ?
- Dépendances excessives ?
- Imports depuis le bon niveau (pas de composant important un service interne d'un autre module)

## 6. QUALITÉ
- Fichiers/fonctions non utilisés (dead code) ?
- Sur-ingénierie (abstractions inutiles, helpers pour 1 seul usage) ?
- Testabilité (fonctions pures vs effets de bord) ?

## 7. SCORING
Note sur 10 par critère + note globale.

## LIVRABLE
- Liste des problèmes par sévérité (critique/moyen/mineur)
- Corrections concrètes avec fichiers à modifier
- Comparaison avec 2-3 modules similaires du projet
```

---

## Variantes par Cible

### Module complet
```
Audit le module [nom] : services, data, actions, components, types, utils
```

### Composants UI
```
Audit les composants dans [dossier] : props typing, composition, accessibilité, réutilisabilité
```

### Server Actions
```
Audit les actions dans [module] : validation, auth, error handling, cache invalidation
```

### Hooks
```
Audit les hooks dans [dossier] : naming, responsabilité unique, dépendances, réutilisabilité
```

### Data Layer
```
Audit les fichiers data/ dans [module] : caching, séparation lectures/mutations, performance
```

---

## Architecture DDD Synclune (Référence)

| Dossier | Responsabilité | Règles |
|---------|----------------|--------|
| `services/` | Logique métier pure | Pas de DB, pas d'async, pas de "use server" |
| `data/` | Accès DB + cache | "use cache", cacheLife, cacheTag |
| `actions/` | Server Actions | "use server", mutations, invalidation cache |
| `utils/` | Helpers simples | Fonctions utilitaires, type guards |
| `types/` | Types TypeScript | Interfaces, types exportés |
| `schemas/` | Validation Zod | Schémas de validation |
| `constants/` | Constantes | Cache tags, config, textes |
| `components/` | React components | UI, client/server |
| `hooks/` | React hooks | Logique réactive |

---

## Exemple d'Audit Réalisé

**Module audité:** `modules/products/services/`

**Problèmes trouvés:**
1. **Critique** - 4 fichiers avec DB direct dans services/ (violation DDD)
2. **Moyen** - Fichier surchargé (363 LOC, 4+ responsabilités)
3. **Moyen** - Re-exports confus mélangeant sources multiples
4. **Mineur** - Nommage trompeur (product-sorting fait de l'affichage)

**Corrections appliquées:**
- Déplacement de 4 fichiers vers data/
- Renommage product-sorting → product-display
- Suppression des re-exports inutiles
- Mise à jour des imports directs

**Score final:** 6.7/10 → 9/10 après corrections
