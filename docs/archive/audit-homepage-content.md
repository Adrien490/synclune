# Audit & Plan : Contenu dynamique de la landing page

> Audit realise le 2026-03-13 — Corrige le 2026-03-13

## Sommaire

1. [Contexte](#contexte)
2. [Audit du contenu actuel](#audit-du-contenu-actuel)
3. [Approche retenue](#approche-retenue)
4. [Modele de donnees](#modele-de-donnees)
5. [Schemas Zod par section](#schemas-zod-par-section)
6. [Valeurs par defaut et fallback](#valeurs-par-defaut-et-fallback)
7. [Data layer et cache](#data-layer-et-cache)
8. [Action server](#action-server)
9. [Images polaroids — UploadThing](#images-polaroids--uploadthing)
10. [Admin UX](#admin-ux)
11. [Refactor storefront](#refactor-storefront)
12. [Seed](#seed)
13. [Phasage et ROI](#phasage-et-roi)
14. [Sequence d'implementation](#sequence-dimplementation)
15. [Verification](#verification)
16. [Fichiers a creer et modifier](#fichiers-a-creer-et-modifier)

---

## Contexte

La landing page a 6 sections. Seules 2 ont du contenu dynamique (FAQ via DB, produits/collections/avis via auto-fetch). Tout le reste — titres, sous-titres, CTAs, texte de l'atelier, etapes creatives, polaroids — est hardcode dans les composants. L'administratrice ne peut pas modifier ces textes sans intervention developpeur.

Pour une livraison production 2026, le contenu editorial a forte valeur editoriale doit etre administrable.

Le module `modules/content/` gere deja FAQ + Annonces avec un pattern mature (CRUD, cache, rate limiting, audit, Zod). On etend ce module.

---

## Audit du contenu actuel

### Contenu deja dynamique (DB-driven)

| Contenu                      | Source                                            | Cache                    |
| ---------------------------- | ------------------------------------------------- | ------------------------ |
| Cartes produits (4 derniers) | `getProducts()` — auto-fetch par date             | `products` (15m/5m)      |
| Carousel collections (6 max) | `getCollections()` — auto-fetch par date          | `collections` (1h/15m)   |
| Avis clients (6 featured)    | `getFeaturedReviews()` — top rating, min 50 chars | `productDetail` (15m/5m) |
| Stats avis (moyenne, total)  | `getGlobalReviewStats()`                          | `productDetail` (15m/5m) |
| Items FAQ (Q&A + liens)      | `getFaqItems()` — CRUD admin complet              | `reference` (7d/24h)     |
| Barre d'annonce              | `getActiveAnnouncement()` — scheduling, toggle    | `collections` (1h/15m)   |

### Contenu hardcode a rendre dynamique

#### 1. Hero Section

**Fichier :** `app/(boutique)/(accueil)/_components/hero-section.tsx`

| Contenu                | Valeur actuelle                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Titre principal        | `"Des bijoux"`                                                                         |
| Mots rotatifs          | `["colores", "uniques"]`                                                               |
| Sous-titre mobile      | `"Faits main pour sublimer votre quotidien"`                                           |
| Sous-titre desktop     | `"Crees a la main pour des occasions particulieres, ou pour sublimer votre quotidien"` |
| CTA primaire (texte)   | `"Decouvrir la boutique"`                                                              |
| CTA primaire (lien)    | `/produits`                                                                            |
| CTA secondaire (texte) | `"Creer mon bijou"`                                                                    |
| CTA secondaire (lien)  | `/personnalisation`                                                                    |

> **Note :** Les sous-titres sont suivis d'une icone Heart hardcodee + span sr-only "avec amour". L'icone reste dans le composant, seul le texte est editable.

#### 2. Section Nouvelles creations

**Fichier :** `app/(boutique)/(accueil)/_components/latest-creations.tsx`

| Contenu    | Valeur actuelle                                               |
| ---------- | ------------------------------------------------------------- |
| Titre      | `"Nouvelles creations"`                                       |
| Sous-titre | `"Tout juste sorties de l'atelier et realisees avec amour !"` |
| CTA        | `"Voir tous les nouveaux bijoux"`                             |
| CTA lien   | `/produits?sortBy=created-descending`                         |

#### 3. Section Collections

**Fichier :** `app/(boutique)/(accueil)/_components/collections-section.tsx`

| Contenu    | Valeur actuelle                                                |
| ---------- | -------------------------------------------------------------- |
| Titre      | `"Les dernieres collections"`                                  |
| Sous-titre | `"Je rajoute une petite touche personnelle a chaque creation"` |
| CTA        | `"Explorer les collections"`                                   |
| CTA lien   | `/collections`                                                 |

> **Note :** Le sous-titre est suivi d'une icone Heart hardcodee + span sr-only "(avec amour)". L'icone reste dans le composant, seul le texte est editable.

#### 4. Section Avis

**Fichier :** `app/(boutique)/(accueil)/_components/reviews-section.tsx`

| Contenu    | Valeur actuelle                                                       |
| ---------- | --------------------------------------------------------------------- |
| Titre      | `"Ce que disent nos clientes"`                                        |
| Sous-titre | `"Des creations uniques, portees et approuvees par notre communaute"` |
| CTA        | `"Voir les creations les mieux notees"`                               |
| CTA lien   | `/produits?sortBy=rating-descending`                                  |

#### 5. Section Atelier (la plus complexe — 7 fichiers)

**Fichier principal :** `app/(boutique)/(accueil)/_components/atelier-section/atelier-section.tsx`

| Contenu                     | Valeur actuelle                                    |
| --------------------------- | -------------------------------------------------- |
| Titre                       | `"Mon atelier"`                                    |
| Sous-titre                  | `"Depuis mon atelier"`                             |
| Intro confession            | `"Je vais vous faire une confidence."`             |
| Paragraphes confession (x3) | Textes mobile/desktop differents                   |
| Signature                   | `"— Leane"`                                        |
| CTA accroche                | `"Envie d'un bijou qui vous ressemble vraiment ?"` |
| CTA bouton                  | `"Creer votre bijou sur-mesure"`                   |
| CTA lien                    | `/personnalisation`                                |

**Fichier :** `app/(boutique)/(accueil)/_components/atelier-section/process-steps.ts`

| Etape | Titre                          | Description                           |
| ----- | ------------------------------ | ------------------------------------- |
| 1     | `"D'abord, une idee"`          | Texte sur l'inspiration               |
| 2     | `"Le dessin et la peinture"`   | Texte sur le dessin sur plastique fou |
| 3     | `"La cuisson et l'assemblage"` | Texte sur la cuisson + montage        |
| 4     | `"La touche finale"`           | Texte sur le polissage + emballage    |

**Fichier :** `app/(boutique)/(accueil)/_components/atelier-section/polaroid-gallery.tsx`

| Polaroid    | Caption                         | Label (alt)                              | Image       |
| ----------- | ------------------------------- | ---------------------------------------- | ----------- |
| hands       | `"Les mains dans les perles !"` | `"Mains de Leane assemblant un bijou"`   | Placeholder |
| materials   | `"Mes petits tresors"`          | `"Perles et materiaux colores Synclune"` | Placeholder |
| inspiration | `"L'inspiration du jour"`       | `"Carnet d'inspiration de Leane"`        | Placeholder |
| workspace   | `"Mon coin creatif"`            | `"Vue de l'atelier Synclune"`            | Placeholder |

**HowTo JSON-LD** (embedded dans atelier-section.tsx) :

- Nom, description, 4 etapes, fournitures (plastique fou, acrylique...), outils (pinceaux, four, pinces...)
- **Note :** Actuellement construit au niveau module (statique). Doit devenir dynamique dans le corps du composant apres le fetch DB pour utiliser les titres/descriptions des etapes de la DB.

#### 6. Section FAQ

**Fichier :** `modules/content/components/faq-section.tsx`

| Contenu     | Valeur actuelle                                                    |
| ----------- | ------------------------------------------------------------------ |
| Titre       | `"Questions frequentes"`                                           |
| Sous-titre  | `"Retrouvez ici les reponses aux questions les plus posees"`       |
| CTA intro   | `"Vous n'avez pas trouve votre reponse ?"`                         |
| CTA tagline | `"Ecrivez-moi, je reponds toujours !"` (italic, petitFormalScript) |
| CTA bouton  | `"Me contacter"`                                                   |
| CTA lien    | `mailto:${BRAND.contact.email}` (PAS un path `/`)                  |

> **Note :** Le CTA FAQ utilise un lien `mailto:`, pas un path interne. Le schema de la section FAQ doit en tenir compte (pas de contrainte `startsWith("/")`).

---

## Approche retenue

### Table `HomepageSection` avec JSON type par Zod

**Une table, une row par section.** Le champ `content` (JSON) contient les donnees specifiques a chaque section, validees par un schema Zod dedie cote application.

### Pourquoi ce choix

| Option                   | Description                                          | Verdict    |
| ------------------------ | ---------------------------------------------------- | ---------- |
| A. Key-value             | Perd la securite de type, mauvaise UX admin          | Rejete     |
| B. Table par section     | Sur-ingenierie (5+ tables, 5+ CRUD) pour 1 admin     | Rejete     |
| **C. JSON type par Zod** | **1 table, flexible, coherent avec `FaqItem.links`** | **Retenu** |
| D. Table plate mono-row  | Rigide, 40+ colonnes, migration a chaque ajout       | Rejete     |

**Avantages :**

- Une seule migration, un seul set d'actions
- Ajouter un champ = modifier le schema Zod, pas la DB
- Coherent avec le pattern existant (`FaqItem.links` utilise `Json` + Zod)
- Adapte a un site avec 1 admin et 5-6 sections connues

---

## Modele de donnees

### Prisma

```prisma
model HomepageSection {
  id        String   @id @default(cuid())
  section   String   @unique @db.VarChar(50)
  content   Json
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
}
```

> **Note :** Pas de `@@index([section])` — la contrainte `@unique` cree deja un index.

**Sections :** `"hero"`, `"latest-creations"`, `"collections"`, `"reviews"`, `"atelier"`, `"faq"`

**Pas de soft delete** — contenu ephemere, pas de retention legale (meme pattern que AnnouncementBar et FaqItem).

---

## Schemas Zod par section

**Fichier :** `modules/content/schemas/homepage.schemas.ts`

### Hero

```typescript
const heroContentSchema = z.object({
	heading: z.string().trim().min(1).max(100),
	rotatingWords: z.array(z.string().trim().min(1).max(50)).min(1).max(5),
	subtitleMobile: z.string().trim().min(1).max(300),
	subtitleDesktop: z.string().trim().min(1).max(500),
	primaryCtaText: z.string().trim().min(1).max(50),
	primaryCtaLink: z.string().trim().startsWith("/"),
	secondaryCtaText: z.string().trim().min(1).max(50),
	secondaryCtaLink: z.string().trim().startsWith("/"),
});
```

### Sections simples (latest-creations, collections, reviews)

```typescript
const simpleSectionContentSchema = z.object({
	title: z.string().trim().min(1).max(200),
	subtitle: z.string().trim().min(1).max(500),
	ctaText: z.string().trim().min(1).max(100),
	ctaLink: z.string().trim().startsWith("/"),
});
```

Un seul schema reutilise pour les 3 sections (latest-creations, collections, reviews).

### FAQ

```typescript
const faqSectionContentSchema = z.object({
	title: z.string().trim().min(1).max(200),
	subtitle: z.string().trim().min(1).max(500),
	ctaPrompt: z.string().trim().min(1).max(200),
	ctaTagline: z.string().trim().min(1).max(200),
	ctaText: z.string().trim().min(1).max(100),
	ctaLink: z.string().trim().min(1).max(500),
});
```

> **Note :** `ctaLink` n'a PAS de contrainte `startsWith("/")` car le CTA FAQ utilise un lien `mailto:`. La validation accepte tout lien non-vide.

### Atelier

```typescript
const atelierContentSchema = z.object({
	title: z.string().trim().min(1).max(100),
	subtitle: z.string().trim().min(1).max(300),
	confessionIntro: z.string().trim().min(1).max(200),
	confessionParagraphs: z
		.array(
			z.object({
				mobile: z.string().trim().min(1).max(1000),
				desktop: z.string().trim().min(1).max(1000),
			}),
		)
		.length(3),
	signatureName: z.string().trim().min(1).max(50),
	processSteps: z
		.array(
			z.object({
				title: z.string().trim().min(1).max(100),
				description: z.string().trim().min(1).max(500),
			}),
		)
		.length(4),
	polaroids: z
		.array(
			z.object({
				caption: z.string().trim().min(1).max(100),
				label: z.string().trim().min(1).max(200),
				imageUrl: z.string().url().nullable(),
				blurDataUrl: z.string().nullable(),
			}),
		)
		.length(4),
	ctaPrompt: z.string().trim().min(1).max(200),
	ctaText: z.string().trim().min(1).max(100),
	ctaLink: z.string().trim().startsWith("/"),
	howToName: z.string().trim().min(1).max(200),
	howToDescription: z.string().trim().min(1).max(500),
	supplies: z.array(z.string().trim().min(1).max(100)),
	tools: z.array(z.string().trim().min(1).max(100)),
});
```

### Map de validation

```typescript
export const SECTION_CONTENT_SCHEMAS = {
	hero: heroContentSchema,
	"latest-creations": simpleSectionContentSchema,
	collections: simpleSectionContentSchema,
	reviews: simpleSectionContentSchema,
	faq: faqSectionContentSchema,
	atelier: atelierContentSchema,
} as const;

export type SectionKey = keyof typeof SECTION_CONTENT_SCHEMAS;
```

---

## Valeurs par defaut et fallback

**Fichier :** `modules/content/constants/homepage-defaults.ts`

Contient toutes les valeurs actuellement hardcodees, extraites des composants. Triple usage :

1. **Fallback** si la row DB est absente → le site fonctionne sans config admin
2. **Donnees de seed** pour la migration initiale
3. **Reference typee** pour les schemas

La data layer fusionne : `{ ...defaults[section], ...dbContent }`

> **Valeurs CTA critiques a extraire correctement :**
>
> - Hero CTA primaire → `/produits` (PAS `/boutique`)
> - Latest creations CTA → `/produits?sortBy=created-descending`
> - Collections CTA → `/collections`
> - Reviews CTA → `/produits?sortBy=rating-descending`
> - Atelier CTA → `/personnalisation`
> - FAQ CTA → `mailto:${BRAND.contact.email}`

---

## Data layer et cache

### Storefront

**Fichier :** `modules/content/data/get-homepage-section.ts`

```typescript
export async function getHomepageSection<T extends SectionKey>(
	section: T,
): Promise<SectionContent<T>> {
	return fetchHomepageSection(section);
}

async function fetchHomepageSection<T extends SectionKey>(section: T): Promise<SectionContent<T>> {
	"use cache";
	cacheLife("collections"); // 1h stale / 15m revalidate
	cacheTag(`homepage-${section}`);

	const row = await prisma.homepageSection.findUnique({
		where: { section },
	});

	const defaults = HOMEPAGE_DEFAULTS[section];
	if (!row) return defaults;

	const parsed = SECTION_CONTENT_SCHEMAS[section].safeParse(row.content);
	return parsed.success ? { ...defaults, ...parsed.data } : defaults;
}
```

> **Pourquoi `"collections"` (1h/15m) et PAS `"reference"` (7d/24h) :** Ce contenu est explicitement rendu editable par l'admin. Avec "reference", l'admin modifie un titre mais ne voit rien changer sur le storefront pendant 24h. Le profil "collections" (1h stale / 15m revalidate) offre un bon compromis : meme profil que l'AnnouncementBar (autre contenu admin-editable), feedback sous 15 minutes max.

### Admin

**Fichier :** `modules/content/data/get-homepage-sections.ts`

Fetch toutes les sections pour l'interface admin. Cache `dashboard` (1m/30s).

### Cache tags

**Fichier :** `modules/content/constants/cache.ts` (ajouter)

```typescript
export const HOMEPAGE_CACHE_TAGS = {
	HERO: "homepage-hero",
	LATEST_CREATIONS: "homepage-latest-creations",
	COLLECTIONS: "homepage-collections",
	REVIEWS: "homepage-reviews",
	ATELIER: "homepage-atelier",
	FAQ: "homepage-faq",
	LIST: "homepage-sections-list",
} as const;

export function cacheHomepageSection(section: string) {
	cacheLife("collections");
	cacheTag(`homepage-${section}`);
}

export function cacheHomepageSectionsList() {
	cacheLife("dashboard");
	cacheTag(HOMEPAGE_CACHE_TAGS.LIST);
}

export function getHomepageInvalidationTags(section: string): string[] {
	return [`homepage-${section}`, HOMEPAGE_CACHE_TAGS.LIST];
}
```

---

## Action server

**Fichier :** `modules/content/actions/update-homepage-section.ts`

Une seule action pour toutes les sections :

```
1. requireAdminWithUser()
2. Rate limit (per-admin-user)
3. Valider section key (enum check)
4. Parser content JSON avec le schema Zod correspondant
5. sanitizeText() sur tous les champs texte
6. prisma.homepageSection.upsert() (cree si absent, met a jour sinon)
7. getHomepageInvalidationTags(section).forEach(updateTag)
8. logAudit({ action: "homepage-section.update", targetType: "homepage", metadata: { section } })
```

Pattern identique aux actions existantes (create-faq-item, update-announcement, etc.).

---

## Images polaroids — UploadThing

> **Phase 2 uniquement** — Voir [Phasage et ROI](#phasage-et-roi).

**Fichier :** `app/api/uploadthing/core.ts` (ajouter route)

```typescript
atelierMedia: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
	.middleware(async () => {
		// requireAdmin + rate limit
		return { userId: admin.user.id };
	})
	.onUploadComplete(async ({ file }) => {
		const blurDataUrl = await generateBlurSafe(file.ufsUrl);
		return { url: file.ufsUrl, blurDataUrl };
	});
```

Dans le formulaire atelier, chaque polaroid a un `UploadDropzone`. L'URL et le blurDataUrl sont stockes dans le JSON `content` de la section atelier.

Pattern identique a l'upload existant dans le formulaire de personnalisation (`customization-form.tsx`).

---

## Admin UX

### Route

`/admin/contenu/homepage` — Page avec onglets (Tabs), un par section.

### Lien dans le hub contenu

**Fichier :** `app/admin/contenu/page.tsx`

Ajouter un 3e lien :

```typescript
{
  title: "Page d'accueil",
  description: "Modifier les textes et images de la homepage",
  href: "/admin/contenu/homepage",
  icon: Home,
}
```

Passer `columns` de 2 a 3.

### Structure des formulaires

#### Onglet Hero

- `heading` — Input texte
- `rotatingWords` — Editeur de liste (ajouter/supprimer items, pattern du FAQ links editor)
- `subtitleMobile` + `subtitleDesktop` — 2 textareas
- CTA primaire (texte + lien) + CTA secondaire (texte + lien)

#### Onglets Nouvelles creations / Collections / Avis

- Formulaire reutilisable `simple-section-form.tsx`
- 3 champs : titre, sous-titre, CTA texte
- 1 champ : CTA lien

#### Onglet FAQ

- Formulaire dedie `faq-section-form.tsx`
- 6 champs : titre, sous-titre, texte d'intro CTA, tagline CTA, texte bouton CTA, lien CTA

#### Onglet Atelier (le plus complexe — Phase 2)

Organise en fieldsets visuels :

1. **General** — Titre, sous-titre, nom signature
2. **Texte confession** — Intro + 3 paires de textareas (mobile/desktop)
3. **Etapes creatives** — 4 lignes fixes (titre + description textarea)
4. **Galerie polaroids** — 4 slots avec UploadDropzone + caption + label
5. **CTA** — Texte d'accroche, texte bouton, lien
6. **SEO (HowTo)** — Nom, description, liste fournitures, liste outils

### Fichiers admin

| Fichier                                                      | Role                                    |
| ------------------------------------------------------------ | --------------------------------------- |
| `app/admin/contenu/homepage/page.tsx`                        | Page serveur, fetch toutes les sections |
| `app/admin/contenu/homepage/layout.tsx`                      | Metadata                                |
| `modules/content/components/admin/homepage-section-tabs.tsx` | Container onglets (client)              |
| `modules/content/components/admin/hero-form.tsx`             | Formulaire Hero                         |
| `modules/content/components/admin/simple-section-form.tsx`   | Formulaire reutilisable (3 sections)    |
| `modules/content/components/admin/faq-section-form.tsx`      | Formulaire FAQ                          |
| `modules/content/components/admin/atelier-form.tsx`          | Formulaire Atelier (Phase 2)            |

### Pas de preview

L'admin est une seule personne (l'artisane). Le site se met a jour sous 15 minutes apres sauvegarde (cache "collections"). Un pattern "sauvegarder + lien vers la homepage" suffit. Pas besoin de systeme de preview complexe.

---

## Refactor storefront

### `page.tsx`

Appeler `getHomepageSection()` pour chaque section et passer le contenu en prop (ou Promise) aux composants.

### Composants a modifier

| Composant                 | Changement                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hero-section.tsx`        | Prop `contentPromise` → `use()` pour heading, rotatingWords, subtitle, CTAs. **Icone Heart reste hardcodee** dans le composant (append apres le texte DB).                                                |
| `latest-creations.tsx`    | Prop `content` → titre, sous-titre, CTA depuis DB                                                                                                                                                         |
| `collections-section.tsx` | Prop `content` → titre, sous-titre, CTA depuis DB. **Icone Heart reste hardcodee** dans le composant (append apres subtitle DB).                                                                          |
| `reviews-section.tsx`     | Prop `content` → titre, sous-titre, CTA depuis DB                                                                                                                                                         |
| `atelier-section.tsx`     | Fetch `getHomepageSection("atelier")` dans le composant (deja async). Passer aux sous-composants. **HowTo JSON-LD doit etre construit dynamiquement** dans le corps du composant (plus au niveau module). |
| `process-steps.ts`        | Split config visuelle (hardcodee) / contenu (DB). Merge au runtime par index                                                                                                                              |
| `polaroid-gallery.tsx`    | Accepter `polaroids` prop. `next/image` quand `imageUrl` existe, fallback `PlaceholderImage`                                                                                                              |
| `signature-reveal.tsx`    | Accepter `signatureName` prop au lieu du nom hardcode                                                                                                                                                     |
| `faq-section.tsx`         | Prop `content` → titre, sous-titre, CTA prompt, CTA tagline, CTA bouton, CTA lien                                                                                                                         |

### Separation config visuelle vs contenu

Les polaroids et process steps ont une config visuelle complexe (tilt, washi colors, glow classes, scatter CSS, icon hover classes) qui reste **dans le code**. Seuls les champs editoriaux (caption, label, imageUrl pour polaroids ; title, description pour steps) viennent de la DB.

Le merge se fait par index — les 4 items sont fixes et ordonnes :

```typescript
// process-steps.ts — exemple de merge
const VISUAL_CONFIG = [
	{ id: "idea", color: STEP_COLORS.secondary, iconHoverClass: "...", glowClass: "..." },
	// ...3 autres
];

export function getProcessSteps(dbSteps: { title: string; description: string }[]) {
	return VISUAL_CONFIG.map((config, i) => ({
		...config,
		title: dbSteps[i]?.title ?? DEFAULT_TITLES[i],
		description: dbSteps[i]?.description ?? DEFAULT_DESCRIPTIONS[i],
	}));
}
```

### Icones inline (Heart)

Les composants `hero-section.tsx` et `collections-section.tsx` affichent une icone Heart inline apres le sous-titre. Cette icone est du **style visuel**, pas du contenu editorial — elle reste **hardcodee dans le composant**. Le champ `subtitle` en DB contient uniquement le texte brut ; le composant ajoute l'icone apres le rendu du texte.

---

## Seed

**Fichier :** `prisma/seed.ts` (ajouter bloc)

Creer 6 rows `HomepageSection` avec les valeurs extraites des composants actuels, via les objets `HOMEPAGE_DEFAULTS`.

```typescript
for (const [section, content] of Object.entries(HOMEPAGE_DEFAULTS)) {
	await prisma.homepageSection.upsert({
		where: { section },
		create: { section, content },
		update: { content },
	});
}
```

---

## Phasage et ROI

L'implementation est phasee selon le ROI de chaque section :

### Phase 1 — Hero + 3 sections simples (priorite lancement)

| Section          | Effort                             | ROI                                      |
| ---------------- | ---------------------------------- | ---------------------------------------- |
| Hero             | Moyen (8 champs, editeur de liste) | **Eleve** — messaging saisonnier, promos |
| Latest creations | Faible (4 champs)                  | **Moyen** — titres/CTAs ajustables       |
| Collections      | Faible (4 champs)                  | **Moyen** — idem                         |
| Reviews          | Faible (4 champs)                  | **Moyen** — idem                         |

**Effort total :** ~2-3 jours. Couvre le contenu le plus susceptible de changer.

### Phase 2 — Atelier (post-lancement, si demande)

| Section | Effort                                               | ROI                                                                         |
| ------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Atelier | **Eleve** (20+ champs, uploads, fieldsets complexes) | **Faible** — contenu quasi-statique (manifeste personnel, etapes creatives) |

**Effort total :** ~3-4 jours. Le formulaire atelier a lui seul represente ~40-50% de l'effort total. Ce contenu change peut-etre une fois par an — un commit dev suffit.

### Phase 3 — FAQ editorial (probablement jamais necessaire)

| Section | Effort            | ROI                                                                                             |
| ------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| FAQ     | Faible (6 champs) | **Tres faible** — "Questions frequentes" ne changera jamais. Le CRUD des items FAQ existe deja. |

**Effort total :** ~0.5 jour. A faire seulement si l'admin le demande explicitement.

---

## Sequence d'implementation

### Phase 1

| Etape | Description                                   | Fichiers                                                                              |
| ----- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1     | Modele Prisma + migration                     | `prisma/schema.prisma`                                                                |
| 2     | Schemas Zod (hero + simple + faq)             | `modules/content/schemas/homepage.schemas.ts`                                         |
| 3     | Constantes defaults + cache tags              | `modules/content/constants/homepage-defaults.ts`, `cache.ts`                          |
| 4     | Data layer (get section, get all)             | `modules/content/data/get-homepage-section.ts`, `get-homepage-sections.ts`            |
| 5     | Action update                                 | `modules/content/actions/update-homepage-section.ts`                                  |
| 6     | Composants admin (tabs + hero + simple + faq) | `modules/content/components/admin/`                                                   |
| 7     | Route admin + lien hub                        | `app/admin/contenu/homepage/`, `app/admin/contenu/page.tsx`                           |
| 8     | Refactor storefront (5 composants)            | `app/(boutique)/(accueil)/_components/`, `modules/content/components/faq-section.tsx` |
| 9     | Seed                                          | `prisma/seed.ts`                                                                      |
| 10    | Tests                                         | Schemas, data layer, action                                                           |

### Phase 2 (si demande)

| Etape | Description                 | Fichiers                                                                                  |
| ----- | --------------------------- | ----------------------------------------------------------------------------------------- |
| 1     | Route UploadThing           | `app/api/uploadthing/core.ts`                                                             |
| 2     | Formulaire admin atelier    | `modules/content/components/admin/atelier-form.tsx`                                       |
| 3     | Refactor atelier storefront | `atelier-section.tsx`, `process-steps.ts`, `polaroid-gallery.tsx`, `signature-reveal.tsx` |
| 4     | HowTo JSON-LD dynamique     | `atelier-section.tsx`                                                                     |

---

## Verification

| Commande                        | Attendu                                                |
| ------------------------------- | ------------------------------------------------------ |
| `pnpm prisma migrate dev`       | Migration OK                                           |
| `pnpm seed`                     | 6 rows HomepageSection creees                          |
| `pnpm dev` → Homepage           | Identique visuellement (fallback = valeurs actuelles)  |
| `/admin/contenu/homepage`       | Interface onglets fonctionnelle                        |
| Modifier un titre → homepage    | Texte mis a jour sous 15 min max (cache "collections") |
| Upload image polaroid (Phase 2) | Affichage avec blur placeholder                        |
| `pnpm typecheck`                | Pas d'erreurs TypeScript                               |
| `pnpm lint`                     | Pas d'erreurs ESLint                                   |
| `pnpm test`                     | Tests schemas + data layer + action OK                 |
| `pnpm build`                    | Build production OK                                    |

---

## Fichiers a creer et modifier

### A creer

| Fichier                                                      | Role                        | Phase |
| ------------------------------------------------------------ | --------------------------- | ----- |
| `prisma/migrations/[ts]_add_homepage_sections/migration.sql` | Migration                   | 1     |
| `modules/content/schemas/homepage.schemas.ts`                | Schemas Zod par section     | 1     |
| `modules/content/constants/homepage-defaults.ts`             | Valeurs par defaut / seed   | 1     |
| `modules/content/data/get-homepage-section.ts`               | Fetch section storefront    | 1     |
| `modules/content/data/get-homepage-sections.ts`              | Fetch toutes sections admin | 1     |
| `modules/content/actions/update-homepage-section.ts`         | Action mutation             | 1     |
| `modules/content/components/admin/homepage-section-tabs.tsx` | Container onglets           | 1     |
| `modules/content/components/admin/hero-form.tsx`             | Formulaire Hero             | 1     |
| `modules/content/components/admin/simple-section-form.tsx`   | Formulaire reutilisable     | 1     |
| `modules/content/components/admin/faq-section-form.tsx`      | Formulaire FAQ              | 1     |
| `app/admin/contenu/homepage/page.tsx`                        | Page admin                  | 1     |
| `app/admin/contenu/homepage/layout.tsx`                      | Layout/metadata             | 1     |
| `modules/content/components/admin/atelier-form.tsx`          | Formulaire Atelier          | 2     |

### A modifier

| Fichier                                                                     | Modification                                      | Phase |
| --------------------------------------------------------------------------- | ------------------------------------------------- | ----- |
| `prisma/schema.prisma`                                                      | Ajouter modele `HomepageSection`                  | 1     |
| `modules/content/constants/cache.ts`                                        | Ajouter tags + helpers homepage                   | 1     |
| `modules/content/types/content.types.ts`                                    | Ajouter types homepage                            | 1     |
| `app/admin/contenu/page.tsx`                                                | Ajouter lien "Page d'accueil", passer columns a 3 | 1     |
| `app/(boutique)/(accueil)/page.tsx`                                         | Fetch contenu sections, passer en props           | 1     |
| `app/(boutique)/(accueil)/_components/hero-section.tsx`                     | Accepter `contentPromise` prop                    | 1     |
| `app/(boutique)/(accueil)/_components/latest-creations.tsx`                 | Accepter `content` prop                           | 1     |
| `app/(boutique)/(accueil)/_components/collections-section.tsx`              | Accepter `content` prop                           | 1     |
| `app/(boutique)/(accueil)/_components/reviews-section.tsx`                  | Accepter `content` prop                           | 1     |
| `modules/content/components/faq-section.tsx`                                | Accepter `content` prop                           | 1     |
| `prisma/seed.ts`                                                            | Ajouter seed homepage sections                    | 1     |
| `app/api/uploadthing/core.ts`                                               | Ajouter route `atelierMedia`                      | 2     |
| `app/(boutique)/(accueil)/_components/atelier-section/atelier-section.tsx`  | Fetch contenu DB, HowTo JSON-LD dynamique         | 2     |
| `app/(boutique)/(accueil)/_components/atelier-section/process-steps.ts`     | Split config visuelle / contenu DB                | 2     |
| `app/(boutique)/(accueil)/_components/atelier-section/polaroid-gallery.tsx` | Accepter `polaroids` prop, `next/image`           | 2     |
| `app/(boutique)/(accueil)/_components/atelier-section/signature-reveal.tsx` | Accepter `signatureName` prop                     | 2     |
