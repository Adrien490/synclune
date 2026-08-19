# Blueprint d'architecture — structure de fichiers Next.js

Document **portable** : il décrit la structure de fichiers de ce dépôt indépendamment du métier
(bijouterie, Stripe, Prisma…), pour la retranscrire dans un autre projet Next.js. Chaque section
donne **la règle**, **le pourquoi**, et **le contre-exemple** qui fait dériver l'architecture.

Stack de référence : Next.js 16 (App Router, RSC), React 19 (compilateur), TypeScript strict,
Tailwind v4, Prisma, Vitest + Playwright, pnpm.

---

## 0. Comment utiliser ce document

### 0.1 Les deux modes de lecture

**Nouveau projet** — lire dans l'ordre, puis exécuter le § 12 (mise en place pas à pas). Compter
une demi-journée pour le squelette + les trois filets, avant la première feature.

**Projet existant à remettre d'aplomb** — commencer par le § 11 (kit d'audit) : les commandes y
donnent l'écart réel entre le dépôt et cette structure, avec un compte par violation. Traiter par
ordre de coût croissant : nommage → frontières d'import → layers → tests.

### 0.2 Ce que le document garantit — et ce qu'il ne garantit pas

| Le document donne                                         | Le document ne donne pas              |
| --------------------------------------------------------- | ------------------------------------- |
| La structure de dossiers, exhaustive                      | Un choix d'ORM, d'auth, de paiement   |
| Une règle par frontière, avec son _pourquoi_              | Des conventions de style visuel       |
| Un exemple de code réel par layer (§ 4.4)                 | Une bibliothèque de composants        |
| Le mécanisme de vérification de chaque règle (§ 10, § 11) | Un CI clé en main pour tout hébergeur |
| Des checklists opérationnelles (§ 14)                     | Une stratégie de migration de données |

### 0.3 Le contrat de lecture

Chaque règle du document est écrite sous une des trois formes suivantes — la forme dit ce qu'on
peut en faire :

- **Invariant** (« jamais », « toujours ») — non négociable, et **toujours accompagné du
  vérificateur** qui le tient (règle ESLint, test de contrat, commande d'audit). Un invariant sans
  vérificateur est une intention, pas une règle : le document n'en contient aucun.
- **Convention** (« par défaut », « sauf ») — dérogeable, avec la dérogation **écrite au call
  site** et sa raison.
- **Repère** (chiffres, seuils) — indicatif, mesuré sur ce dépôt, à recalibrer sur le tien.

### 0.4 Le tableau de bord des vérificateurs

Toutes les règles mécanisées du document, et l'outil qui les tient. C'est la liste à reproduire en
premier : sans elle, tout le reste redevient de la documentation qui se périme.

| Règle                                            | Vérificateur                            | §   |
| ------------------------------------------------ | --------------------------------------- | --- |
| Pas d'invalidation de cache hors Server Action   | Règle ESLint locale                     | 10  |
| Toute fonction cachée déclare sa durée de vie    | Règle ESLint locale                     | 7   |
| Toute action mutante a sa garde d'autorisation   | Test de contrat                         | 8   |
| Toute action parse son entrée                    | Test de contrat                         | 8   |
| La bonne API d'invalidation selon le contexte    | Test de contrat (implémentation réelle) | 7   |
| Pas de mémoïsation manuelle + compilateur activé | Test de convention                      | 10  |
| Frontière serveur/client                         | `import "server-only"` + build          | 6   |
| Exports morts                                    | `knip`                                  | 10  |
| Frontières d'import, nommage, layers             | Kit d'audit (§ 11) + revue              | 11  |

### 0.5 Le dépôt de référence n'est pas à 100 %

Les inventaires (§ 4.8, § 5.0) et les métriques sont **mesurés** sur un dépôt réel, pas idéalisés —
et le § 11.6 publie le résultat de son propre audit, dérives comprises. C'est délibéré : une
structure présentée comme parfaitement respectée ne dit pas où elle plie sous la pression, ni
comment on trie une sortie d'audit qui n'est pas vide. Les deux cas les plus instructifs du
document sont des **manquements** : un dossier de `shared/` qui appartenait à un module, et des
services transactionnels qui dérogent à la pureté du layer.

---

## 1. Les trois principes

Toute la structure découle de trois décisions. Si tu n'en gardes qu'une, garde la première.

### 1.1 `app/` est du **routage**, pas du code

`app/` ne contient que ce que Next.js exige d'y trouver : les fichiers spéciaux du routeur
(`page`, `layout`, `loading`, `error`, `not-found`, `route`, `opengraph-image`, `sitemap`,
`robots`) et les composants qui n'ont **qu'un seul** consommateur — le segment de route qui les
héberge, dans un dossier `_components/` (le préfixe `_` exclut le dossier du routage).

Une `page.tsx` typique fait **20 à 60 lignes** : parser les `searchParams`, appeler une fonction
de `data/`, composer des composants venus de `modules/`. Zéro requête Prisma inline, zéro
`WHERE` construit à la main, zéro logique de calcul.

> **Pourquoi** — l'arborescence de routes est la surface la plus instable d'un projet
> (renommages d'URL, groupes de routes, i18n, A/B). Si le code métier vit dedans, chaque
> changement d'URL est un refactor. En le sortant, renommer `/produits` en `/boutique` ne touche
> qu'un dossier de 4 fichiers.

### 1.2 `modules/` est découpé **par domaine**, puis **par layer**

Pas de `components/`, `hooks/`, `lib/` géants à la racine. Un dossier par domaine métier
(`products/`, `orders/`, `cart/`…), et **à l'intérieur** de chaque domaine, les mêmes douze layers
toujours nommés pareil. Voir § 4.

> **Pourquoi** — un découpage par type technique disperse une fonctionnalité sur 6 dossiers ;
> supprimer une feature devient de l'archéologie. Ici, supprimer un domaine = `rm -rf` un
> dossier + retirer ses routes.

### 1.3 `shared/` a un **critère d'admission**

Rien n'entre dans `shared/` « parce que ça pourrait resservir ». Un artefact y monte quand il est
**consommé par ≥ 2 modules** ou qu'il est structurellement transverse (client Prisma, tokens de
design, primitives UI). Voir § 5.

> **Pourquoi** — un `shared/` sans portier devient le fourre-tout où tout finit, et il ne reste
> plus de frontière du tout. Le critère « ≥ 2 consommateurs » est vérifiable mécaniquement (un
> test peut le compter) ; « ça pourrait resservir » ne l'est pas.

---

## 2. Arborescence racine

```
.
├── app/                    # Routage Next.js UNIQUEMENT (§ 3)
├── modules/                # Domaines métier, découpés en layers (§ 4)
├── shared/                 # Transverse : UI, lib, hooks, constants… (§ 5)
├── prisma/                 # schema.prisma + migrations + seed
├── emails/                 # Templates React Email (rendus hors app/)
├── e2e/                    # Playwright : specs, page objects, helpers (§ 8)
├── test/                   # Tests NON colocalisés : contract, conventions, fixtures (§ 8)
├── scripts/                # Scripts one-shot / génération (hors tsconfig, hors eslint)
├── docs/                   # Documentation longue durée
├── public/                 # Assets statiques
├── eslint-plugin-local/    # Règles ESLint maison (§ 10)
├── .github/workflows/      # CI
└── .husky/                 # Hooks git (pre-commit, commit-msg)
```

### Fichiers de configuration à la racine

| Fichier                             | Rôle                                                      |
| ----------------------------------- | --------------------------------------------------------- |
| `next.config.ts`                    | Config Next (compilateur React, profils de cache, images) |
| `proxy.ts`                          | Middleware de bord — default-deny de routes, pas d'auth   |
| `tsconfig.json`                     | `strict` + `noUncheckedIndexedAccess` + alias `@/*`       |
| `eslint.config.mjs`                 | Flat config + plugin local                                |
| `vitest.config.ts`                  | Tests unitaires (jsdom)                                   |
| `vitest.integration.config.ts`      | Tests d'intégration (runner + DB séparés)                 |
| `playwright.config.ts`              | E2E                                                       |
| `knip.config.ts`                    | Détection d'exports morts                                 |
| `components.json`                   | Config shadcn (chemin de génération des primitives)       |
| `postcss.config.mjs`                | Tailwind v4                                               |
| `commitlint.config.ts`              | Conventional commits                                      |
| `instrumentation.ts` / `-client.ts` | Hooks d'observabilité Next                                |
| `prisma.config.ts`                  | Config Prisma (seed, migrations)                          |

### 2.1 Les dossiers qui ne sont ni `app/` ni `modules/` ni `shared/`

| Dossier                | Contenu                                             | Règle qui le tient                                                             |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `prisma/`              | `schema.prisma`, `migrations/`, `seed.ts`           | Le schéma est la SSOT ; le client est GÉNÉRÉ ailleurs (§ 3.7)                  |
| `emails/`              | Templates transactionnels + `_components/` partagés | Rendus hors du cycle de rendu Next : styles **inline**, aucune classe Tailwind |
| `scripts/`             | Génération, migration one-shot, outillage           | **Exclu de `tsconfig` et d'ESLint** — ce n'est pas du code applicatif          |
| `public/`              | Assets servis tels quels                            | Rien de généré n'y est commité sans être régénérable par un script             |
| `eslint-plugin-local/` | Règles ESLint maison (`.mjs`)                       | Exclu du lint lui-même (une règle ne se lint pas avec elle-même)               |
| `docs/`                | Documentation longue durée                          | Ce que le code ne peut pas dire : arbitrages, historiques d'audit              |
| `.github/workflows/`   | CI                                                  | Doit lancer exactement `pnpm validate` + les suites lourdes (§ 10)             |
| `.husky/`              | `pre-commit`, `commit-msg`                          | Le pre-commit lance le **chemin critique** seulement, jamais la suite entière  |

**`emails/` mérite une note** : les templates sont rendus par un moteur qui produit du HTML de
courriel, pas par le navigateur. Les classes utilitaires n'y survivent pas — **tout est en styles
inline**. C'est la seule zone du dépôt exemptée des conventions de style, et elle doit être
explicitement **hors périmètre** des tests qui scannent les classes CSS, sinon ils la signalent
indéfiniment.

### 2.2 Les six configs qu'il faut reproduire à l'identique

Ce sont elles qui rendent la structure **mécaniquement vraie** plutôt que déclarative.

**`tsconfig.json`** — trois options portent tout le poids :

```jsonc
{
	"compilerOptions": {
		"strict": true,
		// Un accès indexé rend `T | undefined` : c'est ce qui force les `?.` sur
		// `array[0]` et empêche la classe de bugs "premier élément d'une liste vide".
		"noUncheckedIndexedAccess": true,
		// Un `import` de type DOIT être écrit `import type` : sans ça, un import de
		// type seul peut faire entrer un module serveur dans un bundle client.
		"verbatimModuleSyntax": true,
		"noImplicitOverride": true,
		"noFallthroughCasesInSwitch": true,
		"useUnknownInCatchVariables": true,
		"moduleResolution": "bundler",
		"paths": { "@/*": ["./*"] },
	},
	// `scripts/` est HORS du programme TS : ces fichiers tournent via un runner
	// séparé et n'ont pas à respecter les contraintes de l'app.
	"exclude": ["node_modules", "scripts"],
}
```

**Alias unique** — `"@/*": ["./*"]`, et rien d'autre. Donc `@/modules/products/...`,
`@/shared/lib/...`. Pas de `@components`, `@utils`, `@lib` : chaque alias supplémentaire est une
frontière qu'on peut franchir sans la voir passer, et il rend le kit d'audit (§ 11) aveugle — une
commande qui cherche `from "@/modules/` ne trouve pas `from "@modules/`.

**`vitest.config.ts`** — deux lignes non évidentes, sans lesquelles la moitié du dépôt n'est pas
testable :

```ts
export default defineConfig({
	resolve: {
		alias: {
			"@": resolve(__dirname, "."),
			// `server-only` THROW à l'import hors contexte serveur. Sans ce mock, tout
			// test qui touche transitivement au client DB casse à l'import — avant même
			// d'exécuter une assertion.
			"server-only": resolve(__dirname, "shared/lib/__mocks__/server-only.ts"),
		},
	},
	test: {
		include: ["**/*.test.{ts,tsx}"],
		// Les tests d'intégration ont besoin d'une vraie base : ils sont EXCLUS d'ici
		// et lancés par un second runner. Les mélanger rend la suite unitaire non
		// exécutable sans DB, donc non exécutée.
		exclude: ["node_modules", ".next", "**/*.integration.test.ts"],
		environment: "jsdom",
		setupFiles: ["./test/setup.ts"],
		coverage: {
			include: ["modules/**/*.{ts,tsx}", "shared/**/*.{ts,tsx}"],
			// `app/` est hors couverture : c'est du câblage, couvert par les e2e.
			// `constants/` et `types/` aussi : rien à exécuter.
			exclude: ["**/__tests__/**", "**/*.d.ts", "**/types/**", "**/constants/**", "app/**"],
		},
	},
});
```

**`test/setup.ts`** — le fichier qui rend l'environnement de test honnête :

```ts
import "@testing-library/jest-dom/vitest";

// Les SDK tiers throwent souvent à l'INSTANCIATION de module quand une clé
// manque. Un stub ici évite de mocker le SDK dans 200 fichiers.
process.env.STRIPE_SECRET_KEY ??= "sk_test_stub";
process.env.AUTH_SECRET ??= "test-secret-32-chars-minimum-xxxxxxxxxx";

// jsdom n'implémente ni matchMedia ni ResizeObserver : tout hook responsive et
// toute lib de drag casse sans ces stubs. Un test peut les surcharger localement.
if (typeof window !== "undefined" && !window.matchMedia) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			addEventListener() {},
			removeEventListener() {},
		}),
	});
}
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
};
```

**`components.json`** (shadcn ou équivalent) — **c'est ce fichier qui fait atterrir les primitives
générées dans `shared/`** au lieu d'un `components/` racine. Le reproduire est ce qui empêche la
structure de se faire contredire par le générateur à la première commande `add` :

```jsonc
{
	"rsc": true,
	"tsx": true,
	"tailwind": { "css": "app/globals.css", "cssVariables": true },
	"aliases": {
		"components": "@/shared/components",
		"ui": "@/shared/components/ui",
		"utils": "@/shared/utils/cn",
		"lib": "@/shared/lib",
		"hooks": "@/shared/hooks",
	},
}
```

**`knip.config.ts`** — la détection d'exports morts, indispensable à douze layers :

```ts
const config: KnipConfig = {
	// Les templates d'e-mail sont des points d'entrée : rien dans l'app ne les
	// importe, ils sont rendus par un service. Sans ça, knip les déclare morts.
	entry: ["emails/*.tsx"],
	ignore: ["e2e/**", "scripts/**"],
	// Un client GÉNÉRÉ résout ses types runtime sur le paquet : le retirer
	// casse `tsc` alors qu'aucun import direct n'apparaît.
	ignoreDependencies: ["@prisma/client"],
	rules: { duplicates: "off", binaries: "off", unlisted: "off" },
};
```

**`playwright.config.ts`** — trois décisions structurantes :

```ts
export default defineConfig({
	testDir: "./e2e",
	globalSetup: "./e2e/global-setup.ts",
	fullyParallel: true,
	// 1 retry en local, 2 en CI. Un test repêché reste SIGNALÉ « flaky » : on ne
	// masque rien, on évite juste qu'une queue de flakes de charge bloque un push.
	retries: process.env.CI ? 2 : 1,
	projects: [
		// Projet de SETUP : produit l'état d'authentification une fois, réutilisé
		// par tous les projets « authenticated ». Sans ça, chaque spec se reconnecte.
		{ name: "setup", testMatch: /auth\.setup\.ts/ },
		{ name: "chromium", testIgnore: [/authenticated\//, /__tests__\//] },
		{
			name: "admin",
			dependencies: ["setup"],
			testMatch: /authenticated\//,
			use: { storageState: "e2e/.auth/admin.json" },
		},
	],
});
```

> ⚠️ Le `testIgnore: /__tests__\//` n'est pas cosmétique : `e2e/pages/__tests__/` contient des
> tests **Vitest** portant sur les page objects (stabilité des sélecteurs). Sans l'exclusion,
> Playwright essaie de les exécuter et échoue sur un import qu'il ne connaît pas.

---

## 3. `app/` — la couche de routage

### 3.1 Groupes de routes

```
app/
├── (shop)/                    # Storefront public — layout propre (navbar, footer)
│   ├── layout.tsx
│   ├── error.tsx
│   ├── (home)/                # Groupe imbriqué : la home + les composants de chrome
│   │   ├── page.tsx
│   │   ├── error.tsx
│   │   └── _components/
│   │       ├── navbar/        # 20 fichiers — un seul consommateur : le layout (shop)
│   │       ├── hero/
│   │       ├── atelier/
│   │       └── footer.tsx
│   ├── produits/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── _components/
│   │   ├── _utils/
│   │   │   └── __tests__/
│   │   └── [productTypeSlug]/
│   │       ├── page.tsx
│   │       ├── loading.tsx
│   │       ├── error.tsx
│   │       ├── not-found.tsx
│   │       └── opengraph-image.tsx
│   └── …
├── (legal)/                   # Pages statiques — layout minimal, pas de nav marchande
├── admin/
│   ├── connexion/             # HORS garde (sinon boucle de redirection)
│   └── (protected)/           # Garde d'accès : layout + assertion par page
│       ├── layout.tsx
│       ├── _components/
│       ├── (dashboard)/
│       ├── catalogue/
│       │   ├── produits/
│       │   │   ├── page.tsx  loading.tsx  error.tsx
│       │   │   ├── _components/  _utils/
│       │   │   ├── nouveau/
│       │   │   └── [slug]/
│       │   │       ├── modifier/
│       │   │       └── variantes/[variantId]/{modifier,prix,stock}/
│       │   └── …
│       └── ventes/
├── api/                       # Route handlers (webhooks, health, export, upload)
├── layout.tsx                 # Root : html/body, fonts, providers globaux
├── globals.css                # Tokens @theme Tailwind v4 + reset
├── styles/                    # Feuilles CSS découpées, importées par globals.css
├── not-found.tsx  forbidden.tsx  unauthorized.tsx  global-error.tsx
├── opengraph-image.tsx  robots.ts  sitemap.ts
└── generated/                 # Sortie Prisma — GÉNÉRÉ, ignoré par eslint/prettier
```

### 3.2 Les trois dossiers privés

| Dossier        | Contenu                                                    | Quand il devient un module |
| -------------- | ---------------------------------------------------------- | -------------------------- |
| `_components/` | Composants dont l'unique consommateur est ce segment       | Dès le 2ᵉ segment appelant |
| `_utils/`      | Parsing de `searchParams`, mapping d'URL propre à la route | Dès qu'il touche la DB     |
| `_hooks/`      | Hook d'état propre à un écran                              | Dès le 2ᵉ écran appelant   |

**Règle de promotion** : un fichier `_components/` importé depuis un second segment déménage dans
`modules/<domaine>/components/`. Ne jamais importer un `_components/` d'une autre route — c'est
le signal exact que l'artefact a changé de statut.

### 3.3 Fichiers spéciaux : la règle non négociable

Toute page qui fait de l'**IO non caché** (DB directe, `cookies()`, `headers()`) **doit** avoir un
`loading.tsx` frère. Sans lui, le prérendu partiel échoue à la construction. En pratique : dans ce
dépôt, chaque `page.tsx` non statique est accompagnée d'un `loading.tsx` et d'un `error.tsx`. Prends
ça comme un triplet par défaut, pas comme une option.

Corollaire à connaître : depuis une frontière Suspense, un `notFound()` est streamé **après** le
shell — le contenu affiché est bien la 404, mais le **statut HTTP reste 200**. Tes tests E2E doivent
asserter le **contenu**, jamais le statut.

Le tableau complet des fichiers spéciaux, avec la règle d'usage :

| Fichier               | Portée                    | Règle                                                                          |
| --------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `layout.tsx`          | Le segment et ses enfants | ⚠️ **N'est PAS ré-exécuté** en navigation client entre routes qui le partagent |
| `page.tsx`            | Le segment                | 20–60 lignes, zéro accès DB direct                                             |
| `loading.tsx`         | Frontière Suspense        | **Obligatoire** dès qu'il y a de l'IO non caché                                |
| `error.tsx`           | Le segment et ses enfants | Doit être un composant client ; ne rattrape PAS les erreurs du layout frère    |
| `not-found.tsx`       | Le segment                | Statut 200 quand streamé (cf. ci-dessus)                                       |
| `route.ts`            | Un endpoint HTTP          | Contexte différent d'une action : autre API de cache, autre garde (§ 3.4)      |
| `opengraph-image.tsx` | Une image de partage      | Doit pré-rendre en buffer pour que l'échec soit attrapable                     |
| `sitemap.ts`          | `/sitemap.xml`            | Lit par une fonction `data/` dédiée, jamais un `findMany` inline               |
| `robots.ts`           | `/robots.txt`             | —                                                                              |

> **Le piège du layout** : un `layout.tsx` de garde donne le sentiment de protéger toutes ses
> pages. C'est faux en navigation client — le layout n'est pas ré-exécuté quand on passe d'une page
> à l'autre **sous le même layout**. La garde doit donc être posée **par page**, et un test doit
> vérifier que chaque page la porte. Ce document appelle cette classe d'erreur une « promesse de
> layout » ; c'est le bug d'autorisation le plus courant de l'App Router.

### 3.4 `app/api/` — les route handlers ne sont pas des Server Actions

Même métier, contexte d'exécution **différent**, donc trois divergences non négociables :

| Aspect        | Server Action (`"use server"`)    | Route handler (`route.ts`)                  |
| ------------- | --------------------------------- | ------------------------------------------- |
| Garde d'accès | `requireAdmin()` → `{ error }`    | `requireAdminApiRoute()` → `Response`       |
| Invalidation  | `updateTag(tag)`                  | `revalidateTag(tag, { expire: 0 })`         |
| Erreur        | `ActionState` sérialisé au client | Code HTTP — un tiers le lit et **rejoue**   |
| Entrée        | `FormData`, validée par Zod       | `Request`, validée par Zod **et signature** |

```
app/api/
├── webhooks/<fournisseur>/route.ts   # Entrée signée d'un tiers
├── admin/<ressource>/<action>/route.ts  # Endpoint admin (export, batch)
├── health/route.ts                   # Sonde d'infra
└── <intégration>/route.ts            # SDK tiers qui exige un handler
```

Gabarit d'un webhook — le cas le plus délicat, parce que l'appelant **rejoue** :

```ts
// app/api/webhooks/stripe/route.ts
export const maxDuration = 60;

export async function POST(request: Request) {
	const secret = process.env.STRIPE_WEBHOOK_SECRET;
	if (!secret) {
		logger.error("Secret webhook manquant");
		return NextResponse.json({ error: "Non configuré" }, { status: 500 });
	}

	// 1. Signature AVANT tout : le corps est du texte brut non fiable
	const signature = (await headers()).get("stripe-signature");
	if (!signature) return NextResponse.json({ error: "Signature manquante" }, { status: 400 });

	const body = await request.text(); // .text(), PAS .json() — la signature porte sur les octets

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(body, signature, secret);
	} catch {
		// 400 : signature invalide = ne PAS rejouer
		return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
	}

	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const tags = await markOrderPaidFromSession(event.data.object);
				// ⚠️ Contexte route handler : `updateTag` THROW ici. C'est
				// `revalidateTag(tag, { expire: 0 })` qu'il faut, via le helper partagé.
				revalidateTagsInBackground(tags);
				break;
			}
			default:
				// Un event non traité est un SUCCÈS : répondre 500 ferait rejouer
				// indéfiniment quelque chose qu'on ne veut pas traiter.
				break;
		}
		return NextResponse.json({ received: true });
	} catch (e) {
		logger.error("Webhook handler failed", e);
		// 500 : le tiers redélivre. C'est VOULU — et c'est ce qui impose que le
		// traitement soit idempotent, sinon la redélivrance double l'effet.
		return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
	}
}
```

> **Les deux invariants d'un webhook**, à recopier tels quels : le **traitement est idempotent**
> (une garde de transition conditionnelle — `updateMany({ where: { id, status: "PENDING" } })` —
> plutôt qu'une table d'events déjà vus), et le **code HTTP est une instruction** au tiers : 400 =
> n'insiste pas, 500 = rejoue, 200 = c'est traité. Un `catch` qui renvoie 200 « pour faire propre »
> perd l'event définitivement.

### 3.5 `proxy.ts` — default-deny, et rien de plus

Le middleware de bord (`proxy.ts` en Next 16, `middleware.ts` avant) ne fait **qu'une** chose :
laisser passer ou non, sur des listes explicites. Il ne valide pas de session, ne lit pas la base,
ne fait pas de crypto — le runtime de bord n'a pas les APIs pour, et un middleware lent ralentit
**chaque** requête.

```ts
const publicRoutes = ["/", "/produits", "/cgv" /* … */];
const authRoutes = ["/admin/connexion"]; // testé AVANT adminRoutes : il vit SOUS /admin
const adminRoutes = ["/admin"];
const apiRoutes = ["/api/webhooks", "/api/health" /* … */]; // allowlist

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// 0. Normalisation d'URL (redirections 308) — AVANT toute décision d'accès
	// 1. API : chaque handler gère sa propre auth
	// 2. Routes d'auth — AVANT les routes admin, sinon boucle de redirection
	// 3. Routes publiques
	// 4. Routes admin : PRÉ-FILTRAGE UX (présence du cookie), pas une garde
	// 5. DEFAULT-DENY : tout le reste est bloqué
	console.warn(`[PROXY] Default-deny: route non enregistrée "${pathname}"`);
	return NextResponse.redirect(new URL("/", request.nextUrl.origin));
}
```

Quatre règles tirées de bugs réels :

1. **Ordre des tests** — la page de connexion vit **sous** le préfixe admin. Si la branche admin
   est évaluée d'abord, une visiteuse sans cookie est redirigée vers la page où elle se trouve
   déjà : boucle infinie.
2. **Fail-open assumé** — le proxy laisse passer un cookie **présent mais falsifié**. C'est une
   décision, pas un oubli : la garde réelle est côté page/action. À écrire en commentaire, sinon
   quelqu'un « corrigera » en ajoutant de la crypto dans le middleware.
3. **L'allowlist API est un droit d'entrée** — une entrée pointant vers une route inexistante
   n'ouvre rien **aujourd'hui**, mais pré-autorise le jour où le fichier est créé, sans repasser
   par la décision d'exposition. Purger les entrées mortes fait partie de la revue.
4. **La normalisation d'URL appartient ici**, pas à la page. Une redirection écrite dans une
   `page.tsx` force la lecture des paramètres au niveau supérieur, ce qui rend la page
   entièrement dynamique et coûte un rendu complet à chaque navigation.

### 3.6 Styles et polices

```
app/
├── globals.css        # POINT D'ENTRÉE UNIQUE : import Tailwind, @theme, puis les partiels
└── styles/
    ├── utilities.css       # @utility maison
    ├── animations.css      # keyframes
    ├── components.css      # classes de composants
    └── <thème>.css         # familles cohérentes, un fichier chacune
shared/styles/fonts.ts      # next/font — chargé par app/layout.tsx
```

```css
/* app/globals.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@custom-variant can-hover (@media (hover: hover) and (pointer: fine));

/* Découpage par FAMILLE, pas par page : un partiel par sujet, importé ici. */
@import "./styles/utilities.css";
@import "./styles/animations.css";
@import "./styles/components.css";

@theme {
	/* Les tokens @theme SONT la config Tailwind v4 — pas « du CSS en plus ».
	   Ne jamais les dupliquer en variables CSS brutes à côté. */
	--color-brand-primary: oklch(85% 0.1 350);
	--font-display: var(--font-display-loaded), system-ui, sans-serif;
}
```

**Trois règles de style, transposables telles quelles :**

- **Critère d'admission d'un token** — identique à celui de `shared/` : ≥ 2 consommateurs, ou
  coordination JS↔CSS, ou verrouillé par un test. Une valeur décorative mono-usage s'écrit en
  arbitraire au point d'appel.
- **Les seuils responsive sont une SSOT partagée** entre le JS et le CSS. Un seuil écrit en pixels
  dans un `matchMedia()` décroche du CSS dès que la police racine change de taille — et les
  composants qui basculent selon le viewport tombent alors dans un trou.
- **Une pile de repli de police se déclare en littéral** dans chaque loader. Les analyseurs
  statiques de police n'évaluent pas les variables : factoriser la pile dans une constante la rend
  invisible au build, sans erreur.

### 3.7 `app/generated/` — le code généré, et pourquoi il vit là

Le client de base de données est **généré**, pas écrit. Il doit donc :

- être **exclu d'ESLint, de Prettier et de knip** (c'est des dizaines de milliers de lignes) ;
- être régénérable par le script de build (`prisma generate && next build`), jamais commité à la
  main ;
- ne **jamais** être importé directement par une page ou un composant — seul `shared/lib/prisma.ts`
  l'importe, et lui seul est importé par le reste.

> Le placer sous `app/` est une contrainte de certains hébergeurs (le traçage de fichiers du build
> ne suit que ce qui est sous la racine de l'app). Si ton hébergeur ne l'impose pas, `generated/` à
> la racine est plus propre — la règle qui compte est **un seul importateur**, pas l'emplacement.

---

## 4. `modules/` — un domaine, douze layers

### 4.1 La table de décision

C'est le cœur du système. Une seule question à se poser : **qu'est-ce que ce code fait ?**

| Besoin                                           | Layer         | Nommage                      |
| ------------------------------------------------ | ------------- | ---------------------------- |
| Lire des données (avec cache)                    | `data/`       | `get-products.ts`            |
| Muter la base (Server Action)                    | `actions/`    | `create-product.ts`          |
| Transformer, calculer, construire un `WHERE`     | `services/`   | `product-pricing.service.ts` |
| Valider une entrée (Zod)                         | `schemas/`    | `product.schemas.ts`         |
| Valeurs figées, `select` Prisma, tags de cache   | `constants/`  | `product.constants.ts`       |
| Rendre de l'UI                                   | `components/` | `product-card.tsx`           |
| État / effets côté client                        | `hooks/`      | `use-delete-product.ts`      |
| Type guard, formateur pur, helper d'une ligne    | `utils/`      | `format-price-range.ts`      |
| Types du domaine                                 | `types/`      | `product.types.ts`           |
| Primitive bas niveau du domaine (crypto, cookie) | `lib/`        | `cart-cookie.ts`             |
| Contexte React propre au domaine                 | `contexts/`   | `cart-context.tsx`           |
| Configuration déclarative du domaine             | `config/`     | `taxonomy.config.ts`         |

Tous les modules n'ont pas les douze layers — **on ne crée un dossier que quand il a du contenu**
(§ 4.8 donne la répartition réelle). Un module « transitions de webhook » n'a qu'un `services/` ;
un module de taxonomie n'a que `components/`, `config/`, `hooks/`, `types/`.

⚠️ **`config/` n'est pas un synonyme de `constants/`.** `constants/` fige des **valeurs**
(un seuil, un `select`, un tag) ; `config/` décrit une **structure paramétrable** que le code
parcourt — un catalogue de facettes, une carte de routes, un registre de types. Si le fichier est
un objet que trois composants **itèrent**, c'est de la config ; si c'est une valeur qu'ils
**lisent**, c'est une constante. En cas de doute : `constants/`, qui est le cas courant.

### 4.2 Anatomie complète d'un module

Exemple réel du plus gros domaine du dépôt, réduit à sa structure :

```
modules/products/
├── actions/                    # "use server" — 1 fichier = 1 action exportée
│   ├── create-product.ts
│   ├── update-product.ts
│   ├── delete-product.ts
│   ├── duplicate-product.ts
│   ├── toggle-product-status.ts
│   └── load-more-products.ts
├── data/                       # Lectures cachées — 1 fichier = 1 requête
│   ├── __tests__/
│   ├── get-product.ts
│   ├── get-products.ts
│   ├── count-products.ts
│   ├── get-related-products.ts
│   ├── get-sitemap-products.ts
│   └── resolve-filter-slugs.ts
├── services/                   # Logique pure, testable sans DB ni DOM
│   ├── __tests__/
│   ├── product-pricing.service.ts
│   ├── product-availability.service.ts
│   ├── product-display.service.ts
│   ├── product-filter-params.service.ts
│   ├── product-validation.service.ts
│   └── product-query-builder.ts
├── schemas/
│   ├── product.schemas.ts          # entité
│   ├── product-mutation.schemas.ts # entrées d'actions
│   └── product-query.schemas.ts    # entrées d'URL
├── constants/
│   ├── product.constants.ts        # dont GET_PRODUCTS_SELECT (select Prisma)
│   ├── cache.ts                    # tags de cache — SSOT, jamais un littéral
│   └── search.constants.ts
├── components/
│   ├── __tests__/                  # colocalisé
│   ├── product-card.tsx            # storefront
│   ├── product-catalog.tsx
│   ├── admin/                      # sous-dossier par SURFACE, pas par type
│   │   ├── __tests__/
│   │   ├── create-product-form.tsx
│   │   ├── products-data-table.tsx
│   │   └── product-detail/         # écran complexe → sous-dossier + index.ts
│   │       ├── index.ts
│   │       ├── product-detail-page.tsx
│   │       └── product-detail-*-card.tsx
│   └── quick-search-dialog/
│       └── index.ts
├── hooks/
│   ├── __tests__/
│   ├── use-create-product-form.ts
│   ├── use-delete-product.ts
│   └── use-recent-searches.ts
├── utils/
│   ├── __tests__/
│   ├── format-price-range.ts
│   ├── parse-product-params.ts
│   └── seo/
│       ├── generate-metadata.ts
│       └── generate-structured-data.ts
└── types/
    ├── product.types.ts
    └── product-list.types.ts
```

### 4.3 Spécification des douze layers

Une fiche par layer. C'est la référence à consulter quand on hésite sur l'emplacement d'un
fichier — la colonne **« n'y va JAMAIS »** tranche plus vite que la colonne « y va ».

---

#### `data/` — lectures

|                     |                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------- |
| **Rôle**            | Lire la base, avec cache. Une fonction = un fichier = une requête.                       |
| **Y va**            | Requêtes de lecture, comptages, agrégats, résolution slug → entité, requêtes de sitemap. |
| **N'y va JAMAIS**   | Écriture, JSX, hook React, règle de calcul, `select` inline.                             |
| **Nommage**         | `get-*.ts`, `count-*.ts`, `resolve-*.ts` — le fichier porte le nom de la fonction.       |
| **Peut importer**   | `constants/`, `schemas/`, `types/`, `services/`, `utils/`, `lib/`, le client DB.         |
| **Directive**       | `"use cache"` sur la fonction **interne**, jamais sur le point d'entrée validant.        |
| **Testé par**       | Test unitaire avec client DB mocké, ou test d'intégration si la requête est subtile.     |
| **Signal d'erreur** | Un `if` métier dans la requête → la règle appartenait à `services/`.                     |

**Invariant** : le `select` **ne s'écrit jamais inline** ; il vit dans `constants/`. Sinon une
migration de schéma le rate silencieusement — la requête continue de compiler et cesse de ramener
un champ.

---

#### `actions/` — mutations

|                     |                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------ |
| **Rôle**            | Muter l'état côté serveur depuis l'UI. Un export principal par fichier.                    |
| **Y va**            | Création, modification, suppression, bascule d'état, actions de rafraîchissement.          |
| **N'y va JAMAIS**   | Un helper exporté (il deviendrait un endpoint public), du JSX, une règle métier complexe.  |
| **Nommage**         | `<verbe>-<entité>.ts` — `create-product.ts`, `toggle-product-status.ts`.                   |
| **Peut importer**   | `schemas/`, `services/`, `constants/`, `utils/`, `lib/`, la garde d'auth, le client DB.    |
| **Directive**       | `"use server"` en **première ligne**.                                                      |
| **Testé par**       | Test unitaire (garde + validation + effet), puis test de **contrat** à l'échelle du dépôt. |
| **Signal d'erreur** | Plus de ~80 lignes → la règle métier aurait dû descendre dans `services/`.                 |

**Invariant** : un fichier `"use server"` transforme **chaque export** en endpoint RPC appelable
avec n'importe quoi — les types TypeScript sont effacés à l'exécution. Donc **garde → parse →
muter → invalider**, dans cet ordre, avant toute dérivation de l'argument (§ 4.4).

⚠️ **Un helper appelé par une action ne vit jamais dans un fichier `"use server"`.** Valider dans
le wrapper ne protège pas le wrappé : il est exposé séparément. Les helpers vont dans `services/`
ou `shared/lib/`.

---

#### `services/` — logique métier pure

|                     |                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Rôle**            | Calculer, décider, transformer. Entrées → sorties, sans effet de bord.                                                     |
| **Y va**            | Calculs de prix, règles de disponibilité, construction de clauses `WHERE`, validation métier, dérivation d'affichage, tri. |
| **N'y va JAMAIS**   | Accès DB, JSX, hook React, `fetch`, date courante, aléatoire, lecture de cookies.                                          |
| **Nommage**         | `<entité>-<sujet>.service.ts`. Exception : `*-query-builder.ts` pour les clauses.                                          |
| **Peut importer**   | `types/`, `constants/`, `schemas/`, d'autres `services/`, `utils/`.                                                        |
| **Testé par**       | Test unitaire **sans aucun mock** — c'est le critère de pureté.                                                            |
| **Signal d'erreur** | Le test a besoin d'un mock → une dépendance interdite est entrée.                                                          |

**Invariant** : ne touche ni la DB ni le DOM. C'est ce qui rend le layer testable en trois lignes,
et c'est là que doit vivre l'essentiel de la logique métier.

**Exception documentée** : un service **transactionnel** partagé par plusieurs appelants (un
webhook et une action admin qui doivent appliquer la _même_ transition atomique) a le droit de
porter la transaction — l'atomicité ne peut pas être coupée en deux. Elle s'écrit en commentaire
d'en-tête du fichier.

---

#### `schemas/` — frontière de confiance

|                     |                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Rôle**            | Décrire et valider tout ce qui vient de l'extérieur.                                  |
| **Y va**            | Schémas d'entrée d'action, de paramètres d'URL, de payload tiers, fragments partagés. |
| **N'y va JAMAIS**   | Une requête, une transformation métier, un type dérivé d'une entité DB.               |
| **Nommage**         | `<entité>-<usage>.schemas.ts` — `product-query`, `product-mutation`, `product-media`. |
| **Peut importer**   | `constants/` (les bornes), `types/`, Zod.                                             |
| **Testé par**       | Test unitaire sur les cas limites, uniquement si le schéma porte une transformation.  |
| **Signal d'erreur** | Un fichier `*.schemas.ts` de plus de ~150 lignes → découper par usage.                |

**Invariant** : les messages d'erreur sont **dans le schéma**, en langue d'UI — ils remontent tels
quels au formulaire. Les bornes viennent de `constants/`, pour que le schéma serveur et l'attribut
HTML du champ ne puissent pas diverger.

---

#### `constants/` — la SSOT des valeurs

|                     |                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| **Rôle**            | Figer ce qui doit être écrit une seule fois.                                                         |
| **Y va**            | `select` DB, tags de cache, seuils, limites de validation, libellés partagés, options de formulaire. |
| **N'y va JAMAIS**   | Une fonction qui calcule, une valeur utilisée à un seul endroit, un secret.                          |
| **Nommage**         | `<sujet>.constants.ts` — ou nom nu si non ambigu (`cache.ts`, cf. § 9.2).                            |
| **Peut importer**   | `types/`, les constantes transverses de `shared/constants/`.                                         |
| **Testé par**       | Indirectement. Exception : un `select` mérite un test de validité contre le schéma.                  |
| **Signal d'erreur** | Une constante à un seul consommateur → elle appartenait au fichier qui l'utilise.                    |

**Invariant** : un tag de cache, un `select`, une limite ne s'écrivent **jamais** en littéral au
call site. Un littéral dupliqué est une invalidation qui ne se déclenchera pas, et personne ne le
verra.

---

#### `components/` — le rendu

|                     |                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Rôle**            | Rendre. Composer. Ne rien décider de métier.                                                       |
| **Y va**            | Composants du domaine, leurs squelettes de chargement, leurs dialogues, leurs cellules de tableau. |
| **N'y va JAMAIS**   | Une requête inline, un calcul de prix, une constante de style partagée.                            |
| **Nommage**         | `<entité>-<rôle>.tsx` — `product-card.tsx`, `product-detail-header.tsx`.                           |
| **Sous-dossiers**   | `admin/` (back-office), `<composite>/` + `index.ts` (écran complexe), `__tests__/`.                |
| **Peut importer**   | `services/`, `constants/`, `types/`, `hooks/`, `actions/`, `shared/components/`.                   |
| **Testé par**       | Test de rendu (jsdom) sur le contrat visible : rôles ARIA, textes, états.                          |
| **Signal d'erreur** | Plus de 40 fichiers à plat → découper par **surface**, jamais par type de composant.               |

**Invariant** : le découpage interne se fait par **surface** (`admin/`, un écran), jamais par type
(`cards/`, `forms/`, `buttons/`). Un découpage par type reproduit à l'intérieur du module l'erreur
que le module existait pour corriger.

---

#### `hooks/` — l'état client

|                     |                                                                              |
| ------------------- | ---------------------------------------------------------------------------- |
| **Rôle**            | Câbler une action ou un état client à un composant.                          |
| **Y va**            | Wrappers d'actions, état de formulaire, état d'UI du domaine, filtres d'URL. |
| **N'y va JAMAIS**   | Un appel DB, une règle métier, une mémoïsation manuelle.                     |
| **Nommage**         | `use-<verbe>-<entité>.ts`.                                                   |
| **Peut importer**   | `actions/`, `services/`, `constants/`, `types/`, `shared/hooks/`.            |
| **Directive**       | `"use client"`.                                                              |
| **Testé par**       | Test unitaire avec `renderHook`, ou indirectement par le composant.          |
| **Signal d'erreur** | Un hook de plus de ~50 lignes → un générique manquait dans `shared/hooks/`.  |

**Invariant** : un hook de domaine est un **câblage**, pas une implémentation. Le comportement
générique (attente, toast, erreur) vit une fois dans `shared/hooks/`, ce qui rend toutes les
mutations du dépôt identiques du point de vue de l'utilisatrice.

---

#### `utils/` — helpers purs

|                     |                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| **Rôle**            | Transformer sans connaître le métier.                                                                     |
| **Y va**            | Formatage, parsing de paramètres, construction d'URL, type guards, helpers de cache, sous-dossier `seo/`. |
| **N'y va JAMAIS**   | Une règle métier, un accès DB, du JSX.                                                                    |
| **Nommage**         | `<verbe>-<objet>.ts` — `format-price-range.ts`, `build-variant-url.ts`.                                   |
| **Peut importer**   | `constants/`, `types/`, `schemas/`, d'autres `utils/`.                                                    |
| **Testé par**       | Test unitaire — ce sont les tests les moins chers du dépôt.                                               |
| **Signal d'erreur** | `utils/` plus gros que `services/` → de la logique métier s'y est rangée.                                 |

**Frontière avec `services/`** : la charge sémantique. `formatPrice()` est un util ;
`computeEffectivePrice(variant, product)` connaît une règle — c'est un service. Test rapide : le
nom de la fonction contient-il un terme du métier ?

---

#### `types/` — le vocabulaire

|                     |                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Rôle**            | Nommer les formes manipulées par le domaine.                                                                        |
| **Y va**            | Types d'entités enrichies, formes minimales attendues par les services, unions littérales, types de props partagés. |
| **N'y va JAMAIS**   | Une valeur exécutable, un `enum` exporté globalement, une constante déguisée.                                       |
| **Nommage**         | `<sujet>.types.ts`.                                                                                                 |
| **Peut importer**   | Les types générés du client DB, `shared/types/`, d'autres `types/`.                                                 |
| **Testé par**       | Le compilateur.                                                                                                     |
| **Signal d'erreur** | Un type importé par un seul fichier → il appartenait à ce fichier.                                                  |

**Invariant** : typer par **besoin**, pas par table. Un service typé sur l'entité complète devient
intestable (il faut fabriquer trente champs) et se couple au schéma.

---

#### `lib/` — primitives bas niveau du domaine

|                     |                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **Rôle**            | Ce qui n'est ni logique pure ni accès DB : cookies, crypto, sérialisation.                     |
| **Y va**            | Lecture/écriture d'un cookie de domaine, génération et vérification de jetons, gardes d'accès. |
| **N'y va JAMAIS**   | Une requête DB, du JSX, une règle de calcul.                                                   |
| **Nommage**         | `<sujet>-<mécanisme>.ts` — `cart-cookie.ts`, `order-tracking-token.ts`.                        |
| **Peut importer**   | `constants/`, `types/`, `shared/lib/`, les APIs serveur du framework.                          |
| **Testé par**       | Test unitaire, y compris les entrées **malformées** — c'est l'essentiel du test.               |
| **Signal d'erreur** | Deux fichiers qui parlent du même format → un seul doit le posséder.                           |

**Invariant** : un seul fichier possède un format. Tout ce qui vient du client est validé **sans
throw** — un `JSON.parse` non gardé sur un cookie est une erreur 500 déclenchable par quiconque.

---

#### `contexts/` — le passage de comportement

|                     |                                                                                 |
| ------------------- | ------------------------------------------------------------------------------- |
| **Rôle**            | Éviter de faire traverser un callback sur cinq niveaux.                         |
| **Y va**            | Contexte + hook d'accès, en versions stricte et tolérante.                      |
| **N'y va JAMAIS**   | Des **données** (elles descendent en props depuis le serveur), un store global. |
| **Nommage**         | `<domaine>-<sujet>-context.tsx`.                                                |
| **Directive**       | `"use client"`.                                                                 |
| **Signal d'erreur** | Le contexte porte une liste d'entités → ces données auraient dû être des props. |

---

#### `config/` — structure paramétrable

|                     |                                                                             |
| ------------------- | --------------------------------------------------------------------------- |
| **Rôle**            | Décrire une structure que le code **parcourt**.                             |
| **Y va**            | Registre de facettes, carte de routes, catalogue de types déclaratif.       |
| **N'y va JAMAIS**   | Une valeur simple (→ `constants/`), un secret (→ variable d'environnement). |
| **Nommage**         | `<sujet>.config.ts`.                                                        |
| **Signal d'erreur** | Le fichier n'est jamais itéré → c'était une constante.                      |

---

**Les trois layers qu'on crée à tort**, et ce qu'il faut faire à la place :

| Layer inventé | Ce qui s'y range en réalité | Où ça va vraiment                               |
| ------------- | --------------------------- | ----------------------------------------------- |
| `helpers/`    | Un mélange de tout          | `utils/` ou `services/`, selon la charge métier |
| `api/`        | Des appels serveur          | `data/` (lecture) ou `actions/` (écriture)      |
| `interfaces/` | Des types                   | `types/`                                        |

### 4.4 Un exemple de code par layer

Onze gabarits — les douze layers, moins `config/` (trivial) et le fil complet en prime. Le code ci-dessous est extrait du dépôt et condensé — il garde la
**forme** à reproduire (ordre des étapes, imports, signature), pas le métier.

Ils s'enchaînent dans cet ordre de lecture : `types` → `schemas` → `constants` → `services` →
`data` → `actions` → `utils` → `lib` → `hooks` → `contexts` → `components`. Chaque exemple
n'utilise que des layers déjà vus.

---

#### `types/` — le vocabulaire du domaine

Pas de logique, pas d'import runtime au-delà des types Prisma. Un fichier par thème
(`product.types.ts`, `product-list.types.ts`), pas un fichier fourre-tout.

```ts
// modules/products/types/product-services.types.ts
import type { StockStatus as SharedStockStatus } from "@/shared/types/product-variant.types";

// Re-export depuis shared — évite la dépendance circulaire entre modules
export type StockStatus = SharedStockStatus;

export interface PriceInfo {
	minPrice: number;
	maxPrice: number;
	hasMultiplePrices: boolean;
}

/** Forme MINIMALE attendue par le service — pas l'entité Prisma complète. */
export interface VariantForPricing {
	active: boolean;
	/** Override du prix produit — null = hérite du prix produit */
	priceCents: number | null;
	stock?: number;
}
```

> **Le point qui compte** : `VariantForPricing` ne dit pas « une variante », il dit « ce dont
> j'ai besoin pour calculer un prix ». Un service typé sur l'entité Prisma complète devient
> intestable (il faut fabriquer 30 champs) et se couple au schéma. Type par **besoin**, pas par
> table.

---

#### `schemas/` — la frontière de confiance (Zod)

Un schéma par usage, pas un schéma géant : `*-query.schemas.ts` (entrées d'URL),
`*-mutation.schemas.ts` (entrées d'actions), `*-media.schemas.ts` (fragments partagés).

```ts
// modules/products/schemas/product-mutation.schemas.ts
import { z } from "zod";
import { PRODUCT_NAME_MAX } from "@/shared/constants/validation-limits";

export const toggleProductStatusSchema = z.object({
	productId: z.cuid2(),
	/** Absent = bascule ; présent = force l'état (idempotence côté appelant) */
	targetActive: z
		.enum(["true", "false"])
		.optional()
		.transform((v) => (v === undefined ? undefined : v === "true")),
});

export const createProductSchema = z.object({
	name: z.string().trim().min(1, "Le nom est requis").max(PRODUCT_NAME_MAX),
	priceCents: z.coerce.number().int().positive("Le prix doit être positif"),
	typeId: z.cuid2(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
```

> **Le point qui compte** : les messages d'erreur sont **dans le schéma**, en langue d'UI. Ils
> remontent tels quels au formulaire via `ActionState` — pas de table de traduction des codes
> d'erreur à maintenir en parallèle. Et les bornes (`PRODUCT_NAME_MAX`) viennent de
> `shared/constants/`, pour que le schéma serveur et l'attribut `maxLength` du champ ne puissent
> pas diverger.

---

#### `constants/` — la SSOT (selects, tags, seuils)

```ts
// modules/products/constants/product.constants.ts
import type { Prisma } from "@/app/generated/prisma/client";

export const GET_PRODUCT_SELECT = {
	id: true,
	slug: true,
	name: true,
	priceCents: true,
	active: true,
	type: { select: { id: true, slug: true, label: true } },
	media: {
		select: { id: true, url: true, alt: true, type: true, position: true },
		// Tiebreaker `id` : deux médias à même position (reorder concurrent) doivent
		// rendre un ordre STABLE entre deux requêtes, sinon la galerie sautille.
		orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
		take: 50,
	},
	variants: {
		where: { active: true },
		select: { id: true, priceCents: true, stock: true, active: true },
	},
} as const satisfies Prisma.ProductSelect;

/** Dérivé : l'édition admin doit voir AUSSI les variantes inactives. */
export const GET_PRODUCT_FOR_EDIT_SELECT = {
	...GET_PRODUCT_SELECT,
	variants: { ...GET_PRODUCT_SELECT.variants, where: {} },
} as const satisfies Prisma.ProductSelect;
```

```ts
// modules/products/constants/cache.ts
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

export const PRODUCTS_CACHE_TAGS = {
	LIST: SHARED_CACHE_TAGS.PRODUCTS_LIST,
	DETAIL: (slug: string) => `product-${slug}`,
	DETAIL_BY_ID: (productId: string) => `product-id-${productId}`,
} as const;
```

> **Le point qui compte** : `as const satisfies Prisma.ProductSelect` valide le select contre le
> schéma **à la compilation** tout en gardant le type littéral — c'est ce qui fait que
> `GET_PRODUCT_SELECT` type le retour de la requête au champ près. Et un select dérivé se
> construit par **spread** du select de base : deux selects écrits à la main divergent au premier
> ajout de colonne.
>
> Le tag `DETAIL_BY_ID` existe pour une raison payée cash : un appelant qui ne connaissait que
> l'id avait écrit `DETAIL(\`product-id-${id}\`)`, produisant `product-product-id-<cuid>` — un tag
> qu'**aucun mutateur n'émettait**. L'entrée de cache n'était jamais invalidée directement. C'est
> exactement le bug qu'une SSOT de tags empêche.

---

#### `services/` — la logique pure

Ni DB, ni DOM, ni `fetch`, ni date courante. Entrées → sorties. C'est le layer le plus dense en
métier et le moins cher à tester.

```ts
// modules/products/services/product-pricing.service.ts
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import type { PriceInfo, StockStatus, VariantForPricing } from "../types/product-services.types";

/**
 * Plage de prix d'un produit : le prix effectif d'une variante est son override
 * `priceCents`, sinon le prix du produit.
 */
export function calculatePriceInfo(
	variants: VariantForPricing[] | undefined | null,
	basePriceCents = 0,
): PriceInfo {
	const fallback = { minPrice: basePriceCents, maxPrice: basePriceCents, hasMultiplePrices: false };
	if (!variants?.length) return fallback;

	const prices = variants.filter((v) => v.active).map((v) => v.priceCents ?? basePriceCents);
	if (prices.length === 0) return fallback;

	const minPrice = Math.min(...prices);
	const maxPrice = Math.max(...prices);
	return { minPrice, maxPrice, hasMultiplePrices: minPrice !== maxPrice };
}

export function determineStockStatus(
	stock: number | undefined | null,
	isActive: boolean | undefined | null,
): StockStatus {
	const qty = stock ?? 0;
	if (!isActive || qty === 0) return "out_of_stock";
	return qty <= STOCK_THRESHOLDS.LOW ? "low_stock" : "in_stock";
}
```

Son test, sans un seul mock — c'est le bénéfice entier du layer :

```ts
// modules/products/services/__tests__/product-pricing.service.test.ts
it("hérite du prix produit quand la variante n'a pas d'override", () => {
	const info = calculatePriceInfo([{ active: true, priceCents: null }], 1990);
	expect(info).toEqual({ minPrice: 1990, maxPrice: 1990, hasMultiplePrices: false });
});
```

> **Le point qui compte** : chaque fonction accepte `undefined | null` et retourne une valeur
> **totale** — jamais de throw sur une entrée creuse. Un service qui lève force chaque appelant à
> l'envelopper d'un `try`, et un `try/finally` dans un composant fait abandonner l'optimisation du
> compilateur React.

---

#### `data/` — une lecture, un fichier, un cache

```ts
// modules/products/data/get-product.ts
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { GET_PRODUCT_SELECT } from "../constants/product.constants";
import { getProductSchema } from "../schemas/product-query.schemas";
import type { GetProductParams, GetProductReturn } from "../types/product.types";
import { cacheProductDetail } from "../utils/cache.utils";

/** Point d'entrée PUBLIC : valide, puis délègue à la fonction cachée. */
export async function getProductBySlug(
	params: Partial<GetProductParams>,
): Promise<GetProductReturn | null> {
	const validation = getProductSchema.safeParse(params);
	if (!validation.success) return null;
	return fetchProduct(validation.data);
}

/** Fonction cachée : arguments déjà NORMALISÉS — ils font partie de la clé de cache. */
async function fetchProduct(params: GetProductParams): Promise<GetProductReturn | null> {
	"use cache";
	cacheProductDetail(params.slug);

	try {
		const product = await prisma.product.findUnique({
			where: { slug: params.slug },
			select: GET_PRODUCT_SELECT,
		});
		if (!product) return null;
		// Visibilité : un appelant non-admin ne voit jamais un produit inactif
		if (!params.includeDraft && !product.active) return null;
		return product;
	} catch (error) {
		logger.error("Failed to fetch product", error, { service: "fetchProduct" });
		return null;
	}
}
```

> **Le point qui compte** — c'est le pattern le plus important du fichier : **la validation est
> DEHORS du `"use cache"`, la requête est DEDANS**. La clé d'une entrée cachée est composée des
> **arguments** de la fonction ; valider à l'intérieur voudrait dire cacher une entrée par
> variante d'entrée sale (`"Bleu"`, `" bleu "`, `"bleu"` = 3 entrées pour 1 résultat). En
> normalisant avant, toutes retombent sur la même clé.
>
> Deuxième invariant : un scope `"use cache"` **ne peut pas lire les cookies** — donc la
> visibilité (`isAdmin`) entre par un **paramètre explicite** (`includeDraft`), jamais par une
> lecture de session à l'intérieur.

---

#### `actions/` — garde → parse → muter → invalider

```ts
// modules/products/actions/toggle-product-status.ts
"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { prisma } from "@/shared/lib/prisma";
import {
	handleActionError,
	notFound,
	safeFormGet,
	success,
	validateInput,
	validationError,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { toggleProductStatusSchema } from "../schemas/product-mutation.schemas";
import { validateProductForPublication } from "../services/product-validation.service";
import { getProductInvalidationTags } from "../utils/cache.utils";

export async function toggleProductStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Autorisation — AVANT toute lecture de l'argument
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Validation — les types TS n'existent plus à l'exécution
		const validation = validateInput(toggleProductStatusSchema, {
			productId: safeFormGet(formData, "productId"),
			targetActive: safeFormGet(formData, "targetActive") ?? undefined,
		});
		if ("error" in validation) return validation.error;
		const { productId, targetActive } = validation.data;

		// 3. Lecture de validation — atomique avec la mutation, donc admise ici
		const existing = await prisma.product.findUnique({
			where: { id: productId },
			select: {
				id: true,
				name: true,
				slug: true,
				active: true,
				variants: { select: { stock: true } },
			},
		});
		if (!existing) return notFound("Produit");

		const nextActive = targetActive ?? !existing.active;
		if (nextActive === existing.active) return success(`« ${existing.name} » est déjà à jour`);

		// 4. Règle métier — déléguée au service, pas écrite ici
		if (nextActive) {
			const check = validateProductForPublication(existing);
			if (!check.isValid) return validationError(check.errorMessage!);
		}

		// 5. Écriture
		const updated = await prisma.product.update({
			where: { id: productId },
			data: { active: nextActive },
			select: { id: true, name: true, slug: true, active: true },
		});

		// 6. Invalidation — la LISTE des tags vient du module, pas d'ici
		getProductInvalidationTags(updated.slug, updated.id).forEach((tag) => updateTag(tag));

		// 7. Message d'UI
		return success(
			updated.active ? `« ${updated.name} » est en vente` : `« ${updated.name} » est masqué`,
		);
	} catch (e) {
		return handleActionError(e, "Impossible de changer le statut du produit");
	}
}
```

> **Le point qui compte** : les 7 étapes sont **toujours dans cet ordre**, dans toutes les actions
> du dépôt — c'est ce qui rend un test de contrat capable de vérifier mécaniquement que l'étape 1
> et l'étape 2 sont présentes partout.
>
> `safeFormGet` existe parce que `formData.get()` retourne `FormDataEntryValue | null` — un
> `File` passé sur un champ texte deviendrait `"[object File]"` après un `String()` naïf.
>
> L'étape 3 est la seule lecture DB admise hors de `data/` : elle est **atomique avec la
> mutation** et ne bénéficierait d'aucun cache (elle doit voir l'état frais).

---

#### `utils/` — helpers purs, sans charge métier

```ts
// modules/products/utils/cache.utils.ts
import { cacheLife, cacheTag } from "next/cache";
import { PRODUCTS_CACHE_TAGS } from "../constants/cache";

/** Configure le cache d'une liste de produits (profil `catalog`). */
export function cacheProducts() {
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);
}

/** Détail : le tag LIST est co-posé — invalider la liste rafraîchit aussi les détails. */
export function cacheProductDetail(slug: string) {
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.DETAIL(slug), PRODUCTS_CACHE_TAGS.LIST);
}

/** Le PENDANT côté mutation : la liste des tags à invalider pour un produit. */
export function getProductInvalidationTags(slug: string, productId: string): string[] {
	return [
		PRODUCTS_CACHE_TAGS.LIST,
		PRODUCTS_CACHE_TAGS.DETAIL(slug),
		PRODUCTS_CACHE_TAGS.DETAIL_BY_ID(productId),
	];
}
```

> **Le point qui compte** : poseur (`cacheProductDetail`) et invalidateur
> (`getProductInvalidationTags`) sont **dans le même fichier**, volontairement. C'est l'endroit où
> l'asymétrie se voit à l'œil nu — un tag posé par le lecteur mais absent de l'invalidateur est un
> cache qui ne se rafraîchit jamais, et l'inverse est un `updateTag` mort. Les séparer, c'est
> garantir la dérive.

---

#### `lib/` — primitive bas niveau du domaine

Ce qui n'est ni de la logique métier pure (`services/`) ni un accès DB (`data/`) : cookies,
crypto, sérialisation. Un seul fichier possède le format.

```ts
// modules/cart/lib/cart-cookie.ts
import { cookies } from "next/headers";
import { shouldUseSecureCookies } from "@/shared/lib/cookie-security";
import { CART_EXPIRATION_DAYS, MAX_CART_ITEMS } from "../constants/cart";

const CART_COOKIE_NAME = "cart";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * CART_EXPIRATION_DAYS;

/** Forme cuid2, bornée — un cookie est une entrée client ARBITRAIRE. */
const CUID2_LIKE_REGEX = /^[a-z][a-z0-9]{1,31}$/;
const MAX_PRICE_AT_ADD = 1_000_000;

interface CartCookieItem {
	variantId: string;
	quantity: number;
	/** Prix constaté à l'ajout : témoin d'AFFICHAGE, jamais une base de facturation. */
	priceAtAdd: number;
}

export async function readCartCookie(): Promise<CartCookieItem[]> {
	const raw = (await cookies()).get(CART_COOKIE_NAME)?.value;
	if (!raw) return [];

	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];

		// Défensif ligne à ligne : une ligne corrompue est IGNORÉE, elle n'invalide
		// pas le panier entier (le client ne doit pas perdre son panier sur un octet).
		return parsed
			.filter(
				(item): item is CartCookieItem =>
					typeof item === "object" &&
					item !== null &&
					CUID2_LIKE_REGEX.test((item as CartCookieItem).variantId ?? "") &&
					Number.isInteger((item as CartCookieItem).quantity) &&
					(item as CartCookieItem).priceAtAdd <= MAX_PRICE_AT_ADD,
			)
			.slice(0, MAX_CART_ITEMS);
	} catch {
		return [];
	}
}

/** Ré-écrit le cookie avec un maxAge PLEIN : expiration glissante à chaque mutation. */
export async function writeCartCookie(items: CartCookieItem[]): Promise<void> {
	(await cookies()).set(CART_COOKIE_NAME, JSON.stringify(items.slice(0, MAX_CART_ITEMS)), {
		httpOnly: true,
		secure: shouldUseSecureCookies(),
		sameSite: "lax",
		maxAge: CART_COOKIE_MAX_AGE,
		path: "/",
	});
}
```

> **Le point qui compte** : tout ce qui vient du client est validé **ligne à ligne, sans throw**.
> Un `JSON.parse` non gardé sur un cookie, c'est une 500 déclenchable par n'importe qui avec un
> devtools ouvert. Et le flag `secure` passe par un helper partagé plutôt que par
> `NODE_ENV === "production"` écrit 12 fois : certains navigateurs refusent **en silence** un
> cookie `Secure` posé depuis `http://localhost`, ce qui rend le panier inerte en test E2E sans
> aucun message d'erreur.

---

#### `hooks/` — l'état client, une responsabilité chacun

```ts
// modules/products/hooks/use-delete-product.ts
"use client";

import { deleteProduct } from "@/modules/products/actions/delete-product";
import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";

interface UseDeleteProductOptions {
	onSuccess?: () => void;
}

export function useDeleteProduct(options?: UseDeleteProductOptions) {
	return useActionWithToast(deleteProduct, {
		onSuccess: () => options?.onSuccess?.(),
	});
}
```

> **Le point qui compte** : oui, 8 lignes. C'est **le but**. Le hook générique
> (`useActionWithToast` : `useActionState` + toast + gestion d'erreur) vit dans `shared/hooks/`,
> et le hook de domaine ne fait que le **câbler à une action**. Résultat : les 40 mutations du
> dépôt ont un comportement d'attente et d'erreur rigoureusement identique, et changer ce
> comportement se fait à un seul endroit.
>
> ⚠️ Avec le compilateur React 19, **pas de `useMemo` / `useCallback` / `React.memo`** dans ces
> hooks — la mémoïsation est automatique, et une mémoïsation manuelle mal placée empêche le
> compilateur de faire la sienne.

---

#### `contexts/` — passer un comportement, pas des données

```tsx
// modules/cart/contexts/cart-optimistic-context.tsx
"use client";

import { createContext, use } from "react";

export type CartOptimisticAction =
	| { type: "remove"; itemId: string }
	| { type: "updateQuantity"; itemId: string; quantity: number }
	| { type: "clear" };

export interface CartOptimisticContextValue {
	updateOptimisticCart: (action: CartOptimisticAction) => void;
	isPending: boolean;
	startTransition: React.TransitionStartFunction;
}

export const CartOptimisticContext = createContext<CartOptimisticContextValue | null>(null);

/** Version STRICTE : throw hors provider — pour les composants qui en dépendent. */
export function useCartOptimistic() {
	const context = use(CartOptimisticContext);
	if (!context) throw new Error("useCartOptimistic must be used within CartOptimisticProvider");
	return context;
}

/** Version TOLÉRANTE : pour un composant monté aussi hors du panneau panier. */
export function useCartOptimisticSafe() {
	return use(CartOptimisticContext);
}
```

> **Le point qui compte** : le contexte transporte un **dispatch** et un état de transition, pas
> le panier. Les données descendent du serveur en props ; le contexte ne sert qu'à éviter de faire
> traverser un callback sur 5 niveaux. Et la paire strict/tolérant est le pattern à copier : sans
> la variante `Safe`, un composant réutilisé hors du panneau crashe en production pour une raison
> qui n'a rien à voir avec lui. Noter aussi `use(Context)` — l'API React 19, pas `useContext`.

---

#### `components/` — composition, découpés par surface

Un Server Component par défaut ; `"use client"` seulement sur la feuille qui a besoin d'un
gestionnaire d'événement ou d'un état.

```tsx
// modules/products/components/product-card.tsx  (Server Component — pas de "use client")
import Image from "next/image";
import Link from "next/link";
import { AddToCartCardButton } from "@/modules/cart/components/add-to-cart-card-button";
import { WishlistButton } from "@/modules/wishlist/components/wishlist-button";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/cn";
import { IMAGE_SIZES } from "../constants/product-texts.constants";
import { getProductCardData } from "../services/product-display.service";
import type { ProductCarouselItem } from "../types/product.types";

interface ProductCardProps {
	product: ProductCarouselItem;
	/** Index dans la liste : pilote le chargement eager + la priorité LCP de la 1ʳᵉ image. */
	index?: number;
	isInWishlist?: boolean;
}

export function ProductCard({ product, index = 0, isInWishlist = false }: ProductCardProps) {
	// Toute la dérivation est dans le SERVICE — le composant ne fait que rendre.
	const { href, image, priceLabel, isSoldOut } = getProductCardData(product);
	const isAboveFold = index === 0;

	return (
		<article className={cn("group relative", isSoldOut && "opacity-70")}>
			{image ? (
				<Image
					src={image.url}
					alt={image.alt ?? ""}
					sizes={IMAGE_SIZES.CARD}
					fill
					priority={isAboveFold}
					loading={isAboveFold ? "eager" : "lazy"}
				/>
			) : null}

			{isSoldOut ? (
				// pointer-events-none NON NÉGOCIABLE : le badge est au-dessus du lien étiré,
				// sans ça il crée un trou de clic au milieu de la carte.
				<Badge className="pointer-events-none absolute top-2 left-2 z-20">Épuisé</Badge>
			) : null}

			{/* Lien étiré : toute la carte est cliquable, un seul élément focusable */}
			<Link href={href} className="after:absolute after:inset-0">
				{product.name}
			</Link>
			<p>{priceLabel}</p>

			{/* Les feuilles interactives sont les SEULS composants client de la carte */}
			<WishlistButton productId={product.id} isInWishlist={isInWishlist} />
			<AddToCartCardButton product={product} />
		</article>
	);
}
```

> **Le point qui compte** : le composant ne calcule rien. `getProductCardData()` (service)
> dérive image principale, prix affiché et état de stock ; le composant les rend. C'est ce qui
> permet de tester la règle « une vidéo en position 0 n'est jamais l'image de la carte » sans
> monter un seul composant.
>
> Structure d'un dossier `components/` : la racine porte le storefront, `admin/` porte le
> back-office, et un écran complexe descend dans son propre sous-dossier avec un `index.ts`
> (`product-detail/`). Le découpage se fait par **surface**, jamais par type de composant.

---

#### Le fil complet, du haut

Comment `app/` recolle les douze layers — c'est la page entière, et elle tient en 25 lignes :

```tsx
// app/(shop)/creations/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/modules/products/data/get-product";
import { ProductMain } from "@/modules/products/components/product-main";
import { generateProductMetadata } from "@/modules/products/utils/seo/generate-metadata";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const product = await getProductBySlug({ slug });
	return generateProductMetadata(product);
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const product = await getProductBySlug({ slug });

	if (!product) notFound();

	return <ProductMain product={product} />;
}
```

Et le `loading.tsx` frère, obligatoire dès que la page fait de l'IO non caché :

```tsx
// app/(shop)/creations/[slug]/loading.tsx
import { ProductMainSkeleton } from "@/modules/products/components/product-main-skeleton";

export default function Loading() {
	return <ProductMainSkeleton />;
}
```

> **Le point qui compte** : la page ne connaît **ni Prisma, ni Zod, ni les tags de cache**. Elle
> connaît une fonction de lecture et un composant. C'est la vérification la plus rapide que
> l'architecture tient : si une `page.tsx` importe `@/shared/lib/prisma`, une frontière a été
> franchie.

### 4.5 Barrels (`index.ts`) : usage restreint

Ce dépôt a **23 `index.ts` sur ~1500 fichiers**. Un barrel n'existe que pour un **composant
composite** dont l'extérieur ne doit voir qu'une racine (`gallery/`, `data-table/`,
`multi-select/`, `product-detail/`). Jamais de barrel de layer (`modules/products/index.ts`
n'existe pas) : il casse le tree-shaking, crée des cycles d'import, et masque qui dépend de quoi.

### 4.6 Structure interne d'un fichier

Le même ordre partout, pour que la lecture soit mécanique :

```ts
// 1. Directive éventuelle — TOUJOURS la première ligne du fichier
"use server";

// 2. Imports, groupés : node → externe → @/shared → @/modules → relatif
import { readFileSync } from "node:fs";
import { z } from "zod";
import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { PRODUCT_SELECT } from "../constants/product.constants";

// 3. Types locaux (non exportés)
interface Options { … }

// 4. Constantes de module (non exportées, sinon elles vont dans constants/)
const MAX_RETRIES = 3;

// 5. Export principal — celui qui donne son nom au fichier, EN PREMIER
export async function createProduct() { … }

// 6. Helpers privés, sous leur consommateur
function buildSlug() { … }
```

**Un export principal par fichier**, et il porte le nom du fichier. Un fichier avec trois exports
publics de même rang est un dossier qui s'ignore.

### 4.7 Vie d'un module : créer, grossir, découper, supprimer

**Créer** — un module naît quand un domaine a **sa propre entité** et **au moins deux layers**.
Avant ça, il vit dans un module existant ou dans `_components/`. Un module à un seul fichier est
un coût de navigation sans contrepartie.

**Grossir** — repères mesurés sur ce dépôt (à recalibrer, ce sont des repères, pas des seuils) :

| Signal                      | Lecture                                                        |
| --------------------------- | -------------------------------------------------------------- |
| ~20–80 fichiers             | Taille normale d'un module de domaine                          |
| `components/` > 40 fichiers | Découper par **surface** (`admin/`, `<écran>/`), pas par type  |
| `services/` > 8 fichiers    | Vérifier qu'il n'y a pas deux domaines dans un                 |
| `actions/` > 15 fichiers    | Normal si CRUD complet ; suspect si des actions se ressemblent |
| `utils/` > `services/`      | ⚠️ De la logique métier est probablement rangée en util        |

**Découper** — le bon axe est le **cycle de vie de la donnée**, jamais le type technique. Signal
fiable : deux groupes de fichiers dans le module ne partagent **aucun** import entre eux. Ils sont
déjà deux modules ; il ne reste qu'à déplacer les dossiers.

**Dépendre d'un autre module** — interdit par défaut (§ 6). Quand c'est inévitable, trois
conditions cumulatives :

1. La dépendance est **unidirectionnelle** — B ne réimporte jamais A ;
2. elle passe par un layer **stable** de la cible (`services/`, `types/`, `constants/`), jamais par
   ses `components/` ni ses `hooks/` ;
3. elle est **écrite en commentaire au point d'import**, avec la raison.

```ts
// modules/payments/services/create-checkout-session.ts
// DÉPENDANCE INTER-MODULE ASSUMÉE : le paiement doit relire les lignes du panier
// en base avant de facturer (le cookie n'est qu'un témoin d'affichage).
// Unidirectionnelle : `modules/cart` n'importe jamais `modules/payments`.
import { readCartCookie } from "@/modules/cart/lib/cart-cookie";
```

**Supprimer** — c'est le test final de l'architecture. Un module bien découpé se supprime en trois
gestes : `rm -rf modules/<domaine>`, retirer ses routes de `app/`, lancer `knip` + `tsc`. Si la
suppression laisse des trous ailleurs que dans `app/`, la frontière avait déjà fui.

### 4.8 Inventaire réel — les 17 modules du dépôt de référence

Le tableau sert de **calibrage** : il montre à quel point la répartition est irrégulière, et que
c'est normal. `•` = layer présent.

| Module          | Fichiers | Tests | `act` | `data` | `srv` | `sch` | `cst` | `cmp` | `hk` | `utl` | `typ` | `lib` | `ctx` | `cfg` |
| --------------- | -------: | ----: | :---: | :----: | :---: | :---: | :---: | :---: | :--: | :---: | :---: | :---: | :---: | :---: |
| `products`      |      199 |    71 |   •   |   •    |   •   |   •   |   •   |   •   |  •   |   •   |   •   |       |       |       |
| `variants`      |       79 |    18 |   •   |   •    |   •   |   •   |   •   |   •   |  •   |   •   |   •   |       |       |       |
| `cart`          |       60 |    35 |   •   |   •    |   •   |   •   |   •   |   •   |  •   |       |   •   |   •   |   •   |       |
| `media`         |       56 |    41 |   •   |        |   •   |   •   |   •   |   •   |  •   |   •   |   •   |       |       |       |
| `collections`   |       49 |     8 |   •   |   •    |   •   |   •   |   •   |   •   |  •   |   •   |   •   |       |       |       |
| `colors`        |       49 |    11 |   •   |   •    |   •   |   •   |   •   |   •   |  •   |   •   |   •   |       |       |       |
| `orders`        |       38 |     9 |   •   |   •    |   •   |   •   |   •   |   •   |  •   |       |   •   |   •   |       |       |
| `product-types` |       38 |     4 |   •   |   •    |   •   |   •   |   •   |   •   |  •   |   •   |   •   |       |       |       |
| `materials`     |       36 |     3 |   •   |   •    |   •   |   •   |   •   |   •   |  •   |       |   •   |       |       |       |
| `wishlist`      |       23 |     9 |   •   |   •    |       |   •   |   •   |   •   |  •   |   •   |   •   |   •   |   •   |       |
| `retractations` |       20 |     7 |   •   |   •    |   •   |   •   |   •   |   •   |      |   •   |       |       |       |       |
| `admin-auth`    |       11 |     6 |   •   |        |       |       |   •   |   •   |  •   |       |       |   •   |       |       |
| `taxonomies`    |       11 |     1 |       |        |       |       |       |   •   |  •   |       |   •   |       |       |   •   |
| `payments`      |       10 |     4 |   •   |        |   •   |   •   |   •   |   •   |      |       |       |       |       |       |
| `emails`        |        5 |     0 |       |        |   •   |       |       |       |      |       |   •   |       |       |       |
| `dashboard`     |        3 |     0 |       |   •    |       |       |       |   •   |      |       |       |       |       |       |
| `webhooks`      |        2 |     1 |       |        |   •   |       |       |       |      |       |       |       |       |       |

**Cinq lectures de ce tableau :**

1. **Un seul module a les neuf layers courants** (`products`), et c'est le module gabarit. Les
   autres se copient dessus **en retirant** ce dont ils n'ont pas besoin — jamais l'inverse.
2. **`webhooks` n'a qu'un `services/`, et c'est complet.** Un module d'orchestration transactionnelle
   n'a ni UI, ni schéma, ni lecture propre. Le forcer à en avoir aurait produit des dossiers vides.
3. **`media` n'a pas de `data/`** : le domaine ne possède aucune entité racine (les médias sont
   toujours lus **avec** leur produit). Un layer absent est une information, pas un trou.
4. **`cart` et `wishlist` ont un `lib/` et un `contexts/`** que les autres n'ont pas : ce sont les
   deux domaines dont l'état vit dans un cookie, donc avec un **format à posséder** (`lib/`) et un
   dispatch optimiste à faire traverser (`contexts/`).
5. **Le ratio de tests varie de 0 à 73 %** et suit le risque, pas la taille : `media` (41 tests pour
   56 fichiers) porte du traitement de fichier hostile, `dashboard` (0 test) n'affiche que des
   agrégats déjà testés en amont.

**Répartition par layer, sur l'ensemble des modules** — utile pour repérer une anomalie chez toi :

Mesuré sur les 689 fichiers non-tests des 17 modules (commande en § 11.5) :

| Layer         | Fichiers |  Part | Lecture                                                             |
| ------------- | -------: | ----: | ------------------------------------------------------------------- |
| `components/` |      324 |  47 % | Normal — c'est là que vit la surface                                |
| `actions/`    |       63 | 9,1 % | Un fichier court par mutation                                       |
| `hooks/`      |       59 | 8,6 % | —                                                                   |
| `services/`   |       50 | 7,3 % | ⚠️ Sous 4 %, la logique métier est ailleurs — cherche dans `app/`   |
| `constants/`  |       50 | 7,3 % | —                                                                   |
| `data/`       |       43 | 6,2 % | —                                                                   |
| `utils/`      |       39 | 5,7 % | ⚠️ S'il dépasse `services/`, du métier s'y est rangé                |
| `types/`      |       25 | 3,6 % | —                                                                   |
| `schemas/`    |       20 | 2,9 % | ⚠️ Très en dessous de `actions/` : des entrées ne sont pas validées |
| `lib/`        |       10 | 1,5 % | Deux domaines seulement possèdent un format                         |
| `contexts/`   |        3 | 0,4 % | —                                                                   |
| `config/`     |        1 | 0,1 % | Le layer le plus rare — et c'est bien ainsi                         |

**Le rapport qui compte le plus est `services/` ÷ `utils/`.** Ici 50 ÷ 39 = 1,3 : la logique métier
pèse plus que les helpers, ce qui est le bon sens de l'inégalité. Quand il s'inverse, ce n'est pas
que le projet a beaucoup de helpers — c'est que des règles métier sont rangées en `utils/`, donc
hors du layer que les tests couvrent en premier.

---

## 5. `shared/` — le transverse, sous condition

```
shared/
├── components/
│   ├── ui/                  # Primitives shadcn — NE PAS y mettre du métier
│   ├── forms/               # Champs branchés sur le form context (+ index.ts)
│   ├── data-table/          # Composites transverses (+ index.ts)
│   ├── dialogs/             # ConfirmDialog & co — la SSOT des confirmations
│   ├── navigation/  bottom-bar/  loaders/  animations/  …
│   ├── __tests__/
│   └── *.tsx                # Composants transverses simples (page-header, toolbar…)
├── lib/                     # Clients & primitives d'infrastructure
│   ├── prisma.ts  stripe.ts  uploadthing.ts  logger.ts  env.ts
│   ├── cache.ts             # Helpers d'invalidation (SSOT)
│   ├── actions/             # validateInput, success, error, handleActionError (+ index.ts)
│   ├── __mocks__/           # Mocks résolus par alias Vitest (ex. "server-only")
│   └── __tests__/
├── constants/               # brand, breakpoints, cache-tags, urls, validation-limits…
├── hooks/                   # ~35 hooks transverses (+ index.ts)
├── schemas/                 # Schémas Zod réutilisables (email, pagination, filtres, env)
├── stores/                  # Stores Zustand (dialog, sheet, overlay-stack…)
├── providers/               # Providers React qui instancient ces stores
├── contexts/                # Contextes transverses
├── types/                   # Types utilitaires (server-action, pagination, component…)
├── utils/                   # Helpers purs transverses (cn, formatage…)
├── services/  data/  actions/   # Rares : transverses n'appartenant à aucun domaine
└── styles/                  # fonts.ts
```

### 5.0 Inventaire exhaustif — les quatorze dossiers de `shared/`

Les mêmes layers que dans un module, **plus** `components/`, `providers/` et `stores/`, et **moins**
la logique métier. Volumes réels du dépôt de référence.

| Dossier       | Fichiers | Ce qui y va                                                               | Ce qui n'y va JAMAIS                                      |
| ------------- | -------: | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| `components/` |      205 | Tout composant sans domaine (§ 5.0.1)                                     | Un composant qui connaît une entité métier                |
| `hooks/`      |       34 | Comportements d'UI génériques : média queries, gestes, focus, formulaires | Un hook qui importe une action d'un module                |
| `utils/`      |       31 | `cn`, formatage, dates, slug, params d'URL, toasts, retry                 | Une règle métier — même déguisée en formatage             |
| `constants/`  |       27 | Marque, points de rupture, tags transverses, URLs, limites de validation  | Une valeur qu'un seul module consomme                     |
| `lib/`        |       27 | Clients (DB, paiement, upload), `env`, `logger`, `cache`, `actions/`      | Du métier — c'est de l'infrastructure                     |
| `types/`      |       14 | Types utilitaires : `ActionState`, pagination, props communes, tri        | Un type d'entité métier                                   |
| `schemas/`    |       10 | Schémas réutilisables : e-mail, téléphone, pagination, filtres, `env`     | Un schéma d'entité métier                                 |
| `stores/`     |        8 | Stores globaux d'UI : dialogue, panneau, pile d'overlays, consentement    | Des données de domaine (elles viennent du serveur)        |
| `providers/`  |        4 | Les providers qui **instancient** ces stores (§ 5.5)                      | De la logique — un provider ne fait que fournir           |
| `styles/`     |        1 | Chargement des polices                                                    | Du CSS (il vit dans `app/styles/`)                        |
| `contexts/`   |        1 | Contexte transverse (garde de navigation)                                 | Un contexte qui sert un seul module                       |
| `services/`   |        1 | Le rare calcul pur transverse (générateur de nom unique)                  | Presque tout — si c'est métier, ça descend dans un module |
| `data/`       |        1 | La rare lecture transverse (préférence d'UI en cookie)                    | Toute lecture d'entité métier                             |
| `actions/`    |        1 | La rare mutation transverse (préférence d'UI)                             | Toute mutation d'entité métier                            |

> **Les quatre dossiers à un seul fichier ne sont pas une anomalie — ils sont la preuve que le
> critère d'admission fonctionne.** `shared/services/`, `shared/data/`, `shared/actions/` et
> `shared/contexts/` restent quasi vides parce que **presque rien** n'est à la fois du métier et
> transverse. Le jour où `shared/services/` contient quinze fichiers, il ne reste plus de frontière :
> c'est devenu un module fourre-tout. **Surveille ce compteur, il est le meilleur indicateur de
> santé de `shared/`.**

#### 5.0.1 `shared/components/` — les 23 sous-dossiers, et la règle qui les crée

C'est le dossier qui déborde en premier dans tous les projets. La règle : **un sous-dossier par
composant COMPOSITE** (plusieurs fichiers qui ne s'utilisent que ensemble, avec un `index.ts`), et
la **racine pour les composants d'un seul fichier**.

| Sous-dossier                                                           | Fichiers | Nature                                                                           |
| ---------------------------------------------------------------------- | -------: | -------------------------------------------------------------------------------- |
| `ui/`                                                                  |       90 | **Primitives générées** — intouchables (§ 5.3)                                   |
| `forms/`                                                               |       49 | Champs branchés sur le contexte de formulaire                                    |
| `animations/`                                                          |       20 | Composants d'animation réutilisables                                             |
| `media-upload/`                                                        |       14 | Composite : dépôt de fichier, aperçu, progression                                |
| `autocomplete/`                                                        |       12 | Composite                                                                        |
| `cursor-pagination/`                                                   |       12 | Composite                                                                        |
| `bottom-bar/`                                                          |        8 | Composite                                                                        |
| `icons/`                                                               |        7 | SVG maison (les icônes de bibliothèque s'importent)                              |
| `navigation/`                                                          |        7 | Composite                                                                        |
| `data-table/`                                                          |        6 | Composite                                                                        |
| `hand-drawn/` `og/` `loaders/`                                         |        5 | Composites de marque / rendu d'image                                             |
| `admin/`                                                               |        4 | Coquilles d'écran d'administration réutilisées                                   |
| `long-press-menu-link/` `responsive-action-menu/` `sticky-action-bar/` |        4 | Composites d'interaction                                                         |
| `load-more/` `multi-select/` `sort-drawer/`                            |        3 | Composites                                                                       |
| `dialogs/`                                                             |        2 | **SSOT des confirmations** — un seul composant, très utilisé                     |
| `shelf-bar/` `analytics/`                                              |      1–2 | Composites minces                                                                |
| _(racine)_                                                             |       41 | Composants d'un seul fichier : en-tête de page, barre d'outils, bouton de copie… |

**Trois règles pour que ce dossier ne déborde pas :**

1. **Un sous-dossier n'existe qu'à partir de 2 fichiers** qui ne s'utilisent qu'ensemble. En
   dessous, c'est un fichier à la racine.
2. **Un composite expose un `index.ts`** et l'extérieur n'importe que lui. Ses fichiers internes
   ne sont pas une API publique.
3. **Un composant qui connaît une entité métier n'est pas transverse.** `ProductCard` n'a rien à
   faire ici, même utilisé par trois modules : il appartient à `modules/products/components/`, et
   les trois l'importent. La question n'est pas « qui l'utilise » mais « de quoi il parle ».

#### 5.0.2 Faire descendre plutôt que monter

L'erreur la plus fréquente en refactor : promouvoir dans `shared/` ce qui aurait dû rester dans un
module. Le test tient en une question :

> **Ce fichier nommerait-il encore quelque chose si on supprimait tous les modules ?**

`cn()`, `useMediaQuery()`, `ConfirmDialog` : oui. `pickPrimaryImage()`, `ProductCard`,
`ORDER_STATUS_LABELS` : non — ils parlent d'entités qui n'existeraient plus. Ils restent dans leur
module, quel que soit le nombre de consommateurs.

### 5.1 Le critère d'admission, en pratique

Un artefact entre dans `shared/` si **au moins un** des trois est vrai :

1. il est consommé depuis **≥ 2 modules** ;
2. il est **structurellement transverse** (client DB, tokens de design, config d'env) ;
3. il est **verrouillé par un test** transverse (accessibilité, contraste, parité de config).

Le même critère vaut pour une **variable CSS** : un token n'entre dans `globals.css` que consommé
depuis ≥ 2 fichiers, ou depuis JS **et** CSS (coordination runtime), ou verrouillé par un test. Une
valeur décorative mono-usage s'écrit en arbitraire au point d'appel.

### 5.2 La règle anti-wrapper

> **Un wrapper dont ≥ 50 % des exports sont des pass-through est un bug d'architecture.**

Elle a été payée cash ici : un fichier de 179 lignes avec 7 ré-exports sur 9 et aucune logique a
été supprimé, sa seule prop utile déplacée sur la primitive. Corollaire de nommage : un fichier ne
s'appelle `responsive-*` que s'il **rend une primitive différente selon le viewport**. Tout autre
wrapper porte un nom qui décrit ce qu'il **décide**, et n'existe que s'il change le rendu ou porte
un état non trivial.

### 5.3 `shared/components/ui/` est intouchable par le métier

Ce dossier est la sortie du générateur de primitives (shadcn ou équivalent). Il se régénère. Y
ajouter une prop métier, c'est perdre la modification au prochain `add`. Un besoin métier
s'exprime par **composition au-dessus**, dans `shared/components/` ou dans un module.

### 5.4 Les briques de `shared/` dont dépendent les exemples du § 4.4

Trois fichiers à écrire **en premier** dans un nouveau projet : tout le reste s'appuie dessus.

**`shared/types/server-action.ts`** — le contrat de retour unique de toutes les actions :

```ts
export enum ActionStatus {
	SUCCESS = "success",
	ERROR = "error",
	UNAUTHORIZED = "unauthorized",
	VALIDATION_ERROR = "validation_error",
	NOT_FOUND = "not_found",
	CONFLICT = "conflict",
	INITIAL = "initial",
}

export type ActionState =
	| { status: ActionStatus.SUCCESS; message: string; data?: unknown }
	| {
			status:
				| ActionStatus.ERROR
				| ActionStatus.UNAUTHORIZED
				| ActionStatus.VALIDATION_ERROR
				| ActionStatus.NOT_FOUND
				| ActionStatus.CONFLICT;
			message: string;
			data?: undefined;
	  }
	| { status: ActionStatus.INITIAL; message: string; data?: undefined };
```

**`shared/lib/actions/`** — les helpers qui rendent l'action de 60 lignes lisible. Découpés en
`responses.ts` (constructeurs), `validation.ts` (Zod + FormData), `errors.ts` (conversion), avec un
`index.ts` — c'est l'un des rares barrels justifiés :

```ts
// responses.ts — un constructeur par statut
export function success(message: string, data?: unknown): ActionState {
	return { status: ActionStatus.SUCCESS, message, data };
}

// validation.ts — la forme { data } | { error } permet le `if ("error" in v) return v.error`
export function validateInput<T>(
	schema: z.ZodType<T>,
	data: unknown,
): { data: T } | { error: ActionState } {
	const result = schema.safeParse(data);
	if (!result.success) {
		return {
			error: {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message ?? "Données invalides",
			},
		};
	}
	return { data: result.data };
}

/** Remplace le `formData.get("k") as string` — un File deviendrait "[object File]". */
export function safeFormGet(formData: FormData, key: string): string | null {
	const value = formData.get(key);
	return typeof value === "string" ? value : null;
}

// errors.ts
export function handleActionError(error: unknown, defaultMessage?: string): ActionState {
	// 1. Les signaux du framework (redirect, notFound…) sont des throws LÉGITIMES :
	//    les avaler casserait la navigation sans aucun message d'erreur.
	unstable_rethrow(error);

	// 2. Seules les erreurs MÉTIER exposent leur message. Une erreur Prisma ou Stripe
	//    retombe sur `defaultMessage` — sinon on fuite du schéma DB à l'utilisateur.
	if (error instanceof BusinessError) return { status: error.status, message: error.message };

	logger.error(defaultMessage ?? "Action failed", error);
	return { status: ActionStatus.ERROR, message: defaultMessage ?? "Une erreur est survenue" };
}
```

**`shared/hooks/use-action-with-toast.ts`** — le pont action ↔ UI, écrit une fois :

```tsx
"use client";

import { useActionState } from "react";

type ServerAction = (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;

export function useActionWithToast(serverAction: ServerAction, options?: UseActionOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(serverAction, createToastCallbacks(options)),
		undefined,
	);
	return { state, action, isPending };
}
```

> **Le point qui compte** : `unstable_rethrow` dans `handleActionError`. Sans lui, un `redirect()`
> ou un `notFound()` appelé dans le `try` d'une action est **attrapé par le `catch`** et converti
> en message d'erreur — la navigation n'a jamais lieu, et rien dans les logs ne dit pourquoi.
> C'est le bug le plus coûteux à diagnostiquer de toute cette liste.

### 5.5 `stores/` + `providers/` — l'état client global, en deux fichiers

Un store global écrit en singleton de module est partagé **entre les requêtes** côté serveur : les
données d'un visiteur fuient vers un autre. Le pattern à reproduire sépare donc **la fabrique** (le
store) de **l'instance** (le provider).

```ts
// shared/stores/cookie-consent-store.ts  — la FABRIQUE, aucun état de module
import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";

export const defaultInitState: CookieConsentState = { accepted: null, _hasHydrated: false };

export function createCookieConsentStore(init = defaultInitState) {
	return createStore<CookieConsentStore>()(
		persist(
			(set) => ({
				...init,
				accept: () => set({ accepted: true }),
			}),
			{ name: "cookie-consent" },
		),
	);
}
```

```tsx
// shared/providers/cookie-consent-store-provider.tsx  — l'INSTANCE, une par arbre React
"use client";

const StoreContext = createContext<StoreApi | undefined>(undefined);

export function CookieConsentStoreProvider({ children }: { children: ReactNode }) {
	// Init PARESSEUSE : `useState(() => …)` n'appelle la fabrique qu'une fois.
	// Écrire `useState(createStore())` en recréerait une à CHAQUE rendu.
	const [store] = useState(() => createCookieConsentStore());
	return <StoreContext value={store}>{children}</StoreContext>;
}

export function useCookieConsentStore<T>(selector: (s: CookieConsentStore) => T): T {
	const context = use(StoreContext);
	if (!context) throw new Error("useCookieConsentStore hors de son provider");
	return useStore(context, selector);
}
```

> **Trois points** : le hook exposé prend un **sélecteur** (sans lui, tout consommateur re-rend à
> chaque changement du store) ; `useState(() => …)` est une **initialisation paresseuse**, pas de
> la mémoïsation manuelle — elle reste autorisée sous le compilateur React ; et un store persisté
> a besoin d'un drapeau d'hydratation (`_hasHydrated`), sinon l'UI affiche l'état par défaut puis
> saute à l'état restauré, un flash visible à chaque chargement.

Les providers sont montés dans le **layout racine**, dans l'ordre de dépendance, et nulle part
ailleurs.

### 5.6 `env` et `server-only` — les deux gardes d'infrastructure

**Validation de l'environnement au démarrage**, pas au premier appel :

```ts
// shared/schemas/env.schema.ts
export const envSchema = z.object({
	DATABASE_URL: z.url(),
	AUTH_SECRET: z.string().min(32, "AUTH_SECRET doit faire au moins 32 caractères"),
	STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// shared/lib/env.ts
function validateEnv(): Env {
	const parsed = envSchema.safeParse(process.env);
	if (!parsed.success) {
		// Les erreurs sont affichées CHAMP PAR CHAMP : « configuration invalide »
		// sans le détail fait perdre une demi-heure à chaque déploiement.
		for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
			console.error(`  ${key}: ${messages?.join(", ")}`);
		}
		throw new Error("Configuration invalide.");
	}
	return parsed.data;
}
```

**`import "server-only"`** en première ligne de tout module qui touche des secrets ou la base :

```ts
// shared/lib/prisma.ts
import "server-only"; // ⚠️ PREMIÈRE LIGNE — échoue au BUILD si un composant client l'importe

import { PrismaClient } from "@/app/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && process.env.NODE_ENV !== "test") {
	throw new Error("DATABASE_URL n'est pas défini");
}

// Singleton : en développement, le rechargement à chaud recrée le module à chaque
// édition. Sans le cache global, on épuise le pool de connexions en quelques minutes.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

> **`server-only` est le seul vérificateur de frontière serveur/client qui échoue au build**, et
> c'est ce qui le rend supérieur à n'importe quelle règle de lint : il suit la chaîne d'imports
> transitive, y compris à travers un `index.ts` ou un helper intermédiaire que personne n'a
> soupçonné. Le prix à payer est le mock en test (§ 2.2) — trois lignes, une fois.

---

## 6. Frontières d'import

Qui peut importer qui — c'est la contrainte qui garde l'architecture vivante à 18 mois :

```
app/  ────────────►  modules/  ────────────►  shared/
  │                     │                        │
  └─────────────────────┴───────────────────────►┘

modules/a  ─X─►  modules/b        (interdit par défaut)
shared/    ─X─►  modules/         (JAMAIS — inversion de dépendance)
app/       ─X─►  app/ (autre _components/)
```

- **`shared/` n'importe jamais `modules/`.** C'est la règle la plus importante de la liste : dès
  qu'elle tombe, `shared/` devient un module de plus et le graphe se referme en cycles.
- **Un module n'importe pas un autre module**, par défaut. Les exceptions réelles existent
  (un module « paiement » lit le panier) : elles doivent être **rares, unidirectionnelles et
  conscientes**. Si deux modules s'importent mutuellement, c'est un seul module.
- **Un domaine partagé par 3+ modules remonte dans `shared/`** ou devient son propre module
  « socle » que les autres consomment.

### 6.1 La matrice complète, layer par layer

Lignes = qui importe, colonnes = qui est importé. **✓** autorisé · **✗** interdit · **!** autorisé
sous condition écrite au call site.

|                     | `data/` | `actions/` | `services/` | `schemas/` | `constants/` | `types/` | `utils/` | `lib/` | `components/` | `hooks/` |
| ------------------- | :-----: | :--------: | :---------: | :--------: | :----------: | :------: | :------: | :----: | :-----------: | :------: |
| `app/**`            |    ✓    |     ✓      |      !      |     !      |      ✓       |    ✓     |    ✓     |   !    |       ✓       |    ✓     |
| `data/`             |    !    |     ✗      |      ✓      |     ✓      |      ✓       |    ✓     |    ✓     |   ✓    |       ✗       |    ✗     |
| `actions/`          |    !    |     ✗      |      ✓      |     ✓      |      ✓       |    ✓     |    ✓     |   ✓    |       ✗       |    ✗     |
| `services/`         |    ✗    |     ✗      |      ✓      |     ✓      |      ✓       |    ✓     |    ✓     |   ✗    |       ✗       |    ✗     |
| `components/`       |    !    |     ✓      |      ✓      |     ✓      |      ✓       |    ✓     |    ✓     |   ✗    |       ✓       |    ✓     |
| `hooks/`            |    ✗    |     ✓      |      ✓      |     ✓      |      ✓       |    ✓     |    ✓     |   ✗    |       ✗       |    ✓     |
| `utils/` `schemas/` |    ✗    |     ✗      |      ✗      |     ✓      |      ✓       |    ✓     |    ✓     |   ✗    |       ✗       |    ✗     |

Les cases qui comptent, avec leur raison :

- **`services/` → `data/` : ✗.** C'est ce qui garde le layer pur. Un service qui a besoin de
  données les reçoit **en argument** ; c'est l'appelant (`data/` ou `actions/`) qui va les
  chercher. Cette seule case fait la différence entre un `services/` testable sans mock et un
  `services/` qu'on finit par ne plus tester.
- **`data/` ou `actions/` → `components/` : ✗.** Une couche serveur qui importe du JSX entraîne le
  composant, ses styles et ses dépendances client dans le graphe du serveur.
- **`hooks/` → `data/` : ✗.** Un hook s'exécute côté client ; une fonction cachée s'exécute côté
  serveur. Les données descendent en **props** depuis un Server Component, ou remontent par une
  action.
- **`app/` → `services/` : conditionnel.** Une page a le droit de formater pour l'affichage
  (`formatPriceRange`), pas de reconstruire une règle métier. Si la page appelle plus de deux
  services, la composition manquait : elle appartenait à un composant du module.
- **`components/` → `data/` : conditionnel.** Un Server Component peut lire directement ; un
  composant client ne le peut pas. Comme rien dans le nom du fichier ne dit lequel c'est, la
  convention est de faire lire la **page** et de descendre en props.

### 6.2 La frontière serveur / client

C'est la seconde frontière, orthogonale à la première, et la plus coûteuse quand elle casse.

| Marqueur               | Effet                                                                     |
| ---------------------- | ------------------------------------------------------------------------- |
| _(aucun)_              | Server Component par défaut — le cas normal                               |
| `"use client"`         | Ce fichier **et tout son graphe d'imports** partent dans le bundle client |
| `"use server"`         | Chaque export devient un **endpoint RPC public**                          |
| `import "server-only"` | Échoue au build si le fichier atteint le graphe client                    |

**Trois règles :**

1. **`"use client"` va sur la FEUILLE**, jamais sur un conteneur. Une page marquée cliente
   entraîne toute sa descendance ; une carte dont seul le bouton est interactif garde le
   composant serveur et ne marque que le bouton.
2. **Un composant client doit être PUR au rendu** — pas de `new Date()`, `Date.now()` ni de
   valeur aléatoire pendant le rendu : le serveur et l'hydratation ne retomberaient pas sur la
   même valeur. Le calcul remonte côté serveur et descend en prop.
3. **Toute descente dans le graphe client se vérifie** : si un helper serveur devient importable
   par un composant client, `server-only` le fait échouer **au build**, pas en production.

### 6.3 Vérifier ces frontières

Aucune de ces règles n'est tenue par un outil du commerce. Trois filets, du plus fort au plus
faible :

| Filet                                | Couvre                                        | Coût                 |
| ------------------------------------ | --------------------------------------------- | -------------------- |
| `import "server-only"`               | Frontière serveur/client, transitivement      | 1 ligne / module     |
| Commandes d'audit (§ 11)             | Toutes les cases de la matrice                | 0 (grep)             |
| Règle ESLint `no-restricted-imports` | `shared/` → `modules/`, `services/` → `data/` | ~20 lignes de config |

La règle ESLint, si tu veux la version bloquante — c'est de la configuration, pas un plugin :

```js
// eslint.config.mjs
{
	files: ["shared/**/*.{ts,tsx}"],
	rules: {
		"no-restricted-imports": ["error", {
			patterns: [{
				group: ["@/modules/*"],
				message: "shared/ ne doit JAMAIS importer modules/ — inversion de dépendance (§ 6).",
			}],
		}],
	},
},
{
	files: ["modules/*/services/**/*.ts"],
	rules: {
		"no-restricted-imports": ["error", {
			patterns: [
				{ group: ["**/data/*", "@/shared/lib/prisma"], message: "services/ est PUR : les données arrivent en argument (§ 6.1)." },
			],
		}],
	},
},
```

---

## 7. Le contrat de cache

Le cache traverse `app/`, `modules/` et `shared/` : il ne pouvait pas vivre dans une seule des
sections précédentes. C'est aussi la zone où les erreurs sont **silencieuses** — rien ne casse, les
données sont juste périmées, parfois pendant des jours.

### 7.1 Les quatre règles

**1. La clé d'une entrée cachée, ce sont les ARGUMENTS.** Elle se compose de l'identifiant de
build, du hash de la fonction et des arguments sérialisés. Un tag n'est **pas** une clé : c'est une
étiquette qui sert à invalider, jamais à distinguer deux entrées. Deux appels avec les mêmes
arguments partagent l'entrée, quels que soient leurs tags.

**2. Donc : normaliser AVANT d'entrer dans le scope caché** (cf. le gabarit `data/` en § 4.4).
Valider à l'intérieur crée une entrée par variante d'entrée sale.

**3. Un scope caché ne peut pas lire la requête.** Ni cookies, ni en-têtes, ni session — ce serait
mettre une donnée par-utilisateur dans une entrée partagée. La visibilité entre donc par un
**paramètre explicite** (`isAdmin`, `includeDraft`), fourni par l'appelant qui, lui, a le droit de
lire les cookies.

**4. Un tag n'existe que s'il a un LECTEUR et un MUTATEUR.** Un tag posé mais jamais invalidé est
un cache qui ne se rafraîchit pas ; un tag invalidé mais jamais posé est un appel mort. Les deux
sont invisibles à l'exécution. C'est pourquoi poseur et invalidateur vivent dans le **même
fichier** (§ 4.4, `utils/cache.utils.ts`).

### 7.2 Les profils de durée de vie

Quatre profils nommés, déclarés une fois dans la config, jamais de durées en dur au call site :

```ts
// next.config.ts
cacheLife: {
	checkout:  { stale: 60,     revalidate: 30,    expire: 300 },      // volatil : stock, panier
	user:      { stale: 120,    revalidate: 60,    expire: 600 },      // agrégats admin
	catalog:   { stale: 900,    revalidate: 300,   expire: 21600 },    // contenu éditorial
	reference: { stale: 604800, revalidate: 86400, expire: 2592000 },  // quasi immuable
}
```

Nommer les profils par **usage métier** (`checkout`, `catalog`) et non par durée (`short`,
`long`) : le jour où la durée change, l'appelant n'a pas à être relu. Une règle ESLint locale
impose qu'un scope caché déclare toujours son profil — sans elle, l'oubli retombe sur une valeur
par défaut que personne n'a choisie.

### 7.3 L'invalidation dépend du CONTEXTE D'EXÉCUTION, pas du module

C'est le piège le plus coûteux de toute cette section.

| Contexte d'exécution           | API                                 | Helper SSOT                        |
| ------------------------------ | ----------------------------------- | ---------------------------------- |
| Server Action (`"use server"`) | `updateTag(tag)`                    | `updateTagsAfterMutation(tags)`    |
| Route handler, webhook, cron   | `revalidateTag(tag, { expire: 0 })` | `revalidateTagsInBackground(tags)` |

⚠️ **`updateTag` throw hors Server Action.** Et le test porte sur **la route en cours
d'exécution**, pas sur le module où l'appel est écrit : déléguer à un `services/` ne protège de
rien. Un service invoqué depuis un webhook verra le contexte du webhook.

> **Ce que ça a coûté ici** : une migration `revalidateTag` → `updateTag` a emporté 14 fichiers non
> `"use server"`. Conséquence — **plus aucune invalidation ne s'exécutait** après un paiement ni
> dans les tâches planifiées. Et c'était **invisible en test** : les fichiers de test qui mockent le
> module de cache remplacent `updateTag` par une fonction vide qui ne throw jamais. D'où les trois
> filets ci-dessous, dont un qui exerce l'implémentation **réelle**.

Trois filets, à reproduire tels quels :

1. **Règle ESLint locale** — interdit d'importer `updateTag` dans un fichier sans `"use server"`
   (code complet en § 10.2) ;
2. **Test de convention** — scanne le dépôt pour la même règle, y compris les formes que le lint
   rate ;
3. **Test de contrat** — appelle la **vraie** implémentation depuis les deux contextes et vérifie
   que l'un throw et l'autre non. C'est le seul des trois qui aurait attrapé le bug d'origine.

### 7.4 Où vit quoi

| Artefact                               | Emplacement                        | Pourquoi                                     |
| -------------------------------------- | ---------------------------------- | -------------------------------------------- |
| Profils de durée de vie                | `next.config.ts`                   | Config du framework                          |
| Noms de tags (constantes et fabriques) | `modules/<d>/constants/cache.ts`   | SSOT — jamais un littéral au call site       |
| Poseurs (`cacheX()`) et invalidateurs  | `modules/<d>/utils/cache.utils.ts` | **Ensemble** : l'asymétrie doit se voir      |
| Choix de l'API d'invalidation          | `shared/lib/cache.ts`              | Un seul endroit connaît la règle de contexte |
| Tags transverses                       | `shared/constants/cache-tags.ts`   | Consommés par ≥ 2 modules                    |

---

## 8. Tests — trois emplacements, trois raisons

### 8.1 Colocalisé : `__tests__/` à côté du code

Le cas par défaut. `modules/products/services/__tests__/product-pricing.service.test.ts` teste
`../product-pricing.service.ts`. Avantage réel : supprimer une feature supprime ses tests dans le
même `rm -rf`, et un test orphelin est visible à l'œil.

Trois suffixes, trois contrats :

| Suffixe                 | Contrat                                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| `*.test.ts(x)`          | Test normal — se modifie librement                                         |
| `*.regression.test.ts`  | Verrouille une décision. Le modifier **exige une revue explicite**         |
| `*.integration.test.ts` | Requiert une vraie DB. Runner séparé, **jamais** le client Prisma de l'app |

Le test de régression porte un tag JSDoc (`@regression <slug>`) et — c'est le point — **le
_pourquoi_ de la règle vit dans le test, pas dans un commentaire du code**. Le code dit ce qu'il
fait ; le test de régression dit pourquoi il ne peut pas faire autrement, avec le contre-exemple.

Gabarit d'un test de régression — l'en-tête vaut autant que les assertions :

```ts
/**
 * @regression no-manual-memoization-2026-05-28
 *
 * Aucun composant ou hook applicatif n'utilise `useMemo`, `useCallback` ni `memo()` :
 * le compilateur React les produit lui-même, et un wrapper manuel ajoute une closure
 * et des dépendances à maintenir à la main.
 *
 * La SECONDE suite verrouille la contrepartie — le compilateur est bien activé dans
 * `next.config.ts`. Interdire la mémoïsation manuelle SANS garantir que le compilateur
 * tourne laisserait l'application sans aucune optimisation, la suite restant verte.
 */
const SCAN_ROOTS = ["shared", "modules", "app"].map((d) => join(process.cwd(), d));

describe("pas de mémoïsation manuelle", () => {
	it("aucun fichier applicatif n'utilise useMemo / useCallback / memo", () => {
		const offenders = walkFiles(SCAN_ROOTS)
			.filter((f) => !f.includes("__tests__"))
			.filter((f) =>
				/\b(useMemo|useCallback|React\.memo|\bmemo)\s*\(/.test(readFileSync(f, "utf8")),
			)
			.map((f) => relative(process.cwd(), f));

		// Le message d'échec contient la LISTE : un test qui dit juste « attendu 0,
		// reçu 3 » oblige à refaire le grep à la main.
		expect(offenders, `Mémoïsation manuelle détectée :\n${offenders.join("\n")}`).toEqual([]);
	});

	it("le compilateur React est activé", () => {
		expect(readFileSync("next.config.ts", "utf8")).toMatch(/reactCompiler:\s*true/);
	});
});
```

**Les quatre propriétés d'un bon test de structure**, applicables aux régressions comme aux
contrats :

1. **L'en-tête raconte l'incident** — quel bug, quand, pourquoi la règle. Sans ça, le test se fait
   supprimer par le premier qui le croit obsolète.
2. **Le message d'échec liste les coupables**, pas un compte.
3. **Les exemptions sont une constante nommée, chacune avec sa raison.** Une exemption non motivée
   est un oubli déguisé.
4. **La contrepartie est testée aussi** — interdire A sans vérifier que B (ce qui rend A inutile)
   est bien en place laisse la suite verte sur une application cassée.

### 8.2 `test/` — ce qui n'appartient à aucun fichier

```
test/
├── contract/            # Tests de CONTRAT : parité entre deux sources de vérité
│   ├── admin-actions-require-admin.contract.test.ts     # toute action admin a sa garde
│   ├── server-action-input-validation.contract.test.ts  # toute action parse son entrée
│   ├── cache-invalidation-context.contract.test.ts      # bonne API selon le contexte
│   ├── stripe-events.contract.test.ts                   # fixtures ↔ cases de la route
│   ├── react-compiler-lint-rules.contract.test.ts       # les règles ESLint sont bien là
│   └── __snapshots__/
├── conventions/         # Conventions de code à l'échelle du dépôt
├── fixtures/            # Payloads externes figés (webhooks…)
├── mocks/               # Mocks partagés
├── utils/               # Helpers de test
├── integration/         # setup + client Prisma + factories du runner d'intégration
├── factories.ts         # Builders d'objets de test
└── setup.ts             # Setup Vitest global
```

Le layer `contract/` est ce qui rend la structure **auto-défendue** : il scanne le dépôt et
échoue quand une convention est violée quelque part. C'est ce qui remplace la revue humaine sur
les règles mécanisables (« toute action admin a une garde », « aucun `updateTag` hors Server
Action »). À reprendre en priorité dans un nouveau projet — ces tests coûtent une heure et tiennent
des années.

**Le gabarit complet d'un test de contrat**, à copier pour en écrire d'autres. Celui-ci vérifie que
toute Server Action valide son entrée :

```ts
/**
 * @regression server-action-input-validation
 *
 * Toute Server Action qui reçoit un argument doit le VALIDER, pas se contenter de
 * l'annoter. Un fichier `"use server"` transforme CHACUN de ses exports en endpoint
 * RPC appelable directement, avec des arguments arbitraires : le type TypeScript du
 * paramètre est effacé à l'exécution.
 *
 * L'audit d'origine a trouvé quatre occurrences, dont une sans aucune garde — le nom
 * du cookie écrit dérivait d'un argument non validé. Le piège récurrent : un wrapper
 * valide correctement puis délègue à un helper EXPORTÉ DEPUIS UN AUTRE fichier
 * `"use server"`, qui reste donc exposé séparément. Valider dans le wrapper ne protège
 * pas le wrappé.
 *
 * ── Règle ──────────────────────────────────────────────────────────────────────
 * Un fichier `"use server"` dont un export déclare au moins un paramètre CONSOMMÉ
 * (nom sans préfixe `_`) doit contenir `validateInput`, `.safeParse(` ou `.parse(`.
 */

const VALIDATION_MARKERS = [/\bvalidateInput\s*\(/, /\.safeParse\s*\(/, /\.parse\s*\(/];

/** Exemptions — chacune porte SA RAISON. Une exemption muette est un oubli déguisé. */
const EXEMPTIONS: Record<string, string> = {
	// "modules/x/actions/y.ts": "Délègue le code brut à validateZ, qui fait le safeParse.",
};

/** Retire commentaires et chaînes : un marqueur CITÉ en prose ne compte pas. */
function stripCommentsAndStrings(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
		.replace(/`(?:\\.|[^`\\])*`/g, "``")
		.replace(/"(?:\\.|[^"\\])*"/g, '""');
}

/**
 * ⚠️ DEUX formes d'export, pas une. La version d'origine ne matchait que
 * `export async function` — les actions écrites `export const x = async (…) =>`
 * sortaient ENTIÈREMENT du contrat. Toutes validaient, mais rien ne l'imposait :
 * c'est précisément la garantie qu'on croit avoir qui est dangereuse.
 */
const EXPORT_SIGNATURES = [
	/export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)/g,
	/export\s+const\s+(\w+)\s*(?::[^=]+?)?=\s*async\s*\(([^)]*)\)/g,
];

/** Convention : un paramètre présent pour la signature mais jamais lu est préfixé `_`. */
function consumedParamsOf(rawParams: string): string[] {
	return rawParams
		.split(",")
		.map((p) => p.trim().split(/[:=]/)[0]?.trim())
		.filter((name): name is string => !!name && !name.startsWith("_") && !name.startsWith("{"));
}

describe("contrat : validation d'entrée des Server Actions", () => {
	it("toute action à paramètre consommé contient un point de validation", () => {
		const offenders: string[] = [];

		for (const file of walkFiles(["modules", "app"])) {
			const source = readFileSync(file, "utf8");
			if (!/^\s*["']use server["']/m.test(source)) continue;

			const rel = relative(process.cwd(), file);
			if (rel in EXEMPTIONS) continue;

			const code = stripCommentsAndStrings(source);
			const hasValidation = VALIDATION_MARKERS.some((re) => re.test(code));

			for (const pattern of EXPORT_SIGNATURES) {
				for (const [, name, params] of code.matchAll(pattern)) {
					if (consumedParamsOf(params ?? "").length > 0 && !hasValidation) {
						offenders.push(`${rel} → ${name}()`);
					}
				}
			}
		}

		expect(offenders, `Actions sans validation :\n${offenders.join("\n")}`).toEqual([]);
	});
});
```

**Les six tests de contrat à écrire en premier** dans un nouveau projet, par ordre de valeur :

| Contrat                                         | Ce qu'il attrape                                   |
| ----------------------------------------------- | -------------------------------------------------- |
| Toute action mutante a sa garde d'autorisation  | L'endpoint public oublié — la faille la plus grave |
| Toute action valide son entrée                  | L'argument arbitraire (code ci-dessus)             |
| La bonne API d'invalidation selon le contexte   | L'invalidation silencieusement morte (§ 7.3)       |
| Les fixtures tierces ↔ les `case` du handler    | L'event qui cesse d'être traité après un renommage |
| Les règles de lint critiques sont bien chargées | La règle qui disparaît par un bump de dépendance   |
| Chaque page protégée porte sa propre garde      | La « promesse de layout » (§ 3.3)                  |

> **Le point commun des six** : ils vérifient une propriété **que le typage ne peut pas exprimer**
> et **que la revue humaine rate systématiquement** parce qu'elle porte sur l'absence de quelque
> chose. Un test de contrat n'est jamais un test de comportement — c'est une revue de code
> exécutable.

### 8.3 `e2e/` — Playwright

```
e2e/
├── *.spec.ts              # Specs publiques
├── authenticated/         # Specs derrière une session (état d'auth réutilisé)
├── a11y/                  # Accessibilité (axe, clavier, zoom, live regions)
├── pages/                 # Page Objects — 1 classe par écran
│   └── __tests__/         # Tests unitaires SUR les page objects (locators stables)
├── helpers/               # db, network, assertions, signature de webhook, hydratation
├── fixtures.ts            # Fixtures Playwright étendues
├── auth.setup.ts          # Projet de setup : produit l'état d'auth
├── global-setup.ts / global-teardown.ts
└── constants.ts
```

Deux détails qui font gagner des jours : la suite tourne contre un **build de production** (un
serveur de dev sature sous les workers), et les webhooks tiers sont rejoués par **POST signé
localement** plutôt qu'en pilotant la page de l'hébergeur.

**Le page object est la seule couche autorisée à connaître un sélecteur.** Une spec qui écrit
`page.locator(".btn-primary")` casse au premier renommage de classe ; la même spec écrite
`await cart.addFirstProduct()` survit à une refonte visuelle entière.

```ts
// e2e/pages/cart.page.ts
export class CartPage {
	constructor(private readonly page: Page) {}

	// Les sélecteurs sont des CHAMPS PRIVÉS : une spec ne peut pas les contourner.
	private readonly openButton = () => this.page.getByRole("button", { name: /panier/i });
	private readonly lineItems = () => this.page.getByRole("listitem");

	async open() {
		await this.openButton().click();
		await expect(this.lineItems().first()).toBeVisible();
	}

	async lineCount(): Promise<number> {
		return this.lineItems().count();
	}
}
```

**Pourquoi `e2e/pages/__tests__/`** — des tests **unitaires** (rapides, sans navigateur) sur les
page objects, qui vérifient que le sélecteur d'un élément critique correspond toujours à ce que le
composant rend. Ils échouent en 2 secondes au lieu de faire échouer une suite e2e de 10 minutes sur
un timeout dont la cause est illisible.

### 8.4 Intégration : le troisième runner

| Runner              | Environnement | Base de données         | Quand                            |
| ------------------- | ------------- | ----------------------- | -------------------------------- |
| Unitaire (`vitest`) | jsdom         | aucune (tout est mocké) | Par défaut — 95 % des tests      |
| Intégration         | node          | **vraie**, schéma isolé | Transactions, contraintes, index |
| E2E (`playwright`)  | navigateur    | vraie, seedée           | Parcours complet                 |

Deux invariants pour l'intégration :

- **Jamais le client DB de l'application.** Un client dédié (`test/integration/prisma-client.ts`),
  parce que chaque worker doit travailler dans **son propre schéma** — sinon deux tests parallèles
  se suppriment mutuellement leurs lignes.
- **Skip silencieux quand la variable de connexion est absente.** Un développeur sans base locale
  doit pouvoir lancer `pnpm test` sans voir 40 échecs rouges qui ne le concernent pas.

**Que tester où** — la question qui évite d'écrire trois fois le même test :

| Question                                    | Runner                 |
| ------------------------------------------- | ---------------------- |
| Ce calcul est-il correct ?                  | Unitaire (`services/`) |
| Ce composant rend-il le bon texte ?         | Unitaire (jsdom)       |
| Cette règle de structure tient-elle ?       | Contrat / convention   |
| Cette transaction est-elle atomique ?       | Intégration            |
| Cette contrainte d'unicité protège-t-elle ? | Intégration            |
| L'utilisatrice peut-elle acheter ?          | E2E                    |

---

## 9. Conventions de nommage

| Élément               | Convention            | Exemple                            |
| --------------------- | --------------------- | ---------------------------------- |
| Fichiers              | `kebab-case`          | `product-detail-card.tsx`          |
| Composants React      | `PascalCase`          | `ProductDetailCard`                |
| Fonctions             | `camelCase`           | `getProductBySlug`                 |
| Constantes            | `UPPER_SNAKE_CASE`    | `GET_PRODUCTS_SELECT`              |
| Hooks                 | `use-*.ts`            | `use-delete-product.ts`            |
| Services              | `*.service.ts`        | `product-pricing.service.ts`       |
| Schémas Zod           | `*.schemas.ts`        | `product-mutation.schemas.ts`      |
| Types                 | `*.types.ts`          | `product-list.types.ts`            |
| Constantes de domaine | `*.constants.ts`      | `search.constants.ts`              |
| Lecture (data)        | `get-*`, `count-*`    | `get-related-products.ts`          |
| Mutation (action)     | `<verbe>-<entité>.ts` | `toggle-product-status.ts`         |
| Commits               | Conventional Commits  | `feat:` `fix:` `docs:` `refactor:` |
| Indentation           | Tabulations           | —                                  |
| Langue de l'UI        | à fixer, puis testée  | français, tutoiement (ici)         |
| Langue du code        | anglais               | toujours                           |

**Le suffixe est porteur** : `.service.ts`, `.schemas.ts`, `.constants.ts` permettent aux tests de
convention de cibler un layer par glob. Ne les abandonne pas au motif que le dossier le dit déjà —
c'est ce qui rend les règles mécanisables.

### 9.1 Nommer un fichier : la règle en une phrase par layer

| Layer         | Le nom répond à…                    | Gabarit                       | Exemple                        |
| ------------- | ----------------------------------- | ----------------------------- | ------------------------------ |
| `data/`       | « quelle donnée je lis »            | `<verbe>-<entité>[-<qualif>]` | `get-related-products.ts`      |
| `actions/`    | « quel changement je provoque »     | `<verbe>-<entité>`            | `duplicate-product.ts`         |
| `services/`   | « de quoi je parle »                | `<entité>-<sujet>.service.ts` | `product-pricing.service.ts`   |
| `schemas/`    | « quelles entrées je garde »        | `<entité>-<usage>.schemas.ts` | `product-query.schemas.ts`     |
| `constants/`  | « quel sujet je fige »              | `<sujet>.constants.ts`        | `search.constants.ts`          |
| `hooks/`      | « quoi je fais faire au composant » | `use-<verbe>-<entité>.ts`     | `use-toggle-product-status.ts` |
| `utils/`      | « quelle transformation »           | `<verbe>-<objet>.ts`          | `format-price-range.ts`        |
| `types/`      | « quel groupe de types »            | `<sujet>.types.ts`            | `product-list.types.ts`        |
| `components/` | « ce que ça affiche »               | `<entité>-<rôle>.tsx`         | `product-detail-header.tsx`    |

**Trois verbes réservés**, qui ne veulent dire qu'une chose :

- `get-*` → lit **une** entité ou une liste, retourne `null` si absente (jamais de throw) ;
- `count-*` → retourne un nombre ;
- `resolve-*` → transforme un identifiant public (slug, code) en identifiant interne.

### 9.2 Les deux flottements à trancher explicitement

Ce dépôt en porte deux, hérités. Les nommer évite de les reproduire par imitation :

1. **Le suffixe `.constants.ts` n'est pas universel** — `constants/` contient aussi `cache.ts`,
   `search-synonyms.ts`. La règle réelle est : **le suffixe est obligatoire si le nom seul est
   ambigu hors de son dossier** (`search.ts` ne dit rien, `search.constants.ts` si). À l'import,
   c'est le nom du fichier qu'on lit, pas le dossier.
2. **Les tests colocalisés ne sont pas tous dans `__tests__/`** — quelques-uns sont posés à côté
   du fichier (`navbar.tsx` + `navbar.test.tsx`). Choisis **une** des deux formes et tiens-la : la
   forme `__tests__/` a l'avantage de garder les listings de dossier lisibles quand un module
   grossit, et de s'exclure d'un glob en une ligne.

> **Décide ces deux points le premier jour et écris-les.** Ce sont des flottements sans enjeu
> technique, donc personne ne tranche, donc les deux formes coexistent — et c'est exactement ce qui
> rend un kit d'audit par glob (§ 11) impossible à écrire ensuite.

---

## 10. Ce qui empêche la structure de dériver

Une architecture documentée mais non vérifiée retourne au chaos en 6 mois. Quatre filets, du moins
cher au plus cher :

1. **ESLint, `--max-warnings=0`.** Le zéro-warning n'est pas du purisme : sans lui, chaque nouvelle
   règle utile atterrit en `warn` et n'est jamais lue.
2. **Plugin ESLint local** (`eslint-plugin-local/`) — une règle maison coûte ~40 lignes et attrape
   une classe d'erreurs entière. Ici : « pas d'invalidation de cache hors Server Action », « toute
   fonction cachée déclare sa durée de vie ».
3. **Tests de contrat** (§ 8.2) pour ce qu'ESLint ne sait pas voir (parité entre deux fichiers,
   présence d'une garde sur N fichiers, cohérence fixtures ↔ code).
4. **`knip`** pour les exports morts — indispensable dans une structure à douze layers, où un fichier
   orphelin se cache très bien.

### 10.1 Le gate unique

Une seule commande, exigée avant toute PR, et **la même en CI** :

```jsonc
{
	"scripts": {
		// LE gate. Ne jamais avoir deux définitions de « c'est bon » (une locale, une CI).
		"validate": "pnpm lint && pnpm typecheck && pnpm format:check && vitest run",

		"lint": "eslint --max-warnings=0",
		"typecheck": "tsc --noEmit",
		"format:check": "prettier --check .",

		// Chemin CRITIQUE : les modules transactionnels + les contrats. C'est ce que
		// lance le pre-commit — la suite complète le rendrait trop lent, donc contourné.
		"test:critical": "vitest run modules/cart modules/orders modules/payments modules/webhooks test/contract",
		"test:integration": "vitest run -c vitest.integration.config.ts",
		"knip": "knip",
	},
}
```

**Le hook pre-commit ne lance le chemin critique que s'il est touché** :

```sh
# .husky/pre-commit
pnpm lint-staged

# Garder ce glob ALIGNÉ avec `test:critical` dans package.json : c'est une
# duplication assumée (le hook ne sait pas lire un script npm), donc un point de
# dérive connu. Un développeur qui ajoute un module critique doit toucher les deux.
changed=$(git diff --cached --name-only --diff-filter=ACMR \
	| grep -E '^(modules/(cart|orders|payments|webhooks)/|test/contract/)' || true)

if [ -n "$changed" ]; then
	echo "🧪 Module critique modifié — exécution de test:critical"
	pnpm test:critical
fi
```

> **Le zéro-warning n'est pas du purisme.** Sans `--max-warnings=0`, chaque nouvelle règle utile
> atterrit en `warn`, personne ne les lit, et le compteur monte jusqu'à devenir du bruit permanent.
> Une règle est bloquante ou n'existe pas.

### 10.2 Une règle ESLint locale, en entier

C'est le filet le plus rentable du document : ~60 lignes pour une classe d'erreurs entière,
attrapée **à l'écriture** plutôt qu'en revue. Voici la règle « pas d'invalidation de cache hors
Server Action » (§ 7.3), complète et transposable.

```
eslint-plugin-local/
├── index.mjs           # Agrège les règles
└── rules/
    └── no-update-tag-outside-server-action.mjs
```

```js
// eslint-plugin-local/rules/no-update-tag-outside-server-action.mjs
/**
 * `updateTag` ne peut être appelé QUE depuis une Server Action. Partout ailleurs —
 * route handler, tâche planifiée, webhook — le framework THROW.
 *
 * Le test porte sur la ROUTE en cours d'exécution, pas sur le module où l'appel est
 * écrit : déléguer à un `services/` ne protège de rien.
 *
 * La règle approxime « est-ce une Server Action ? » par la présence de la directive
 * `"use server"` en tête de fichier. Un fichier sans elle ne PEUT PAS garantir son
 * contexte d'appel : il doit passer par le helper d'invalidation en arrière-plan.
 *
 * Historique : une migration a emporté 14 fichiers non-`"use server"` ; plus aucune
 * invalidation ne s'exécutait après un paiement. Invisible en test — les fichiers qui
 * mockent le module de cache remplacent `updateTag` par une fonction vide.
 */
const NEXT_CACHE_MODULE = "next/cache";
const FORBIDDEN = "updateTag";

function hasUseServerDirective(program) {
	for (const statement of program.body) {
		if (statement.type !== "ExpressionStatement") break;
		const expr = statement.expression;
		if (expr.type !== "Literal" || typeof expr.value !== "string") break;
		if (expr.value === "use server") return true;
	}
	return false;
}

export default {
	meta: {
		type: "problem",
		docs: { description: "Interdit updateTag hors d'un fichier 'use server'" },
		messages: {
			outside:
				'`updateTag` throw hors Server Action. Ce fichier n\'a pas de directive "use server" : utilise `revalidateTagsInBackground` de `@/shared/lib/cache`.',
		},
		schema: [],
	},
	create(context) {
		let fileIsServerAction = false;
		const report = (node) => {
			if (!fileIsServerAction) context.report({ node, messageId: "outside" });
		};

		return {
			Program(node) {
				fileIsServerAction = hasUseServerDirective(node);
			},

			// Forme 1 : import { updateTag } from "next/cache"
			ImportDeclaration(node) {
				if (node.source.value !== NEXT_CACHE_MODULE) return;
				for (const s of node.specifiers) {
					if (s.type === "ImportSpecifier" && s.imported.name === FORBIDDEN) report(s);
				}
			},

			// Forme 2 : const { updateTag } = await import("next/cache")
			// Utilisée pour casser des cycles — elle échappe à ImportDeclaration.
			ImportExpression(node) {
				if (node.source.value !== NEXT_CACHE_MODULE) return;
				let current = node.parent;
				while (current && current.type !== "VariableDeclarator") current = current.parent;
				if (current?.id?.type !== "ObjectPattern") return;
				for (const p of current.id.properties) {
					if (p.type === "Property" && p.key.name === FORBIDDEN) report(p);
				}
			},

			// Forme 3 (filet) : appel nu, sans import visible (ré-export, global).
			CallExpression(node) {
				if (node.callee.type !== "Identifier" || node.callee.name !== FORBIDDEN) return;
				const scope = context.sourceCode.getScope(node);
				const resolved = scope.references.find((r) => r.identifier === node.callee)?.resolved;
				if (!resolved) report(node); // non lié dans le fichier → suspect
			},
		};
	},
};
```

```js
// eslint-plugin-local/index.mjs
import noUpdateTagOutsideServerAction from "./rules/no-update-tag-outside-server-action.mjs";

export default {
	rules: { "no-update-tag-outside-server-action": noUpdateTagOutsideServerAction },
};
```

```js
// eslint.config.mjs
import localPlugin from "./eslint-plugin-local/index.mjs";

export default [
	{
		ignores: [
			"node_modules/**",
			".next/**",
			"coverage/**",
			"app/generated/**", // code généré
			"scripts/**", // hors programme applicatif
			"eslint-plugin-local/**", // une règle ne se lint pas avec elle-même
			"playwright-report/**",
			"test-results/**",
		],
	},
	...nextConfig,
	{
		files: ["**/*.{ts,tsx}"],
		plugins: { local: localPlugin },
		rules: { "local/no-update-tag-outside-server-action": "error" },
	},
];
```

> **Les trois formes ne sont pas de la sur-ingénierie.** La forme 1 couvre 95 % des cas, la forme 2
> existe parce que l'import dynamique sert à casser des cycles de dépendances, et la forme 3
> attrape les ré-exports. Une règle qui ne couvre que la forme évidente donne la **fausse
> impression** d'être protégé — le pire des deux mondes, parce qu'on cesse alors de regarder.

### 10.3 Les autres filets

| Filet                                 | Attrape                                                | Coût de mise en place |
| ------------------------------------- | ------------------------------------------------------ | --------------------- |
| ESLint `--max-warnings=0`             | Tout le catalogue de règles du framework               | 0                     |
| Règles ESLint locales (§ 10.2)        | Les règles propres au projet, à l'écriture             | ~1 h par règle        |
| Tests de contrat (§ 8.2)              | Ce qu'ESLint ne voit pas : parité, absence, N fichiers | ~1 h par contrat      |
| `knip`                                | Exports morts — vital à douze layers                   | ~30 min               |
| Kit d'audit (§ 11)                    | Frontières, nommage, layers                            | 0 (copier-coller)     |
| CI = `pnpm validate` + suites lourdes | Le contournement local (`--no-verify`)                 | ~1 h                  |

**La CI doit lancer exactement `pnpm validate`**, plus ce qui ne peut pas tourner en local
(intégration avec service de base, e2e sur matrice complète). Deux définitions différentes de
« c'est bon » — l'une locale, l'autre en CI — et les développeurs cessent de faire confiance à la
première.

---

## 11. Kit d'audit : vérifier qu'un dépôt respecte cette structure

Toutes les commandes sont **sans effet de bord** et se lancent depuis la racine. Une sortie vide =
conforme. À passer avant chaque revue d'architecture, et en entier lors de la reprise d'un projet
existant.

### 11.1 Frontières d'import

⚠️ **Les motifs de `--include` sont entre guillemets** : sans eux, zsh essaie de les développer et
la commande échoue avec `no matches found`. Ce n'est pas cosmétique — c'est la première chose qui
casse quand on copie ces lignes.

```bash
# 1. shared/ importe modules/ — la violation la plus grave (§ 6).
#    Compter d'abord, lire ensuite : `| wc -l` donne l'ampleur, la liste donne le motif.
grep -rn 'from "@/modules/' shared/ --include="*.ts" --include="*.tsx"

# 2. services/ importe le client DB — le layer pur ne l'est plus (§ 6.1).
#    Sortie à LIRE : les services transactionnels sont l'exception documentée.
grep -rln 'from "@/shared/lib/prisma"' modules/*/services/*.ts

# 3. Une page ou un composant importe le client DB directement (§ 1.1)
grep -rln '@/shared/lib/prisma' app/ modules/*/components/ --include="*.ts" --include="*.tsx"

# 4. Import croisé entre modules — sortie à LIRE : les exceptions légitimes
#    existent, elles doivent juste être commentées au point d'import (§ 4.7)
grep -rn 'from "@/modules/' modules/ --include="*.ts" --include="*.tsx" \
  | grep -vE "modules/([a-z-]+)/.*@/modules/\1/"

# 5. Un _components/ de route importé depuis une AUTRE route (§ 3.2)
grep -rn 'from ".*_components/' app/ --include="*.tsx" \
  | grep -vE "^app/([^:]+)/[^:]*:.*\1"
```

### 11.2 Layers et responsabilités

```bash
# 6. Un select DB écrit en dur dans data/ au lieu de constants/ (§ 4.3).
#    ⚠️ Les selects IMBRIQUÉS (relations) sont des faux positifs : seul le select
#    de premier niveau doit venir d'une constante. Sortie à lire.
grep -rn "^\t\t*select: {" modules/*/data/*.ts

# 7. Une action sans garde d'autorisation — à croiser avec la liste des actions
#    délibérément publiques (chacune doit porter sa garde propre en commentaire)
for f in modules/*/actions/*.ts; do
  grep -q "requireAdmin\|requireAuth" "$f" || echo "SANS GARDE: $f"
done

# 8. Une action qui ne valide pas son entrée (§ 4.3).
#    Faux positifs attendus : les actions sans paramètre consommé (rafraîchissement).
grep -rL "validateInput\|safeParse\|\.parse(" modules/*/actions/*.ts

# 9. Un tag de cache écrit en littéral au lieu de la SSOT (§ 7.1)
grep -rn 'cacheTag("\|updateTag("\|revalidateTag("' modules/ app/ shared/ --include="*.ts"

# 10. updateTag hors "use server" — doublon de la règle ESLint, utile en reprise (§ 7.3)
grep -rl "updateTag" modules/ app/ shared/ --include="*.ts" | xargs grep -L '"use server"'
```

### 11.3 Frontière serveur / client

```bash
# 11. Un composant client qui rend une valeur non déterministe (§ 6.2)
grep -rn "new Date()\|Date.now()\|Math.random()" $(grep -rl '"use client"' modules/ app/ shared/)

# 12. Un module à secrets sans la garde d'import (§ 5.6)
for f in shared/lib/{prisma,stripe,env}.ts; do
  head -1 "$f" 2>/dev/null | grep -q 'server-only' || echo "SANS server-only: $f"
done

# 13. Un "use client" sur un fichier page/layout — entraîne toute la descendance
grep -rl '"use client"' app/ --include="page.tsx" --include="layout.tsx"
```

### 11.4 Fichiers spéciaux et conventions

```bash
# 14. Une page sans loading.tsx frère — échec de prérendu en puissance (§ 3.3)
find app -name page.tsx | while read -r p; do
  [ -f "$(dirname "$p")/loading.tsx" ] || echo "SANS loading: $p"
done

# 15. Un fichier hors kebab-case (§ 9) — noter les parenthèses, sans elles le
#     `-o` ne s'applique qu'au dernier chemin
find app modules shared \( -name "*.ts" -o -name "*.tsx" \) \
  | grep -E "/[^/]*[A-Z_][^/]*\.(ts|tsx)$" | grep -v generated

# 16. Un barrel de layer — interdit (§ 4.5)
find modules -maxdepth 2 -name index.ts

# 17. Mémoïsation manuelle sous compilateur React
grep -rn "useMemo(\|useCallback(\|React.memo(" modules/ shared/ app/ \
  --include="*.ts" --include="*.tsx" | grep -v __tests__
```

### 11.5 Métriques de santé

```bash
# Répartition par layer, en % — c'est la commande qui produit le tableau du § 4.8.
# Le rapport services/ ÷ utils/ est le signal le plus utile : sous 1, du métier
# est rangé en helpers.
total=$(find modules -type f -not -path "*__tests__*" | wc -l)
for l in components actions hooks services constants data utils types schemas lib contexts config; do
  n=$(find modules -type d -name "$l" -exec find {} -type f -not -path "*__tests__*" \; 2>/dev/null | wc -l)
  printf "%-12s %4d  %4.1f%%\n" "$l" "$n" "$(echo "scale=3; 100*$n/$total" | bc)"
done

# Taille des modules, décroissante — repérer celui qui devrait se scinder (§ 4.7)
for m in modules/*/; do
  printf "%4s fichiers  %4s tests  %s\n" \
    "$(find "$m" -type f -not -path '*__tests__*' | wc -l)" \
    "$(find "$m" -path '*__tests__*' -type f | wc -l)" "$m"
done | sort -rn

# Layers présents par module — reproduit la matrice du § 4.8
for m in modules/*/; do
  printf "%-16s" "$(basename "$m")"
  ls -d "$m"{actions,data,services,schemas,constants,components,hooks,utils,types,lib,contexts,config} \
    2>/dev/null | xargs -n1 basename | tr '\n' ' '
  echo
done

# Ratio de tests — sous 30 %, les tests de contrat ne suffisent plus à tenir la structure
echo "tests: $(find modules shared -name '*.test.ts*' | wc -l) / code: $(find modules shared -name '*.ts*' -not -name '*.test.*' | wc -l)"

# Poids de app/ : au-dessus de ~15 % du code applicatif, du métier a fui dans le routage
echo "app: $(find app -name '*.ts*' -not -path '*generated*' | wc -l) fichiers"
```

> **Fais-en un script.** `scripts/audit-architecture.sh`, lancé à la main avant une revue
> d'architecture — pas en CI : plusieurs de ces commandes demandent une **lecture** (les exceptions
> légitimes existent), et une commande qui exige un jugement ne peut pas bloquer un merge.

### 11.6 Le kit appliqué au dépôt de référence — lire une sortie

Les commandes ci-dessus, lancées sur le dépôt qui a servi à écrire ce document. **Il n'est pas à
100 %**, et c'est précisément ce qui rend l'exercice utile : voici comment on trie.

| #   | Contrôle                       | Résultat | Verdict                                                      |
| --- | ------------------------------ | -------: | ------------------------------------------------------------ |
| 1   | `shared/` → `modules/`         |       27 | ❌ **Vraie dérive** — diagnostic ci-dessous                  |
| 2   | `services/` → client DB        |        5 | ⚠️ Exception documentée (services transactionnels)           |
| 3   | `app/` → client DB             |        7 | ⚠️ À lire — routes d'API et pages admin, à faire redescendre |
| 6   | `select` inline dans `data/`   |    ~qqs. | ⚠️ Majorité de selects imbriqués (faux positifs)             |
| 9   | Tag de cache en littéral       |        0 | ✅                                                           |
| 12  | Modules à secrets sans garde   |        1 | ⚠️ `env.ts` — n'expose pas de secret, garde souhaitable      |
| 13  | `"use client"` sur page/layout |        0 | ✅                                                           |
| 14  | Pages sans `loading.tsx`       |     7/54 | ⚠️ À vérifier une par une : légitime si la page est statique |
| 15  | Fichiers hors kebab-case       |        0 | ✅                                                           |
| 16  | Barrels de layer               |        0 | ✅                                                           |
| 17  | Mémoïsation manuelle           |        0 | ✅                                                           |

**Le diagnostic du contrôle 1 — un cas d'école.** Le regroupement par dossier donne :

```
13  shared/components/media-upload
 4  shared/components/media-upload/__tests__
 4  shared/components
 1  shared/lib/actions · shared/lib · shared/constants · hand-drawn · autocomplete · __tests__
```

**17 des 27 viennent du seul dossier `shared/components/media-upload/`**, qui importe des
constantes, des types, des utils **et deux composants** de `modules/media`. Verdict : ce dossier
**n'est pas transverse**. C'est un composant du domaine média, posé dans `shared/` parce qu'il sert
à plusieurs formulaires d'administration — exactement l'erreur que le § 5.0.2 décrit (« qui
l'utilise » confondu avec « de quoi il parle »). Le correctif tient en un `git mv` vers
`modules/media/components/upload/`, et les 27 violations tombent à 10.

Les dix restantes sont de quatre natures : un composant de rendu de données structurées qui appelle
un service produit (à faire descendre dans le module), une constante de configuration qui lit un
tarif d'expédition (l'inverse — le tarif devrait remonter dans `shared/constants/`), un helper
d'actions qui importe la garde d'authentification (frontière discutable, à documenter), et deux
imports en test (tolérables : un test n'est pas dans le graphe de production).

> **La leçon à retenir pour un refactor** : un compte brut ne dit rien. Ce sont les **regroupements**
> qui parlent — 14 hits dans un seul dossier ne sont pas 14 problèmes, c'est **un** fichier mal
> rangé. Trie toujours la sortie par dossier avant de décider quoi que ce soit :
>
> ```bash
> grep -rn 'from "@/modules/' shared/ --include="*.ts" --include="*.tsx" \
>   | cut -d: -f1 | xargs -n1 dirname | sort | uniq -c | sort -rn
> ```

---

## 12. Mise en place dans un nouveau projet

Huit étapes, dans cet ordre. Les étapes 1 à 4 sont mécaniques (~1 h) ; l'étape 5 est celle qui
décide si l'architecture tiendra.

### Étape 1 — Squelette et alias (~10 min)

```bash
pnpm create next-app@latest mon-projet --typescript --tailwind --app --no-src-dir
cd mon-projet

# Les dossiers AVANT le premier fichier : créer le rangement force à ranger.
mkdir -p modules shared/{components/ui,lib/actions,constants,hooks,schemas,stores,providers,types,utils,styles}
mkdir -p test/{contract,conventions,fixtures,mocks,utils,integration}
mkdir -p e2e/{authenticated,a11y,pages,helpers}
mkdir -p eslint-plugin-local/rules docs scripts
find modules shared test e2e -type d -empty -exec touch {}/.gitkeep \;
```

Puis `tsconfig.json` : `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, alias
`"@/*": ["./*"]` **et rien d'autre**, `"exclude": ["node_modules", "scripts"]` (§ 2.2).

### Étape 2 — Le socle `shared/lib/` (~30 min)

Dans cet ordre, chacun dépendant du précédent :

1. `shared/schemas/env.schema.ts` + `shared/lib/env.ts` — la validation d'environnement (§ 5.6) ;
2. `shared/lib/logger.ts` — avant le premier `try/catch`, sinon `console.log` s'installe ;
3. `shared/lib/prisma.ts` (ou ton client) — avec `import "server-only"` en première ligne ;
4. `shared/types/server-action.ts` — le type `ActionState` (§ 5.4) ;
5. `shared/lib/actions/{responses,validation,errors}.ts` + `index.ts` (§ 5.4) ;
6. `shared/lib/cache.ts` — les deux helpers d'invalidation par contexte (§ 7.3) ;
7. `shared/utils/cn.ts`.

### Étape 3 — Outillage (~30 min)

```bash
pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom
pnpm add -D @playwright/test knip husky lint-staged prettier
pnpm add server-only
pnpm exec husky init
```

Écrire `vitest.config.ts` (avec le mock `server-only` — § 2.2), `test/setup.ts`, `knip.config.ts`,
`components.json` (aliases vers `shared/` — § 2.2), le script `validate` (§ 10.1) et le hook
pre-commit.

### Étape 4 — Primitives d'UI (~15 min)

```bash
pnpm dlx shadcn@latest init   # lit components.json → génère dans shared/components/ui/
pnpm dlx shadcn@latest add button input dialog
```

Puis on n'y touche plus (§ 5.3).

### Étape 5 — Le premier module, en entier (la seule étape qui compte)

Choisis le domaine **le plus riche** du projet et applique les douze layers, **même quand ça paraît
surdimensionné pour trois écrans**. Ce module devient le gabarit : les modules 2 à N se copient
dessus, y compris leurs erreurs. C'est le seul moment où l'investissement structurel est indolore —
après, c'est un refactor.

```bash
D=produits   # le domaine
mkdir -p modules/$D/{actions,data,services,schemas,constants,components/admin,hooks,utils,types}
mkdir -p modules/$D/{services,data,utils,components,hooks}/__tests__
```

Ordre d'écriture à l'intérieur, qui suit la chaîne de dépendances du § 4.4 :
`types/` → `schemas/` → `constants/` → `services/` (+ tests) → `data/` → `actions/` → `utils/` →
`hooks/` → `components/` → la page.

### Étape 6 — Les filets, avant la 3ᵉ feature

Les deux tests de contrat « toute action mutante a sa garde » et « toute action parse son entrée »
(§ 8.2) — **avant d'avoir 40 actions, pas après**. Écrits à 3 actions, ils passent du premier coup
et ne bougent plus ; écrits à 40, ils démarrent sur 15 échecs et finissent en liste d'exemptions.

### Étape 7 — CI

Un job = `pnpm validate`. Un second = les suites lourdes (intégration avec service de base, e2e).
Exactement la même commande qu'en local (§ 10.3).

### Étape 8 — Le document d'architecture du projet

Un `CLAUDE.md` ou `README-ARCHITECTURE.md` court qui **pointe vers ce document** et ne contient que
les décisions **propres au projet** : les domaines et leur périmètre, les exceptions d'import
assumées, les profils de cache et leur justification métier, les conventions tranchées du § 9.2.

> **Ne recopie pas ce blueprint dans le projet.** Un document dupliqué diverge ; référence-le et
> n'écris localement que le delta.

### 12.9 Variante — reprendre un projet existant

Un projet déjà écrit ne se restructure pas d'un coup : un refactor global de 300 fichiers n'est
relisible par personne et bloque toute autre livraison. Cinq vagues, chacune livrable seule, dans
cet ordre — il est choisi pour que chaque vague **rende la suivante plus facile**.

**Vague 0 — Mesurer (½ journée, aucun code déplacé).** Lancer le kit d'audit (§ 11) et écrire le
résultat dans un fichier. C'est la ligne de base : sans elle, personne ne saura si les vagues
suivantes améliorent quoi que ce soit. Décider aussi les points du § 9.2 (suffixes, emplacement des
tests) — ils conditionnent tous les globs à venir.

**Vague 1 — Le socle, sans rien déplacer (1 jour).** Créer `shared/lib/actions/`, `ActionState`,
`shared/lib/cache.ts`, ajouter `server-only` aux modules à secrets, poser `pnpm validate` et la CI.
Aucun fichier existant ne bouge ; le socle est simplement **disponible** pour la suite. Un projet
qui s'arrête là a déjà gagné : le prochain fichier écrit le sera correctement.

**Vague 2 — Un module pilote (2–3 jours).** Choisir **un** domaine, moyen et bien délimité (pas le
plus gros, pas le plus trivial), et le restructurer en entier : les douze layers, les tests
colocalisés, les frontières respectées. Il devient le gabarit et l'argument — la discussion
« est-ce que ça vaut le coup » se règle sur un cas réel plutôt qu'en réunion.

**Vague 3 — Vider `app/` (par écran, en continu).** Pour chaque page, dans l'ordre de fréquence de
modification : sortir la requête vers `data/`, le calcul vers `services/`, le rendu vers
`components/`. Une page = une PR. C'est la vague la plus longue, et la seule qui n'a pas besoin
d'être finie pour être utile.

**Vague 4 — Les filets (1 jour, à faire dès que la vague 2 est finie).** Les tests de contrat
(§ 8.2), écrits avec leurs listes d'exemptions initiales — **une ligne par violation restante,
chacune avec sa raison**. La liste ne peut ensuite que rétrécir : c'est ce qui transforme une dette
constatée en dette qui se rembourse.

**Vague 5 — Découper `shared/` (au fil de l'eau).** Le fourre-tout d'origine (`utils/`, `helpers/`,
`components/` racine) se vide par la question du § 5.0.2 : « ce fichier nommerait-il encore quelque
chose si on supprimait tous les modules ? » Non → il descend dans un module.

| Vague | Effort  | Gain immédiat                                   | Bloque quoi si sautée                    |
| ----- | ------- | ----------------------------------------------- | ---------------------------------------- |
| 0     | ½ j     | On sait de quoi on parle                        | Aucune mesure de progrès                 |
| 1     | 1 j     | Le nouveau code est correct par défaut          | Chaque vague suivante réinvente le socle |
| 2     | 2–3 j   | Un gabarit à copier, et la preuve par l'exemple | Les vagues 3–5 n'ont pas de cible        |
| 3     | continu | `app/` redevient du routage                     | —                                        |
| 4     | 1 j     | La dette cesse de croître                       | La vague 3 se fait défaire en silence    |
| 5     | continu | `shared/` redevient une frontière               | —                                        |

> **La règle qui rend le refactor tenable** : on ne déplace un fichier **que quand on le modifie
> pour une autre raison**. Un déplacement pur pollue l'historique, casse les `git blame` et n'a
> aucun bénéfice tant que le fichier n'est pas relu. La seule exception est la vague 2, qui est
> délibérément un déplacement pur — parce qu'elle produit le gabarit.

---

## 13. Anti-patterns — les erreurs que cette structure existe pour empêcher

| Anti-pattern                                      | Ce que ça casse                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| Requête Prisma dans une `page.tsx`                | Rend la route non déplaçable, non testable, non cachable              |
| `select` Prisma inline dans `data/`               | Rate silencieusement les migrations de schéma                         |
| Tag de cache écrit en littéral                    | Invalidation qui ne se déclenche jamais, sans erreur                  |
| Server Action qui déduit avant de parser          | Endpoint RPC aux arguments arbitraires — les types TS n'existent plus |
| Helper exporté depuis un fichier `"use server"`   | Le helper devient un endpoint public                                  |
| `shared/` qui importe `modules/`                  | Cycle de dépendances, `shared/` devient un module de plus             |
| Import d'un `_components/` depuis une autre route | Le fichier aurait dû être promu en module — la frontière est morte    |
| Barrel `index.ts` par layer                       | Tree-shaking cassé, cycles d'import, dépendances invisibles           |
| Wrapper à ≥ 50 % de pass-through                  | Fichier qui coûte de la maintenance sans rien décider                 |
| Logique métier dans `shared/components/ui/`       | Perdue à la prochaine régénération des primitives                     |
| Page à IO non caché sans `loading.tsx`            | Échec de prérendu partiel à la construction                           |
| E2E qui asserte le **statut** d'une 404 streamée  | Faux échec : le statut est 200, seul le contenu est la 404            |
| Test de régression sans le _pourquoi_             | Se fait supprimer par le prochain qui le croit obsolète               |

Et les treize suivants, tirés des sections ajoutées :

| Anti-pattern                                             | Ce que ça casse                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `services/` qui importe `data/` ou le client DB          | Le layer pur cesse d'être testable sans mock — la spirale commence là         |
| Garde d'accès posée sur le `layout.tsx` seul             | Le layout n'est pas ré-exécuté en navigation client : les pages sont ouvertes |
| `updateTag` appelé depuis un webhook ou une route        | Throw, ou pire : invalidation morte que les tests mockés ne voient pas        |
| Validation faite **dans** le scope caché                 | Une entrée de cache par variante d'entrée sale                                |
| Lecture de cookies/session dans un scope caché           | Donnée d'un visiteur servie à un autre                                        |
| Durée de cache écrite en dur au call site                | Aucun moyen de changer une politique de fraîcheur sans relire tous les appels |
| Webhook qui répond 200 dans son `catch`                  | L'event est perdu définitivement — le tiers ne rejoue pas                     |
| Webhook lu en `.json()` avant vérification de signature  | La signature porte sur les octets bruts : elle ne validera jamais             |
| Store global en singleton de module                      | État partagé entre requêtes côté serveur — fuite de données entre visiteurs   |
| `useState(createStore())` au lieu de `useState(() => …)` | Un store neuf à chaque rendu : l'état ne persiste jamais                      |
| Module à secrets sans `import "server-only"`             | Une clé d'API dans le bundle client, sans aucune alerte                       |
| Sélecteur CSS écrit directement dans une spec E2E        | Toute la suite casse au premier renommage de classe                           |
| Deux définitions de « c'est bon » (locale ≠ CI)          | Les développeurs cessent de faire confiance au gate local                     |

---

## 14. Checklists opérationnelles

À copier dans le projet et à cocher. Ce sont elles qui font tenir la structure au quotidien —
personne ne relit un document de 1500 lignes avant chaque fichier.

### 14.1 J'ajoute un fichier — où va-t-il ?

Arbre de décision, à parcourir de haut en bas. La **première** réponse « oui » gagne.

```
Est-ce que ça rend du JSX ?
├─ oui → un seul segment de route le consomme ?
│        ├─ oui → app/<segment>/_components/
│        └─ non → modules/<domaine>/components/   (ou shared/components/ si ≥ 2 modules)
└─ non ↓

Est-ce que ça appelle un hook React ?
├─ oui → modules/<domaine>/hooks/   (ou shared/hooks/ si ≥ 2 modules)
└─ non ↓

Est-ce que ça écrit en base ?
├─ oui → modules/<domaine>/actions/       ("use server", garde → parse → muter → invalider)
└─ non ↓

Est-ce que ça lit en base ?
├─ oui → modules/<domaine>/data/          ("use cache" + tag, un fichier = une requête)
└─ non ↓

Est-ce que c'est un schéma de validation ?
├─ oui → modules/<domaine>/schemas/
└─ non ↓

Est-ce que c'est une valeur figée (select, tag, seuil, libellé) ?
├─ oui → modules/<domaine>/constants/     (ou shared/constants/ si ≥ 2 modules)
└─ non ↓

Est-ce que ça porte une règle MÉTIER (même pure) ?
├─ oui → modules/<domaine>/services/      (*.service.ts — ni DB ni DOM)
└─ non ↓

Est-ce que ça touche cookies / crypto / sérialisation d'un format ?
├─ oui → modules/<domaine>/lib/           (ou shared/lib/ si infrastructure)
└─ non → modules/<domaine>/utils/         (helper pur, sans charge métier)
```

**En cas de doute entre `utils/` et `services/`** : le nom de la fonction contient-il un terme du
métier ? `formatPrice` → util. `computeEffectivePrice` → service.

### 14.2 J'ajoute une Server Action

- [ ] Fichier dans `modules/<domaine>/actions/`, un export principal, nommé `<verbe>-<entité>.ts`
- [ ] `"use server"` en **première ligne**
- [ ] **Étape 1** : garde d'autorisation, avant toute lecture de l'argument
- [ ] **Étape 2** : `validateInput(schema, …)` — même si le type paraît évident
- [ ] Le schéma vit dans `schemas/`, pas dans le fichier de l'action
- [ ] Aucun helper exporté depuis ce fichier (il deviendrait un endpoint public)
- [ ] La règle métier est déléguée à un `services/`, pas écrite dans l'action
- [ ] Invalidation via la fabrique de tags du module, jamais un littéral
- [ ] `try/catch` global terminé par `handleActionError`
- [ ] Message de retour en langue d'UI, avec la bonne voix

### 14.3 J'ajoute une lecture de données

- [ ] Fichier dans `data/`, nommé `get-*` / `count-*` / `resolve-*`
- [ ] Point d'entrée public **hors** du scope caché : il valide et normalise
- [ ] Fonction interne avec `"use cache"` + profil de durée de vie + tag
- [ ] Le tag vient de `constants/`, et **un mutateur l'invalide** quelque part
- [ ] `select` importé de `constants/`, jamais écrit inline
- [ ] Aucune lecture de cookies / session dans le scope caché
- [ ] La visibilité (admin / publié) passe par un **paramètre**, pas par la session
- [ ] Retourne `null` sur absence, ne throw pas

### 14.4 J'ajoute une page

- [ ] Moins de 60 lignes, aucun accès DB direct
- [ ] `loading.tsx` frère si la page fait de l'IO non caché
- [ ] `error.tsx` sur le segment ou un parent
- [ ] Si la page est protégée : garde **sur la page**, pas seulement sur le layout
- [ ] `generateMetadata` délègue à `utils/seo/`
- [ ] Rien dans `_components/` n'est importé depuis une autre route

### 14.5 J'ajoute un module

- [ ] Le domaine a sa propre entité et au moins deux layers
- [ ] Dossiers créés seulement pour les layers qui ont du contenu
- [ ] `__tests__/` colocalisé dans chaque layer testable
- [ ] Aucun `index.ts` de layer
- [ ] Aucun import vers un autre module — ou alors commenté et unidirectionnel
- [ ] Le module se supprimerait par `rm -rf` + retrait des routes

### 14.6 Revue de PR — les huit questions

1. Un fichier est-il rangé par **ce qu'il fait** plutôt que par ce qu'il concerne ?
2. Une frontière du § 6 est-elle franchie sans commentaire ?
3. Une action nouvelle a-t-elle sa garde **et** sa validation ?
4. Un tag de cache posé a-t-il un invalidateur — et l'inverse ?
5. Un nouveau `"use client"` est-il sur une **feuille** ?
6. Une règle est-elle documentée en commentaire alors qu'un test pourrait la tenir ?
7. Un test de régression modifié : le _pourquoi_ a-t-il été relu ?
8. `pnpm validate` passe-t-il, sans exemption ajoutée en silence ?

---

## Annexe A — arbre condensé, à copier tel quel

```
projet/
├── app/
│   ├── (public)/{layout,error}.tsx + segments/{page,loading,error,not-found}.tsx
│   │   └── <segment>/{_components,_utils,_hooks}/
│   ├── admin/
│   │   ├── connexion/            # hors garde
│   │   └── (protected)/          # sous garde
│   ├── api/<endpoint>/route.ts
│   ├── layout.tsx  globals.css  styles/
│   └── not-found.tsx  error.tsx  robots.ts  sitemap.ts  opengraph-image.tsx
├── modules/<domaine>/
│   ├── actions/     # "use server" — garde → parse → muter → invalider
│   ├── data/        # lectures cachées, 1 fichier = 1 requête
│   ├── services/    # logique pure (ni DB ni DOM)
│   ├── schemas/     # Zod
│   ├── constants/   # SSOT : selects, tags de cache, limites
│   ├── components/  # + components/admin/ + __tests__/
│   ├── hooks/  utils/  types/  lib/  contexts/
├── shared/
│   ├── components/{ui,forms,dialogs,data-table,navigation,…}
│   ├── lib/{prisma,stripe,env,logger,cache,actions/}
│   ├── constants/  hooks/  schemas/  stores/  providers/  types/  utils/  styles/
├── test/{contract,conventions,fixtures,mocks,utils,integration}/
├── e2e/{specs,authenticated,a11y,pages,helpers}/
├── prisma/{schema.prisma,migrations,seed.ts}
├── emails/  scripts/  docs/  public/  eslint-plugin-local/
└── configs racine (next, tsconfig, eslint, vitest, playwright, knip, …)
```

---

## Annexe B — gabarit de module, à copier fichier par fichier

Le squelette complet d'un module `<domaine>` avec l'entité `<Entité>`. Supprimer ce qui n'est pas
nécessaire ; ne jamais ajouter un dossier hors de cette liste.

```
modules/<domaine>/
├── actions/                                    # "use server"
│   ├── create-<entité>.ts                      # garde → parse → muter → invalider
│   ├── update-<entité>.ts
│   ├── delete-<entité>.ts
│   └── toggle-<entité>-<champ>.ts
├── data/                                       # "use cache"
│   ├── __tests__/
│   ├── get-<entité>.ts                         # une entité, par identifiant public
│   ├── get-<entités>.ts                        # liste filtrée + paginée
│   ├── count-<entités>.ts
│   └── resolve-<x>-slugs.ts                    # identifiant public → interne
├── services/                                   # pur : ni DB, ni DOM
│   ├── __tests__/
│   ├── <entité>-<sujet>.service.ts             # une préoccupation par fichier
│   └── <entité>-query-builder.ts               # construction de clauses WHERE
├── schemas/
│   ├── <entité>.schemas.ts                     # façade de ré-export (optionnelle)
│   ├── <entité>-query.schemas.ts               # entrées d'URL
│   └── <entité>-mutation.schemas.ts            # entrées d'actions
├── constants/
│   ├── <entité>.constants.ts                   # SELECT + valeurs figées
│   ├── cache.ts                                # tags — SSOT
│   └── <sujet>.constants.ts
├── components/
│   ├── __tests__/
│   ├── <entité>-card.tsx                       # surface publique
│   ├── <entité>-list.tsx
│   ├── admin/                                  # surface d'administration
│   │   ├── __tests__/
│   │   ├── create-<entité>-form.tsx
│   │   ├── <entités>-data-table.tsx
│   │   └── <entité>-detail/                    # écran complexe → composite
│   │       ├── index.ts
│   │       └── <entité>-detail-*.tsx
│   └── <composite>/                            # composite public
│       └── index.ts
├── hooks/
│   ├── __tests__/
│   ├── use-<verbe>-<entité>.ts                 # câblage d'une action
│   └── use-<entité>-form.ts
├── utils/
│   ├── __tests__/
│   ├── cache.utils.ts                          # poseurs + invalidateurs, ENSEMBLE
│   ├── format-<x>.ts
│   ├── parse-<entité>-params.ts
│   └── seo/
│       ├── generate-metadata.ts
│       └── generate-structured-data.ts
├── types/
│   ├── <entité>.types.ts
│   └── <entité>-services.types.ts              # formes minimales des services
├── lib/                                        # si le domaine possède un format
│   └── <domaine>-<mécanisme>.ts
├── contexts/                                   # si un comportement doit traverser
│   └── <domaine>-<sujet>-context.tsx
└── config/                                     # si une structure est parcourue
    └── <sujet>.config.ts
```

**Ordre d'écriture** (chaque étape ne dépend que des précédentes) :

```
types → schemas → constants → services (+tests) → data → actions → utils → hooks → components → page
```

---

## Annexe C — récapitulatif des invariants

Les vingt règles non négociables du document, avec leur section et leur vérificateur. C'est la page
à imprimer.

| #   | Invariant                                                      | §   | Tenu par           |
| --- | -------------------------------------------------------------- | --- | ------------------ |
| 1   | `app/` ne contient que du routage                              | 1.1 | Audit + revue      |
| 2   | Un module se découpe par domaine, puis par layer               | 1.2 | Revue              |
| 3   | `shared/` exige ≥ 2 consommateurs ou une raison structurelle   | 1.3 | Audit + revue      |
| 4   | Alias `@/*` unique                                             | 2.2 | `tsconfig`         |
| 5   | Toute page à IO non caché a un `loading.tsx`                   | 3.3 | Build + audit      |
| 6   | Une garde d'accès se pose **par page**, pas sur le layout      | 3.3 | Test de contrat    |
| 7   | Un webhook est idempotent et son code HTTP est une instruction | 3.4 | Revue + e2e        |
| 8   | Le middleware fait du default-deny, jamais de la crypto        | 3.5 | Revue              |
| 9   | Un `select` vit dans `constants/`, jamais inline               | 4.3 | Audit              |
| 10  | Une action : garde → parse → muter → invalider                 | 4.3 | 2 tests de contrat |
| 11  | Aucun helper exporté depuis un fichier `"use server"`          | 4.3 | Test de contrat    |
| 12  | `services/` ne touche ni la DB ni le DOM                       | 4.3 | ESLint + audit     |
| 13  | Pas de barrel de layer                                         | 4.5 | Audit              |
| 14  | `shared/` n'importe jamais `modules/`                          | 6   | ESLint + audit     |
| 15  | Une dépendance inter-module est unidirectionnelle et commentée | 4.7 | Audit + revue      |
| 16  | `"use client"` va sur la feuille ; un composant client est pur | 6.2 | Audit              |
| 17  | Tout module à secrets porte `import "server-only"`             | 5.6 | Build              |
| 18  | La normalisation précède le scope caché                        | 7.1 | Revue              |
| 19  | Un tag a un lecteur **et** un mutateur                         | 7.1 | Audit              |
| 20  | L'API d'invalidation dépend du contexte d'exécution            | 7.3 | ESLint + 2 tests   |
