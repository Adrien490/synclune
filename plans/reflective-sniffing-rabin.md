# Audit de coherence inter-modules

## Contexte

Audit complet de la coherence entre les 25 modules du projet Synclune pour identifier les ecarts par rapport aux patterns documentes dans CLAUDE.md et proposer une harmonisation progressive.

**168 fichiers d'actions** audites, **100 fichiers data/**, **25 modules** au total.

---

## 1. Structure des modules

### Constat positif
- Nommage des fichiers en kebab-case : 100% conforme
- Aucun fichier "loose" a la racine des modules
- Structure en couches (data/services/actions) globalement respectee

### Problemes identifies

| Probleme | Detail |
|----------|--------|
| **`hooks/` non documente** | Present dans 21/25 modules mais absent de CLAUDE.md. Pattern tres repandu (wrapping des actions dans des hooks React). |
| **`lib/` non documente** | Present dans 7 modules (auth, cart, cron, media, refunds, wishlist). Contient des integrations specifiques (rate-limit, UploadThing, Stripe). |
| **Module `cms` vide** | 7 repertoires crees mais 0 fichier. Placeholder inutile. |
| **`discounts/components/` vide** | Repertoire existe mais contient 0 fichier. |

### Actions recommandees
1. Ajouter `hooks/` et `lib/` au schema officiel dans CLAUDE.md
2. Supprimer le module `cms` (ou le peupler si prevu)
3. Supprimer `discounts/components/` si inutile

---

## 2. Server Actions - Inconsistances majeures

C'est l'axe le plus critique. Trois generations de code coexistent.

### 2a. Validation : `validateInput()` vs `safeParse()` manuel

- **31/168 fichiers** (18%) utilisent `validateInput()` de `shared/lib/actions`
- **~137 fichiers** (82%) utilisent `schema.safeParse()` manuellement

**Pattern ancien** (collections, colors, materials, discounts, products, orders) :
```typescript
const validation = schema.safeParse(rawData);
if (!validation.success) {
  return {
    status: ActionStatus.VALIDATION_ERROR,
    message: validation.error.issues[0]?.message || "Donnees invalides",
  };
}
```

**Pattern cible** (auth, users, addresses, customizations, reviews) :
```typescript
const validated = validateInput(schema, rawData);
if ("error" in validated) return validated.error;
```

> Le helper `validateInput` reduit 5 lignes a 2 et garantit un format de reponse uniforme.

### 2b. Reponses : `success()`/`error()` vs ActionState manuel

- **11/168 fichiers** (7%) utilisent `success()` de `shared/lib/actions`
- **~157 fichiers** (93%) construisent `{ status: ActionStatus.SUCCESS, message: "..." }` manuellement

**Modules conformes** : auth, products (recent searches uniquement), users/refresh
**Modules non-conformes** : collections, colors, materials, discounts, orders, product-types, skus, newsletter, stock-notifications, refunds, payments, et la majorite de products

> Les helpers `success()`, `error()`, `notFound()`, `forbidden()`, `validationError()` existent et sont bien concus mais quasi-inutilises.

### 2c. Gestion d'erreurs : `handleActionError()` vs patterns manuels

- **79/168 fichiers** (47%) importent `handleActionError()`
- **~89 fichiers** (53%) gerent les erreurs manuellement

**Trois patterns coexistent :**

| Pattern | Fichiers | Risque |
|---------|----------|--------|
| `handleActionError(e, "msg")` | 79 | Securise : masque les erreurs techniques, expose uniquement les `BusinessError` |
| `console.error("[TAG]", error)` + retour manuel | ~50 | Moyen : ne log pas via le helper centralise, mais ne leak pas d'info |
| `error.message` expose directement | ~10 | **Securite** : peut exposer des erreurs Prisma/Stripe a l'utilisateur |

**Modules problematiques (console.error sans handleActionError) :**
- `discounts/` : 7 fichiers (create, delete, toggle, bulk-toggle, bulk-delete, update, duplicate)
- `orders/` : ~12 fichiers (cancel, mark-as-*, bulk-*, delete-*, revert, update-tracking)
- `newsletter/` : ~8 fichiers
- `stock-notifications/` : ~5 fichiers

### 2d. Sanitization : `sanitizeText()` sporadique

- **12/168 fichiers** (7%) utilisent `sanitizeText()` pour les inputs texte
- Modules conformes : collections, reviews, products, orders (add-order-note), refunds, customizations
- **Modules qui acceptent du texte sans sanitize** : materials (name, description), colors (name), discounts (code), product-types, skus

---

## 3. Cache invalidation

### Constat positif
- Tags de cache bien structures et centralises par module (`constants/cache.ts`)
- Correspondance entre `updateTag()` dans les actions et `cacheTag()` dans les data : conforme
- 9 modules sur les plus importants ont un fichier `constants/cache.ts` avec des helpers d'invalidation
- `shared/constants/cache-tags.ts` centralise les tags partages (admin badges, navbar, etc.)

### Probleme : `revalidatePath()` redondant

- **48 fichiers** utilisent `revalidatePath()` en plus de `updateTag()`
- Avec le systeme de cache tag-based (Next.js 16), `revalidatePath` est redondant quand les tags sont bien configures
- **Modules qui utilisent `revalidatePath`** : collections, colors, materials, discounts, orders, product-types, products (delete), wishlist
- **Modules qui n'utilisent PAS `revalidatePath`** (cible) : reviews, auth, users, skus, addresses, cart, refunds, customizations, newsletter, stock-notifications

> `revalidatePath` force une re-render de la page entiere. `updateTag` invalide chirurgicalement les donnees concernees. Le deuxieme suffit.

---

## 4. Constantes d'erreur

- **9/25 modules** ont des constantes d'erreur centralisees (`ERROR_MESSAGES`)
- **16 modules** utilisent des strings inline dans les actions

**Modules avec constantes** : users, wishlist, cart, discounts, addresses, reviews, auth, refunds, orders
**Modules sans constantes** : collections, colors, materials, product-types, skus, products, newsletter, stock-notifications, customizations, media, payments, dashboard, emails, cron, webhooks, cms

> Moindre priorite : les constantes d'erreur sont un "nice to have" pour la maintenabilite, pas un risque.

---

## 5. Synthese des priorites

### Priorite 1 - Securite (handleActionError)
**~89 fichiers** n'utilisent pas `handleActionError()`. Parmi eux, ~10 exposent potentiellement des erreurs techniques a l'utilisateur.

**Fichiers cibles** : tous les catch blocks avec `error.message` dans la response, surtout dans discounts/, orders/, newsletter/.

**Action** : Remplacer les catch blocks manuels par `handleActionError(e, "Message par defaut")` dans tous les fichiers d'actions.

### Priorite 2 - Consistance des helpers (validateInput + success/error)
**~137 fichiers** n'utilisent pas `validateInput()`, **~157** n'utilisent pas `success()`.

**Action** : Migrer module par module vers les helpers. Ordre suggere :
1. discounts (7 fichiers, le plus heterogene)
2. collections (8 fichiers)
3. colors (7 fichiers)
4. materials (8 fichiers)
5. product-types (9 fichiers)
6. orders (14 fichiers, le plus volumineux)
7. skus (13 fichiers)
8. newsletter (12 fichiers)
9. stock-notifications (6 fichiers)
10. products (restants, ~8 fichiers)
11. payments, media, cart (quelques fichiers chacun)

### Priorite 3 - Suppression de revalidatePath
**48 fichiers** utilisent `revalidatePath` de maniere redondante.

**Action** : Supprimer les appels `revalidatePath` dans les actions qui utilisent deja `updateTag` correctement.

### Priorite 4 - sanitizeText manquant
**Action** : Ajouter `sanitizeText()` dans les actions qui acceptent du texte utilisateur (name, description, etc.) et qui ne l'utilisent pas encore.

### Priorite 5 - Documentation et nettoyage
- Documenter `hooks/` et `lib/` dans CLAUDE.md
- Supprimer le module `cms` vide
- Supprimer `discounts/components/` vide

---

## 6. Plan d'implementation

L'implementation se fait **module par module** pour limiter la surface de changement par commit.

Pour chaque module, appliquer dans l'ordre :
1. Remplacer les catch blocks par `handleActionError(e, "...")`
2. Remplacer `safeParse()` par `validateInput()`
3. Remplacer les `{ status: ActionStatus.SUCCESS/ERROR }` par `success()`/`error()`
4. Ajouter `sanitizeText()` si pertinent
5. Retirer `revalidatePath()` si `updateTag()` est deja present
6. Mettre a jour les imports (retirer `ActionStatus` si plus utilise)

### Fichiers cles (references)
- Pattern cible (modele a suivre) : `modules/reviews/actions/create-review.ts`
- Helpers validation : `shared/lib/actions/validation.ts`
- Helpers responses : `shared/lib/actions/responses.ts`
- Helpers erreurs : `shared/lib/actions/errors.ts`
- Index exports : `shared/lib/actions/index.ts`

### Verification
- `pnpm build` apres chaque module migre (type-checking + compilation)
- `pnpm test` pour les modules avec tests
- Verifier manuellement un flow complet (ex: creer une collection, un produit, un discount) pour s'assurer que l'invalidation de cache fonctionne sans `revalidatePath`
