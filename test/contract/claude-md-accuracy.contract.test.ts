/**
 * @regression claude-md-accuracy
 *
 * `CLAUDE.md` est rechargé INTÉGRALEMENT à chaque session : c'est le document le plus
 * lu du dépôt, et le seul dont aucune affirmation n'était vérifiée. Le repo verrouille
 * chaque invariant par un test, mais pas la doc qui les décrit — et c'est exactement là
 * que la dérive s'installe.
 *
 * L'audit du 2026-08-04 y a trouvé 8 dérives, dont une DANGEREUSE : le fichier
 * autorisait explicitement `asChild` dans `mega-menu-column.tsx` (« `asChild` **là** est
 * correct ») alors que ce fichier était passé à `render` et que
 * `@radix-ui/react-navigation-menu` n'était plus installé. Une instruction qui fait
 * RÉINTRODUIRE la régression qu'elle prétend documenter est pire qu'une absence de
 * documentation.
 *
 * Les autres : `52 CHECK / 14 index` (réel 32/8), « 247 fichiers », « 50 pages admin »,
 * les 6 ancres `fichier:ligne` de la table Conformité toutes périmées, `app/api/search`
 * inexistant, `pnpm prisma migrate dev` recommandé puis déclaré cassé 600 lignes plus
 * bas, et un exemple de `down.sql` pointant sur une migration archivée.
 *
 * Ce que ce test verrouille :
 *   1. tout chemin de fichier cité existe ;
 *   2. tout lien markdown `[x](cible.md)` résout, relativement au document qui l'écrit ;
 *   3. toute SECTION citée existe sous ce titre dans le document visé ;
 *   4. aucune ancre `fichier.ts:12-34` (elles dérivent à la première édition) ;
 *   5. les comptages annoncés correspondent au dépôt ;
 *   6. toute commande `pnpm <x>` citée existe dans `package.json`.
 *
 * Le périmètre a été étendu le 2026-08-05 de `CLAUDE.md` seul à la CHAÎNE DESIGN
 * (`docs/UI-CONVENTIONS.md` + les prompts collables). Motif : `REDESIGN-PROMPT.md`
 * envoyait lire « les sections Breakpoints / Overlays / Survol vs focus de `CLAUDE.md` »
 * alors que ces sections venaient d'être extraites dans `docs/UI-CONVENTIONS.md` — le
 * CHEMIN existait toujours, c'est le TITRE qui avait disparu, et aucune assertion ne
 * regardait les titres. D'où le point 3, qui est le seul à attraper ce cas.
 * Le point 2 vient du même audit : un lien vers un fichier voisin (`](AUDIT-PROMPTS.md)`)
 * n'a pas de `/`, donc l'extracteur de chemins du point 1 ne le voit pas.
 *
 * ⚠️ Ne JAMAIS corriger un échec en élargissant l'allowlist sans motif écrit : c'est le
 * seul filet sur ces fichiers. Le réflexe correct est de mettre le DOCUMENT à jour.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");
const CLAUDE_MD = join(REPO_ROOT, "CLAUDE.md");
const src = readFileSync(CLAUDE_MD, "utf-8");

/**
 * Les documents sous contrat. `minCited` est le garde-fou du garde-fou : si une refonte
 * du format cassait l'extraction, les assertions passeraient sur une liste vide en
 * donnant une fausse assurance.
 *
 * Volontairement PAS étendu à `prompts-audit-synclune.md` (3 550 l.) ni à son voisin de
 * missions : les y soumettre remonterait un backlog de chemins morts d'un coup, ce qui
 * bloquerait `pnpm validate` pour une dette qui n'est pas celle de cette passe.
 */
const CONTRACTED_DOCS: ReadonlyArray<{ path: string; minCited: number }> = [
	{ path: "CLAUDE.md", minCited: 40 },
	{ path: "docs/UI-CONVENTIONS.md", minCited: 5 },
	// La grille d'audit de la landing (§ 9) ne vaut que si ses ancrages tiennent : chaque
	// ligne renvoie à un test ou à un fichier, et un renvoi mort transforme un critère
	// vérifiable en intention. Ajouté le 2026-08-06, en même temps que le document est
	// devenu citable — il vivait jusque-là hors git, sans aucune référence entrante.
	{ path: "docs/LANDING-BEST-PRACTICES.md", minCited: 15 },
	{ path: "docs/prompts/REDESIGN-PROMPT.md", minCited: 5 },
	{ path: "docs/prompts/DESIGN-ARTIFACT-PROMPT.md", minCited: 5 },
	// Le wrapper `/design-artifact` ne contient RIEN d'autre que des renvois : si le chemin
	// du prompt SSOT qu'il charge se casse, la commande exécute du vide en silence — c'est
	// tout son mode de panne, donc tout son contrat.
	{ path: ".claude/commands/design-artifact.md", minCited: 2 },
	// Ajouté le 2026-08-06, à l'audit du document. Il ne prescrit QUE par référence — chaque
	// règle nomme sa constante, son service ou son test — donc un chemin mort n'y est pas une
	// coquille : c'est une prescription qui ne s'applique plus à rien, et rien d'autre ne le
	// dirait. Le document était orphelin (aucune référence entrante, aucun test) alors que ses
	// chemins résolvaient déjà tous : l'entrée ne corrige pas une dette, elle empêche d'en
	// créer une.
	{ path: "docs/COLLECTION-CARD.md", minCited: 12 },
];

/**
 * Les SECTIONS citées d'un document à l'autre. Tenue à la main, comme `PATH_ALLOWLIST` :
 * une extraction automatique des noms de section en prose produirait trop de bruit pour
 * rester crédible. Chaque entrée est une promesse faite au lecteur d'un prompt.
 */
const DOC_SECTION_REFERENCES: ReadonlyArray<{
	citedIn: string;
	file: string;
	heading: string;
}> = [
	// `REDESIGN-PROMPT.md` §1 et sa liste des « 5 points » renvoient nommément ici.
	{ citedIn: "REDESIGN-PROMPT", file: "docs/UI-CONVENTIONS.md", heading: "Breakpoints" },
	{ citedIn: "REDESIGN-PROMPT", file: "docs/UI-CONVENTIONS.md", heading: "Largeurs de contenu" },
	{ citedIn: "REDESIGN-PROMPT", file: "docs/UI-CONVENTIONS.md", heading: "Survol vs focus" },
	{ citedIn: "REDESIGN-PROMPT", file: "docs/UI-CONVENTIONS.md", heading: "Overlays" },
	{ citedIn: "REDESIGN-PROMPT", file: "docs/UI-CONVENTIONS.md", heading: "Composition" },
	{ citedIn: "REDESIGN-PROMPT", file: "docs/UI-CONVENTIONS.md", heading: "animate-out" },
	{ citedIn: "REDESIGN-PROMPT", file: "CLAUDE.md", heading: "Voix" },
	// `REDESIGN-PROMPT.md` §1 adosse son brief de marque à la même SSOT que son voisin —
	// l'entrée n'existait que pour DESIGN-ARTIFACT, trou relevé par l'audit du 2026-08-05.
	{ citedIn: "REDESIGN-PROMPT", file: "docs/BUSINESS.md", heading: "Positionnement" },
	// `DESIGN-ARTIFACT-PROMPT.md` §3 renvoie aux mêmes sections extraites : il portait le
	// défaut du 2026-08-05 (envoyer lire « Breakpoints » dans `CLAUDE.md`, qui n'en garde
	// que dix puces) trois jours de plus que son voisin, faute d'être couvert ici.
	{ citedIn: "DESIGN-ARTIFACT-PROMPT", file: "docs/UI-CONVENTIONS.md", heading: "Breakpoints" },
	{
		citedIn: "DESIGN-ARTIFACT-PROMPT",
		file: "docs/UI-CONVENTIONS.md",
		heading: "Largeurs de contenu",
	},
	{ citedIn: "DESIGN-ARTIFACT-PROMPT", file: "docs/UI-CONVENTIONS.md", heading: "Survol vs focus" },
	{ citedIn: "DESIGN-ARTIFACT-PROMPT", file: "docs/UI-CONVENTIONS.md", heading: "Overlays" },
	{ citedIn: "DESIGN-ARTIFACT-PROMPT", file: "docs/UI-CONVENTIONS.md", heading: "Composition" },
	{ citedIn: "DESIGN-ARTIFACT-PROMPT", file: "docs/UI-CONVENTIONS.md", heading: "animate-out" },
	{ citedIn: "DESIGN-ARTIFACT-PROMPT", file: "CLAUDE.md", heading: "Voix" },
	// Le brief de marque du §1 est adossé à cette section — c'est la SSOT du « colorés, PAS
	// joaillerie précieuse », l'erreur de brief la plus coûteuse du projet.
	{ citedIn: "DESIGN-ARTIFACT-PROMPT", file: "docs/BUSINESS.md", heading: "Positionnement" },
	// Le §1 adosse motifs identitaires, noyau lexical et registre de copie au lexique DA
	// ajouté le 2026-08-06 — sans cette entrée, renommer la section casserait le renvoi
	// en silence (le défaut du 2026-08-05 : le chemin existait, la section avait déménagé).
	{ citedIn: "DESIGN-ARTIFACT-PROMPT", file: "CLAUDE.md", heading: "Direction artistique" },
];

/* -------------------------------------------------------------------------- */
/* Extraction                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Chemins non résolvables, avec leur motif. Chaque entrée est un chemin CITÉ
 * délibérément sous une forme qui n'existe pas sur le disque.
 */
const PATH_ALLOWLIST: ReadonlyArray<{ pattern: RegExp; why: string }> = [
	{
		pattern: /\*/,
		why: "glob volontaire (ex. `app/admin/**/page.tsx`, `test/fixtures/stripe/*.json`)",
	},
	{ pattern: /[<>]/, why: "placeholder (ex. `app/api/cron/<job>/route.ts`)" },
	{ pattern: /^node_modules\//, why: "extrait de code Next cité pour documenter son comportement" },
	{
		pattern: /^e2e\/\.auth\//,
		why: "artefact GÉNÉRÉ par le projet Playwright `setup` (`e2e/auth.setup.ts`) et gitignoré (`.gitignore:19`) — il n'existe qu'après un run, mais le citer est correct : c'est ainsi qu'on explique d'où vient l'état admin",
	},
];

/**
 * Un chemin cité peut être relatif à `modules/` : la table des services
 * transactionnels écrit `payments/services/x.service.ts` sans le préfixe, parce que la
 * section entière parle de `modules/`. On tente donc les deux racines.
 */
const IMPLICIT_ROOTS = ["", "modules/"] as const;

function citedPaths(markdown: string): string[] {
	const found = new Set<string>();
	for (const match of markdown.matchAll(/`([^`\n]+)`/g)) {
		const raw = match[1]!.trim();
		// `@see docs/X.md` : la citation porte un préfixe, on garde le dernier mot.
		const candidate = raw.split(/\s+/).pop() ?? raw;
		if (!candidate.includes("/")) continue;
		if (!/\.(ts|tsx|sql|json|css|md|toml)$/.test(candidate)) continue;
		found.add(candidate);
	}
	return [...found];
}

function resolves(path: string): boolean {
	return IMPLICIT_ROOTS.some((root) => existsSync(join(REPO_ROOT, root + path)));
}

function allowlistReason(path: string): string | undefined {
	return PATH_ALLOWLIST.find(({ pattern }) => pattern.test(path))?.why;
}

/* -------------------------------------------------------------------------- */
/* 1. Chemins                                                                  */
/* -------------------------------------------------------------------------- */

describe.each(CONTRACTED_DOCS)("$path — les chemins cités existent", ({ path, minCited }) => {
	const doc = readFileSync(join(REPO_ROOT, path), "utf-8");

	it("ne cite aucun fichier absent du dépôt", () => {
		const broken = citedPaths(doc)
			.filter((p) => !allowlistReason(p))
			.filter((p) => !resolves(p));

		expect(
			broken,
			`${path} cite ${broken.length} chemin(s) qui n'existe(nt) pas. ` +
				"Corriger le document — ne pas ajouter d'entrée à PATH_ALLOWLIST sans motif écrit.",
		).toEqual([]);
	});

	it("cite un nombre plausible de chemins (l'extracteur n'est pas devenu aveugle)", () => {
		// Garde-fou du garde-fou : si une refonte du format cassait la regex, le test
		// ci-dessus passerait sur une liste vide en donnant une fausse assurance.
		expect(citedPaths(doc).length).toBeGreaterThan(minCited);
	});

	it("ne pointe aucun lien markdown mort", () => {
		// Un lien vers un fichier VOISIN (`](AUDIT-PROMPTS.md)`) n'a pas de `/` : il est
		// invisible à `citedPaths`. C'est pourtant la forme la plus fragile, parce qu'un
		// déplacement de dossier la casse sans toucher au texte.
		const dir = dirname(join(REPO_ROOT, path));
		const broken = [...doc.matchAll(/\]\(([^)#][^)]*)\)/g)]
			.map((m) => m[1]!.split("#")[0]!)
			.filter((target) => target && !/^https?:/.test(target))
			.filter((target) => !existsSync(resolve(dir, target)));

		expect(
			[...new Set(broken)],
			`${path} contient un ou plusieurs liens vers un fichier qui n'existe plus.`,
		).toEqual([]);
	});
});

/* -------------------------------------------------------------------------- */
/* 1bis. Sections citées                                                       */
/* -------------------------------------------------------------------------- */

describe("Chaîne design — les SECTIONS citées existent sous ce titre", () => {
	it.each(DOC_SECTION_REFERENCES)(
		"$citedIn renvoie à $file § $heading",
		({ file, heading, citedIn }) => {
			const target = readFileSync(join(REPO_ROOT, file), "utf-8");
			const headings = [...target.matchAll(/^#{2,}\s+(.*)$/gm)].map((m) => m[1]!);

			expect(
				headings.some((h) => h.includes(heading)),
				`${citedIn} envoie lire « ${heading} » dans ${file}, qui n'a aucune section de ce nom.\n` +
					`Titres présents :\n  ${headings.join("\n  ")}\n` +
					"C'est le défaut du 2026-08-05 : le chemin existait, la section avait déménagé.",
			).toBe(true);
		},
	);
});

/* -------------------------------------------------------------------------- */
/* 2. Ancres fichier:ligne                                                     */
/* -------------------------------------------------------------------------- */

describe("CLAUDE.md — pas d'ancre `fichier:ligne`", () => {
	it("ne référence aucun numéro de ligne", () => {
		// Les 6 ancres de la table « Conformité réglementaire » avaient TOUTES dérivé :
		// l'ancre Art. 293 B tombait sur un commentaire. Un numéro de ligne est faux dès
		// la première édition du fichier cible, et rien ne le signale.
		const anchors = Array.from(
			src.matchAll(/`?([A-Za-z0-9._/-]+\.tsx?):(\d+)(?:-(\d+))?/g),
			(m) => m[0],
		);

		expect(
			anchors,
			"Citer le chemin seul. Un `fichier.ts:50-140` est faux dès la prochaine édition.",
		).toEqual([]);
	});
});

/* -------------------------------------------------------------------------- */
/* 3. Comptages                                                                */
/* -------------------------------------------------------------------------- */

function countMatches(path: string, re: RegExp): number {
	return (readFileSync(join(REPO_ROOT, path), "utf-8").match(re) ?? []).length;
}

/** Extrait l'entier annoncé par la 1ʳᵉ ligne de CLAUDE.md qui matche `re`. */
function claimedNumber(re: RegExp): number {
	const match = src.match(re);
	expect(match, `CLAUDE.md ne contient plus la phrase attendue : ${re}`).not.toBeNull();
	return Number(match![1]);
}

describe("CLAUDE.md — les comptages correspondent au dépôt", () => {
	it("annonce le bon nombre de modules", () => {
		const real = readdirSync(join(REPO_ROOT, "modules"), { withFileTypes: true }).filter((e) =>
			e.isDirectory(),
		).length;
		expect(claimedNumber(/DDD - (\d+) modules/)).toBe(real);
	});

	it("annonce le bon nombre de templates email", () => {
		const real = readdirSync(join(REPO_ROOT, "emails")).filter((f) => f.endsWith(".tsx")).length;
		expect(claimedNumber(/^(\d+) templates React Email/m)).toBe(real);
	});

	it("annonce le bon nombre de crons Vercel", () => {
		const vercel = JSON.parse(readFileSync(join(REPO_ROOT, "vercel.json"), "utf-8")) as {
			crons?: unknown[];
		};
		expect(claimedNumber(/\*\*(\d+) Vercel cron jobs\*\*/)).toBe(vercel.crons?.length ?? 0);
	});

	it("annonce le bon nombre de CHECK et d'index dans l'annexe des gardes bruts", () => {
		// C'est la dérive la plus coûteuse : l'annexe de `0_init` est la seule chose qui
		// protège le format de numéro de facture (Art. 286 CGI) et le trigger d'unicité
		// des avoirs. Un comptage faux laisse croire que la copie est complète.
		const checks = countMatches(
			"prisma/sql/raw-guards.sql",
			/ADD\s+CONSTRAINT\s+"[^"]+"\s+CHECK/gi,
		);
		const indexes = countMatches("prisma/sql/raw-guards.sql", /^\s*CREATE\s+(UNIQUE\s+)?INDEX/gim);

		expect(claimedNumber(/raw-guards\.sql` : (\d+) CHECK/)).toBe(checks);
		expect(claimedNumber(/raw-guards\.sql` : \d+ CHECK, (\d+) index/)).toBe(indexes);
	});

	it("annonce le bon nombre de profils cacheLife", () => {
		const config = readFileSync(join(REPO_ROOT, "next.config.ts"), "utf-8");
		const profiles = new Set(Array.from(config.matchAll(/^\t*(\w+): \{ stale: /gm), (m) => m[1]!));
		expect(claimedNumber(/\*\*(\d+) cache profiles\*\*/)).toBe(profiles.size);
	});
});

/* -------------------------------------------------------------------------- */
/* 3bis. Comptages de la chaîne design                                         */
/* -------------------------------------------------------------------------- */

const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	".next",
	".claude",
	"coverage",
	"playwright-report",
	"test-results",
	"dist",
	".turbo",
]);

/** Fichiers de test portant un `@regression`, à l'exclusion des copies de `.claude/worktrees/`. */
function countRegressionTestFiles(dir: string = REPO_ROOT): number {
	let total = 0;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (SKIP_DIRS.has(entry.name)) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) total += countRegressionTestFiles(full);
		else if (
			/\.test\.tsx?$/.test(entry.name) &&
			readFileSync(full, "utf-8").includes("@regression")
		)
			total++;
	}
	return total;
}

/**
 * Les assertions de comptage ci-dessus ne regardaient que `CLAUDE.md` — et c'est très
 * exactement par ce trou que le nombre de fichiers `@regression` de
 * `DESIGN-ARTIFACT-PROMPT.md` §3 est resté faux DEUX passes de suite : 339, puis 338 après
 * une remédiation, pour un réel de 303. Personne ne le re-mesurait ; il était décrémenté à
 * vue, ce qui donne à un nombre inventé l'apparence d'un fait entretenu — le pire des deux
 * mondes, puisque le prompt s'en sert pour asseoir sa crédibilité factuelle.
 *
 * Tolérance de 10 % assumée, et cohérente avec le texte du prompt, qui dit lui-même « ne le
 * crois pas au fichier près » : ce compte bouge à chaque test ajouté. On vise la dérive
 * INSTALLÉE, pas le fichier près. L'écart 338 → 303 valait 11,6 % : il tombe.
 */
describe("Chaîne design — les comptages annoncés correspondent au dépôt", () => {
	// REDESIGN-PROMPT a rejoint la liste le 2026-08-05 : son « ~330 fichiers » n'était
	// assert par rien et valait 342 au moment de l'audit — même mécanique de dérive à vue.
	it.each(["docs/prompts/DESIGN-ARTIFACT-PROMPT.md", "docs/prompts/REDESIGN-PROMPT.md"])(
		"%s annonce un nombre de fichiers `@regression` plausible",
		(docPath) => {
			const doc = readFileSync(join(REPO_ROOT, docPath), "utf-8");
			const match = doc.match(/\*\*(\d+) fichiers\s+de test\*\*/);

			expect(
				match,
				`${docPath} ne contient plus la phrase « **N fichiers de test** ». ` +
					"Si la formulation a changé, mets ce regex à jour plutôt que de retirer l'assertion.",
			).not.toBeNull();

			const claimed = Number(match![1]);
			const real = countRegressionTestFiles();
			const drift = Math.abs(claimed - real) / real;

			expect(
				drift,
				`${docPath} annonce ${claimed} fichiers \`@regression\`, le dépôt en a ${real} ` +
					`(${(drift * 100).toFixed(1)} % d'écart).\n` +
					"Re-mesure, ne décrémente pas à vue :\n" +
					'  grep -rl "@regression" --include="*.test.ts" --include="*.test.tsx" . \\\n' +
					"    --exclude-dir=node_modules --exclude-dir=.claude | wc -l",
			).toBeLessThanOrEqual(0.1);
		},
	);
});

/* -------------------------------------------------------------------------- */
/* 3ter. La liste de refus — le §8 de DESIGN-ARTIFACT est le sur-ensemble      */
/* -------------------------------------------------------------------------- */

/**
 * Le §8 de `DESIGN-ARTIFACT-PROMPT.md` se déclare « sur-ensemble » des refus déjà
 * exprimés, et `REDESIGN-PROMPT.md` écrit « La liste fait foi dans
 * DESIGN-ARTIFACT-PROMPT.md §8 ». Cette promesse a cassé TROIS fois (2026-08-04 ×2,
 * 2026-08-05 : ~9 refus de `memory/` absents), toujours par le même mécanisme :
 * liste tenue à la main, rien ne la re-vérifie.
 *
 * `memory/` vit HORS du dépôt (répertoire utilisateur, non versionné) : la synchro
 * memory → §8 reste manuelle par construction. Ce qu'on PEUT verrouiller, c'est le
 * cliquet interne au dépôt :
 *   1. chaque marqueur canonique figure au §8 — retirer un refus du §8 échoue ;
 *   2. chaque item des DEUX listes est couvert par un marqueur — ajouter un refus
 *      dans l'une sans l'inscrire ici (donc sans se poser la question de l'autre)
 *      échoue aussi.
 * Ajouter un refus = 1 item au §8 + 1 entrée REFUSAL_MARKERS (+ l'item REDESIGN
 * s'il concerne l'implémentation, avec `inRedesign: true`).
 */
const REFUSAL_MARKERS: ReadonlyArray<{ marker: string; inRedesign: boolean }> = [
	{ marker: "View Transition", inRedesign: true },
	{ marker: "useMotionAllowed", inRedesign: true },
	{ marker: "micro-animation sans fonction", inRedesign: true },
	{ marker: "pour une confirmation", inRedesign: true },
	{ marker: "handleOnly", inRedesign: true },
	{ marker: "curseur qui suit", inRedesign: true },
	{ marker: "chevron de scroll", inRedesign: true },
	{ marker: "CTA sticky", inRedesign: true },
	{ marker: "réassurance", inRedesign: true },
	{ marker: "troisième entrée", inRedesign: true },
	{ marker: "double bouton retour", inRedesign: true },
	{ marker: "Cancel", inRedesign: true },
	{ marker: "autoFocus", inRedesign: true },
	{ marker: "KI-002", inRedesign: true },
	{ marker: "Haptique", inRedesign: true },
	// Refus portés par le seul sur-ensemble §8 (pas dans l'extrait REDESIGN).
	{ marker: "drill-down", inRedesign: false },
	{ marker: "PWA", inRedesign: false },
	{ marker: "ParticleBackground", inRedesign: false },
	{ marker: "PILULES", inRedesign: false },
	{ marker: "bg-muted", inRedesign: false },
	{ marker: "cue tactile", inRedesign: false },
	{ marker: "fait main", inRedesign: false },
	{ marker: "délais de préparation", inRedesign: false },
	{ marker: "case à cocher CGV", inRedesign: false },
	{ marker: "toast à l'ajout au panier", inRedesign: false },
	{ marker: "spotlight", inRedesign: false },
	{ marker: "téléphone", inRedesign: false },
];

/**
 * Items de la liste « Déjà proposé et refusé », un fragment par refus. Les deux
 * documents closent leur liste par le paragraphe « Et une préférence » — c'est le
 * terminateur. Le point médian est le séparateur d'items ; celui qui est CITÉ
 * (« · fait main », précédé d'un guillemet ouvrant) n'en est pas un.
 */
function refusalItems(path: string): string[] {
	const doc = readFileSync(join(REPO_ROOT, path), "utf-8");
	const start = doc.indexOf("Déjà proposé et refusé sur ce projet");
	expect(
		start,
		`${path} : la liste « Déjà proposé et refusé » a disparu ou a été renommée`,
	).toBeGreaterThanOrEqual(0);
	const end = doc.indexOf("Et une préférence", start);
	expect(
		end,
		`${path} : le paragraphe « Et une préférence » qui clôt la liste a disparu`,
	).toBeGreaterThan(start);

	const bullets: string[] = [];
	for (const line of doc.slice(start, end).split("\n")) {
		if (/^- /.test(line)) bullets.push(line.slice(2));
		else if (/^ {2}\S/.test(line) && bullets.length > 0)
			bullets[bullets.length - 1] += ` ${line.trim()}`;
	}
	return bullets
		.flatMap((b) => b.split(/(?<!«\s)·/))
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

describe("Chaîne design — la liste de refus reste un sur-ensemble cohérent", () => {
	const dapItems = refusalItems("docs/prompts/DESIGN-ARTIFACT-PROMPT.md");
	const redesignItems = refusalItems("docs/prompts/REDESIGN-PROMPT.md");
	const dapText = dapItems.join(" · ");
	const redesignText = redesignItems.join(" · ");

	it("chaque marqueur canonique figure au §8 de DESIGN-ARTIFACT-PROMPT", () => {
		const missing = REFUSAL_MARKERS.filter(({ marker }) => !dapText.includes(marker));
		expect(
			missing.map((m) => m.marker),
			"Refus retiré du §8 alors qu'il reste canonique. Si le refus a été LEVÉ par " +
				"l'utilisateur, retire aussi son marqueur ici, avec le motif en commentaire.",
		).toEqual([]);
	});

	it("chaque marqueur `inRedesign` figure dans la liste de REDESIGN-PROMPT", () => {
		const missing = REFUSAL_MARKERS.filter(
			({ marker, inRedesign }) => inRedesign && !redesignText.includes(marker),
		);
		expect(missing.map((m) => m.marker)).toEqual([]);
	});

	it.each([
		{ path: "docs/prompts/DESIGN-ARTIFACT-PROMPT.md", items: dapItems },
		{ path: "docs/prompts/REDESIGN-PROMPT.md", items: redesignItems },
	])("$path : chaque item de la liste est couvert par un marqueur canonique", ({ items }) => {
		const uncovered = items.filter(
			(item) => !REFUSAL_MARKERS.some(({ marker }) => item.includes(marker)),
		);
		expect(
			uncovered,
			"Refus ajouté à une liste sans entrée REFUSAL_MARKERS : l'autre document peut " +
				"diverger en silence. Ajoute le marqueur (et l'item au §8 si ce n'est pas déjà fait).",
		).toEqual([]);
	});
});

/* -------------------------------------------------------------------------- */
/* 4. Commandes                                                                */
/* -------------------------------------------------------------------------- */

describe("CLAUDE.md — les commandes citées existent", () => {
	it("ne cite aucun script pnpm absent de package.json", () => {
		const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf-8")) as {
			scripts: Record<string, string>;
		};
		const scripts = new Set(Object.keys(pkg.scripts));

		// Le bloc ```bash de la section Commands. On ne scanne QUE lui : le reste du
		// document cite des invocations en prose (`pnpm prisma migrate resolve …`) qui
		// sont des commandes Prisma passthrough, pas des scripts npm.
		const block = src.match(/## Commands\n[\s\S]*?```bash\n([\s\S]*?)```/);
		expect(block, "La section Commands n'a plus de bloc bash").not.toBeNull();

		const unknown = Array.from(block![1]!.matchAll(/^pnpm ([\w:]+)/gm), (m) => m[1]!)
			.filter((name) => !scripts.has(name))
			// `pnpm test <chemin>` et `pnpm prisma …` : `test` et `prisma` sont couverts
			// par le Set ou sont le binaire Prisma lui-même.
			.filter((name) => name !== "prisma");

		expect(
			unknown,
			"Script(s) cité(s) dans § Commands mais absent(s) de package.json. " +
				"C'est ainsi que `pnpm prisma migrate dev` est resté recommandé alors " +
				"que le même document le déclarait cassé (P3006).",
		).toEqual([]);
	});
});
