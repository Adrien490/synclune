/**
 * @regression brand-lexicon
 *
 * Garde le LEXIQUE de `docs/BRAND-DA.md` sur la copie de marque.
 *
 * ⚠️ Ce contrat traite une CLASSE de dérive, pas des instances. L'audit de
 * conformité DA de la landing (2026-08-06) a trouvé la même faute dans six
 * chaînes d'un coup, toutes invisibles à l'œil parce qu'elles ne s'affichent
 * nulle part dans l'interface — elles vivent dans les `<meta>`, dans les nœuds
 * `LocalBusiness` / `Organization` du `@graph`, dans l'onglet du navigateur et
 * dans chaque partage :
 *
 *  - `HOME_DESCRIPTION` disait « bijoux colorés et **poétiques** » — la formule
 *    que `BRAND-DA.md` § ADN cite explicitement comme *juste mais
 *    interchangeable* (n'importe quelle boutique de bijoux peut la signer) ;
 *  - `BUSINESS_INFO.description` disait « faits main **avec amour** […] pour le
 *    quotidien et les **occasions spéciales** » — le second tire vers la
 *    cérémonie, un des mots de la § « Les mots à NE PAS mettre au centre » ;
 *  - `BRAND.tagline` / `BRAND.description` portaient « faites avec amour » et
 *    « pour occasions particulières » **sans aucun consommateur**, dans le
 *    fichier que `CLAUDE.md` désigne comme SSOT d'identité — donc à l'endroit
 *    exact d'où la prochaine copie off-brand aurait été recopiée.
 *
 * Rien ne voyait ce trou : ni `tsc` (ce sont des chaînes valides), ni knip (les
 * unes sont consommées, les autres étaient mortes mais dans un objet vivant),
 * ni un test de rendu (aucune n'atteint le DOM visible).
 *
 * ── Deux surfaces, deux sévérités ────────────────────────────────────────────
 *
 * **Identité** (`brand.ts`, les trois schémas JSON-LD, les metadata de la home)
 * — la marque s'y DÉCRIT. Interdits : les mots bannis de la DA **et** les
 * formules passe-partout que cet audit a retirées.
 *
 * **Éditorial** (contenu atelier, réponses FAQ) — Léane y PARLE, à la première
 * personne. Seuls les mots bannis de la DA s'y appliquent : « avec amour » y
 * est légitime (l'étape 4 de l'atelier glisse le bijou dans sa pochette « avec
 * amour »), parce que c'est un geste raconté, pas un positionnement de marque.
 * Confondre les deux ferait échouer le test sur de la bonne copie.
 *
 * ── Ajouter une surface ──────────────────────────────────────────────────────
 * Toute nouvelle SSOT de copie de marque se déclare dans `IDENTITY_SURFACES` ou
 * `EDITORIAL_SURFACES`. Les surfaces sont scannées par leurs VALEURS (import +
 * parcours récursif), jamais par le texte brut du fichier : les commentaires de
 * ce dépôt citent abondamment les mots bannis pour expliquer pourquoi ils le
 * sont — un scan textuel se faux-positiverait sur sa propre documentation.
 * `page.tsx` est la seule exception (son import tirerait Prisma et la moitié du
 * catalogue) : il est lu en texte, commentaires RETIRÉS d'abord.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ATELIER_HOWTO, ATELIER_STEPS } from "@/shared/constants/atelier-content";
import { BRAND } from "@/shared/constants/brand";
import {
	BUSINESS_INFO,
	getFounderSchema,
	getLocalBusinessSchema,
	getOrganizationSchema,
} from "@/shared/constants/seo-config";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

/**
 * `docs/BRAND-DA.md` § Les mots à NE PAS mettre au centre — en PARITÉ verrouillée
 * avec le document (assertion dédiée plus bas), pas recopié à vue : l'ancienne
 * copie se disait « verbatim » alors qu'il lui manquait cinq termes du doc
 * (discret, classique, neutre, monochrome, cérémonie), et rien ne le re-vérifiait.
 *
 * Le document est explicite sur la nuance : ces termes « peuvent décrire une
 * pièce isolée, mais brouillent l'identité dès qu'ils deviennent le cœur du
 * discours ». Les surfaces scannées ici sont précisément le cœur du discours —
 * une fiche produit, elle, n'est pas concernée.
 *
 * Deux élargissements assumés, plus larges que le doc (dits dans le doc lui-même) :
 *  - « luxe froid » → `luxe`, borné par la frontière de mot : « luxuriant » est au
 *    contraire un mot-clé POSITIF de la DA (§ A, le jardin fantastique) ;
 *  - « joaillerie fine » → `joaillerie` (CLAUDE.md écarte la joaillerie tout court).
 * `epuré` (sans accent) couvre la faute de frappe la plus probable sur `épuré`.
 */
const DA_BANNED_TERMS = [
	"minimaliste",
	"sobre",
	"discret",
	"intemporel",
	"quiet luxury",
	"classique",
	"épuré",
	"epuré",
	"neutre",
	"monochrome",
	"joaillerie",
	"luxe",
	"cérémonie",
	"mariage chic",
	"pierre précieuse",
	"pierres précieuses",
	"premium",
	"prestige",
	"sophistication silencieuse",
	"élégance conventionnelle",
] as const;

/**
 * Les formules passe-partout retirées par l'audit du 2026-08-06.
 *
 * Elles ne sont pas « interdites » par la DA — elles sont *interchangeables*,
 * ce qui est le reproche central du § ADN : « n'importe quelle boutique de
 * bijoux peut la signer ». Une identité qui les reprend n'est pas fausse, elle
 * ne dit rien. Le noyau lexical à leur substituer est **couleur + goutte +
 * récit + fait main + miniature + Nantes**, et les deux formulations de
 * référence (longue et courte) sont dans le même document.
 */
const INTERCHANGEABLE_FORMULAS = [
	"avec amour",
	"avec passion",
	"colorés et poétiques",
	"occasions spéciales",
	"occasions particulières",
] as const;

/** Parcours récursif : ne retient que les chaînes, ignore les `ReactNode`. */
function collectStrings(value: unknown, out: string[] = []): string[] {
	if (typeof value === "string") {
		out.push(value);
		return out;
	}
	if (Array.isArray(value)) {
		for (const item of value) collectStrings(item, out);
		return out;
	}
	// `null` est un objet ; un ReactNode n'est pas parcouru — une SSOT de copie
	// qui en porte doit exposer un décalque TEXTE à scanner à côté (c'est ce que
	// faisait `answerText` de la FAQ, retirée le 2026-08-08).
	if (value && typeof value === "object" && !("$$typeof" in value)) {
		for (const item of Object.values(value)) collectStrings(item, out);
	}
	return out;
}

/**
 * Retire les commentaires d'un source TS avant de le scanner.
 *
 * ⚠️ Indispensable : les commentaires de `page.tsx` CITENT « poétiques » et
 * « occasions spéciales » pour expliquer pourquoi ces mots en sont partis. Le
 * `[^:]` devant `//` épargne les protocoles d'URL (`https://`).
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * ⚠️ Pas de `\b` : il est ASCII (`é` n'y est pas un caractère de mot), donc un terme
 * qui COMMENCE ou FINIT par une lettre accentuée — « épuré », « élégance
 * conventionnelle » — ne matchait JAMAIS ; les deux étaient du poids mort depuis
 * l'écriture du test (constaté le 2026-08-08). Les lookarounds Unicode font le même
 * travail de frontière de mot, accents compris.
 */
function findTerms(haystack: string, terms: readonly string[]): string[] {
	const lowered = haystack.toLowerCase();
	return terms.filter((term) =>
		new RegExp(`(?<![\\p{L}\\p{N}_])${term.toLowerCase()}(?![\\p{L}\\p{N}_])`, "u").test(lowered),
	);
}

const HOME_PAGE_PATH = join(REPO_ROOT, "app", "(shop)", "(home)", "page.tsx");
const ROOT_METADATA_PATH = join(REPO_ROOT, "shared", "constants", "root-metadata.ts");

const IDENTITY_SURFACES: { label: string; strings: string[] }[] = [
	{ label: "shared/constants/brand.ts", strings: collectStrings(BRAND) },
	{ label: "BUSINESS_INFO", strings: collectStrings(BUSINESS_INFO) },
	{ label: "getLocalBusinessSchema()", strings: collectStrings(getLocalBusinessSchema()) },
	{ label: "getOrganizationSchema()", strings: collectStrings(getOrganizationSchema()) },
	{ label: "getFounderSchema()", strings: collectStrings(getFounderSchema()) },
	{
		label: "app/(shop)/(home)/page.tsx (metadata)",
		strings: [stripComments(readFileSync(HOME_PAGE_PATH, "utf8"))],
	},
	/*
	 * ⚠️ Ajouté le 2026-08-06, et c'est la surface qui MANQUAIT.
	 *
	 * `root-metadata.ts` n'était scannée par rien, et elle a donc gardé
	 * « Bijoux artisanaux faits main » en cinq littéraux — dont deux variantes
	 * contradictoires entre l'OG et Twitter — pendant que `page.tsx`, elle,
	 * était corrigée et surveillée. Or c'est le repli le plus HÉRITÉ du site :
	 * toute page qui ne redéfinit pas son OG en hérite.
	 *
	 * Scan par le FICHIER et non par la valeur importée : `rootMetadata` tire
	 * `ICONS_CONFIG` et `metadataBase`, et un littéral réintroduit à la main est
	 * exactement ce qu'on veut attraper — y compris s'il n'atterrit dans aucun
	 * champ typé.
	 */
	{
		label: "shared/constants/root-metadata.ts",
		strings: [stripComments(readFileSync(ROOT_METADATA_PATH, "utf8"))],
	},
];

const EDITORIAL_SURFACES: { label: string; strings: string[] }[] = [
	{
		label: "shared/constants/atelier-content.ts",
		strings: [...collectStrings(ATELIER_STEPS), ...collectStrings(ATELIER_HOWTO)],
	},
	/*
	 * ⚠️ `shared/constants/faq-items.tsx` a été supprimée le 2026-08-08 avec la
	 * section FAQ (à refaire). C'était la surface éditoriale la plus BAVARDE du
	 * site — onze questions et leurs réponses, la copie la plus exposée aux mots
	 * bannis (« intemporel », « premium », « pierre précieuse » y sont des mots
	 * de FAQ naturels). La re-déclarer ici est obligatoire quand elle revient,
	 * sinon la refonte se fait sans filet lexical.
	 */
];

describe("@regression brand-lexicon", () => {
	it.each([...IDENTITY_SURFACES, ...EDITORIAL_SURFACES])(
		"$label — aucun mot de la liste « à NE PAS mettre au centre »",
		({ label, strings }) => {
			const hits = strings.flatMap((value) =>
				findTerms(value, DA_BANNED_TERMS).map((term) => `${term} → « ${value.slice(0, 90)} »`),
			);

			expect(
				hits,
				`${label} emploie un terme que \`docs/BRAND-DA.md\` § « Les mots à NE PAS mettre ` +
					`au centre » écarte. Ces mots peuvent décrire UNE pièce ; ils brouillent ` +
					`l'identité dès qu'ils décrivent la marque. Synclune vend des bijoux créatifs ` +
					`et colorés, PAS de la joaillerie précieuse.`,
			).toEqual([]);
		},
	);

	it.each(IDENTITY_SURFACES)(
		"$label — aucune formule passe-partout dans la copie d'identité",
		({ label, strings }) => {
			const hits = strings.flatMap((value) =>
				findTerms(value, INTERCHANGEABLE_FORMULAS).map(
					(term) => `${term} → « ${value.slice(0, 90)} »`,
				),
			);

			expect(
				hits,
				`${label} décrit la marque avec une formule interchangeable, retirée par l'audit ` +
					`DA du 2026-08-06. Elle n'est pas fausse — elle ne dit rien : n'importe quelle ` +
					`boutique de bijoux peut la signer. Reformuler sur le noyau lexical (couleur, ` +
					`goutte, récit, fait main, miniature, Nantes), ou reprendre une des deux ` +
					`formulations de référence de \`docs/BRAND-DA.md\` § L'ADN en une phrase.`,
			).toEqual([]);
		},
	);

	it("la copie éditoriale garde le droit de dire « avec amour »", () => {
		// Sentinelle du DÉCOUPAGE, pas de la copie : elle échoue si quelqu'un
		// applique `INTERCHANGEABLE_FORMULAS` aux surfaces éditoriales. L'étape 4
		// de l'atelier glisse le bijou dans sa pochette « avec amour » — c'est un
		// geste raconté à la première personne, pas un positionnement de marque.
		const editorial = EDITORIAL_SURFACES.flatMap((surface) => surface.strings).join(" ");

		expect(findTerms(editorial, INTERCHANGEABLE_FORMULAS).length).toBeGreaterThan(0);
	});

	it("reste en parité avec le § « Les mots à ne PAS mettre au centre » du doc", () => {
		// La liste ci-dessus s'était dite « verbatim » tout en divergeant du document
		// (cinq termes manquants) — personne ne re-comparait. Ici, chaque terme du doc
		// doit être couvert par une entrée de `DA_BANNED_TERMS` (égalité ou
		// élargissement : « luxe froid » est couvert par `luxe`). L'inverse n'est pas
		// exigé : le test a le droit d'être PLUS strict que le doc, jamais moins.
		const doc = readFileSync(join(REPO_ROOT, "docs", "BRAND-DA.md"), "utf-8");
		const start = doc.indexOf("## Les mots à ne PAS mettre au centre");
		expect(
			start,
			"la section « Les mots à ne PAS mettre au centre » a disparu de docs/BRAND-DA.md",
		).toBeGreaterThanOrEqual(0);
		const section = doc.slice(start, doc.indexOf("\n## ", start + 1));
		const list = section.split(/\n\n+/).find((block) => (block.match(/·/g) ?? []).length >= 5);
		expect(list, "la liste à points médians du § a disparu ou changé de forme").toBeDefined();

		const docTerms = list!
			.replace(/\n/g, " ")
			.split("·")
			.map((term) => term.trim().replace(/\.$/, ""))
			.filter(Boolean);
		// Garde-fou du garde-fou : une extraction cassée validerait une liste vide.
		expect(docTerms.length).toBeGreaterThanOrEqual(15);

		const uncovered = docTerms.filter(
			(docTerm) => !DA_BANNED_TERMS.some((t) => docTerm.toLowerCase().includes(t.toLowerCase())),
		);
		expect(
			uncovered,
			"Terme ajouté au § de BRAND-DA sans être couvert par DA_BANNED_TERMS : le doc " +
				"promet un verrou que ce test n'applique pas. Ajouter le terme ci-dessus " +
				"(ou un élargissement commenté).",
		).toEqual([]);
	});
});
