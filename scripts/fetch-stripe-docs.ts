/**
 * Récupère la documentation officielle Stripe pertinente pour Synclune et la
 * concatène en 5 bundles markdown dans `docs/stripe/`.
 *
 * Stripe publie chaque page de doc en variante markdown brute : il suffit de
 * suffixer l'URL par `.md` (`docs.stripe.com/webhooks` → `docs.stripe.com/webhooks.md`).
 *
 * ============================================================================
 * POURQUOI LE MANIFESTE EST ÉCRIT À LA MAIN
 * ============================================================================
 *
 * Stripe expose un index `docs.stripe.com/llms.txt` (481 pages). On ne s'en sert
 * PAS comme source : il est curé et **lacunaire sur notre périmètre**. Sa section
 * « Elements » est curée pour d'autres périmètres — `api/idempotent_requests`,
 * `api/checkout/sessions/expire` et `changelog/dahlia` n'y figurent pas.
 * Un filtre par section aurait raté l'essentiel.
 *
 * À l'inverse, ~417 de ses pages couvrent des produits sans aucun appelant ici
 * (Connect, Issuing, Terminal, Treasury, Billing…) : les tirer
 * ferait ~10 Mo pour rien (Connect, Issuing, Terminal, Elements, PaymentIntents…).
 * Cf. `docs/stripe/INDEX.md` pour le détail des exclusions.
 *
 * ============================================================================
 * CINQ PIÈGES ENCODÉS ICI
 * ============================================================================
 *
 * 1. **Une 404 de docs.stripe.com renvoie un corps de ~24 Ko**, pas un corps vide.
 *    Un `curl -sL` naïf écrit donc la page d'erreur comme si c'était de la doc,
 *    et elle se noie dans un bundle de 855 Ko. On rejette sur `!res.ok` et on
 *    sort en code 1 avec la liste des URLs mortes — c'est le signal qu'une page
 *    Stripe a été déplacée et que le manifeste doit être corrigé.
 *
 * 2. **Une 200 peut rendre un INDEX DE VARIANTES de ~500 o au lieu du contenu.**
 *    Symétrique du piège 1, et plus vicieux : rien ne signale l'anomalie. Stripe
 *    sert, pour les pages déclinées par intégration ou par langage, un stub
 *    « This article has multiple variants. Fetch one of the following URLs… ».
 *    L'audit du 2026-08-05 en a trouvé QUATRE au mirror, dont
 *    `payments/accept-a-payment` — la page d'intégration de référence du tunnel —
 *    stockée en 1053 o là où la variante Elements + PaymentIntents en fait 77 695.
 *    Soit ~110 Ko de doc absents, invisibles à la lecture d'un bundle de 860 Ko.
 *    D'où `assertNotVariantIndex()` et les entrées de manifeste porteuses de query.
 *
 * 3. **La langue suit la GÉO de l'appelant** si on ne l'épingle pas : le mirror a
 *    été généré en français depuis la France, un run CI l'aurait rendu en anglais
 *    — 1,9 Mo de diff pour zéro changement de contenu. D'où `DOC_LOCALE`.
 *
 * 4. **Concurrence bornée** : 68 fetches séquentiels sont lents, 68 en parallèle
 *    sont impolis.
 *
 * 5. **En-tête de provenance par page** : sans URL source ni date, une page
 *    périmée au milieu d'un bundle est intraçable.
 *
 * Sortie idempotente, y compris entre machines depuis que la locale est épinglée :
 * deux exécutions produisent des fichiers identiques hors la ligne de date de
 * l'en-tête de bundle.
 *
 * Usage :
 *   pnpm docs:stripe
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// ============================================================================
// MANIFESTE — SSOT des pages récupérées
// ============================================================================

/**
 * Chemin relatif à `https://docs.stripe.com/`, SANS le suffixe `.md`.
 *
 * Peut porter une **query de variante** pour les pages que Stripe décline par
 * intégration ou par langage — sans elle, l'URL nue rend un index de variantes de
 * ~500 o au lieu du contenu (piège 2 en tête de fichier) :
 *   `payments/accept-a-payment?payment-ui=checkout&ui=stripe-hosted`
 */
type StripeDocPath = string;

type Bundle = {
	/** Nom du fichier produit dans `docs/stripe/`. */
	readonly file: string;
	/** Titre affiché en tête du bundle. */
	readonly title: string;
	/** Une phrase sur ce que le bundle couvre côté Synclune. */
	readonly rationale: string;
	readonly pages: readonly StripeDocPath[];
};

export const BUNDLES: readonly Bundle[] = [
	{
		file: "01-checkout-sessions.md",
		title: "Checkout hébergé — sessions, cycle de vie, fulfillment",
		rationale:
			"Le flow réel de Synclune depuis la migration lean : session Checkout hébergée " +
			"(price_data inline, expires_at +31 min), Order PENDING réservé puis transitions " +
			"par webhooks. Voir modules/payments/actions/create-checkout-session.ts.",
		pages: [
			// Variante « page hébergée par Stripe » : l'URL nue rend un index de
			// variantes (~1 Ko) — piège 2 en tête de fichier.
			"payments/accept-a-payment?payment-ui=checkout&ui=stripe-hosted",
			"payments/checkout",
			"payments/checkout/how-checkout-works?payment-ui=stripe-hosted",
			// La réservation de stock de createCheckoutSession implémente exactement
			// le patron décrit ici (expiration + restock).
			"payments/checkout/managing-limited-inventory?payment-ui=stripe-hosted",
			// /paiement/retour lit session_id : c'est le patron « custom success page ».
			"payments/checkout/custom-success-page?payment-ui=stripe-hosted",
			// La transition PAID (webhook completed) est le « fulfillment » canonique.
			"checkout/fulfillment?payment-ui=stripe-hosted",
			"api/checkout/sessions",
			"api/checkout/sessions/object",
			"api/checkout/sessions/create",
			// L'annulation admin d'une commande PENDING expire la session AVANT la
			// transition (une session open laisserait payer une commande annulée).
			"api/checkout/sessions/expire",
			"api/checkout/sessions/retrieve",
		],
	},
	{
		file: "03-webhooks.md",
		title: "Webhooks — signature, events, idempotence",
		rationale:
			"2 events routés par app/api/webhooks/stripe/route.ts (completed, expired) ; " +
			"idempotence par garde de transition updateMany, pas par table.",
		pages: [
			"webhooks",
			"webhooks/quickstart",
			"webhooks/signature",
			"webhooks/process-undelivered-events",
			"event-destinations",
			"api/events",
			"api/events/types",
			"api/idempotent_requests",
		],
	},
	{
		file: "04-refunds.md",
		title: "Remboursements",
		rationale:
			"stripe.refunds.create({ payment_intent }) intégral avec idempotencyKey — " +
			"voir modules/retractations/ (pas de webhook refund.*, stripeRefundId est la trace).",
		pages: ["refunds", "api/refunds", "api/refunds/object", "api/refunds/create"],
	},
	{
		file: "05-testing.md",
		title: "Test et mise en production",
		rationale:
			"Cartes de test et `stripe trigger`, qui alimente test/fixtures/stripe/*.json " +
			"consommées par test/contract/stripe-events.contract.test.ts.",
		pages: [
			"testing",
			"stripe-cli",
			"cli/trigger",
			"get-started/checklist/go-live",
			"get-started/test-developer-integration",
			"get-started/development-environment?lang=node",
		],
	},
	{
		file: "06-api-versioning.md",
		title: "Version d'API, changelog, transverse",
		rationale:
			"shared/lib/stripe.ts épingle apiVersion 2026-06-24.dahlia — le changelog de cette " +
			"version est inclus pour que toute montée soit arbitrée sur pièce.",
		pages: [
			"upgrades",
			"api/versioning",
			"changelog/dahlia",
			"api/errors",
			"rate-limits",
			"api/metadata",
			"api/expanding_objects",
			"api/pagination",
			"currencies",
			"security/guide",
			"sdks",
		],
	},
];

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = "https://docs.stripe.com";
const OUTPUT_DIR = path.join(process.cwd(), "docs", "stripe");

/**
 * Locale ÉPINGLÉE. Sans ce paramètre, Stripe négocie la langue sur la géo de
 * l'appelant : le mirror a été généré en français depuis la France, un run CI ou
 * derrière un VPN l'aurait rendu en anglais — 1,9 Mo de diff pour zéro changement
 * de contenu, et la promesse d'idempotence ci-dessus serait fausse entre machines.
 *
 * Le paramètre gagne contre un en-tête `accept-language` contraire (vérifié), donc
 * il suffit à lui seul.
 */
const DOC_LOCALE = "fr-FR";

/** Requêtes simultanées. Assez pour que les 68 pages tiennent en ~10 s, assez peu pour rester poli. */
const CONCURRENCY = 4;

/** Une page de doc met normalement < 2 s ; au-delà, c'est un incident réseau. */
const REQUEST_TIMEOUT_MS = 20_000;

// ============================================================================
// RÉCUPÉRATION
// ============================================================================

type FetchedPage = {
	readonly docPath: StripeDocPath;
	readonly url: string;
	readonly markdown: string;
	readonly bytes: number;
};

class StripeDocFetchError extends Error {
	constructor(
		readonly docPath: StripeDocPath,
		readonly detail: string,
	) {
		super(`${docPath} — ${detail}`);
		this.name = "StripeDocFetchError";
	}
}

/**
 * `payments/accept-a-payment?payment-ui=elements`
 *   → `https://docs.stripe.com/payments/accept-a-payment.md?payment-ui=elements&locale=fr-FR`
 *
 * Le `.md` se glisse entre le chemin et la query : c'est le chemin qui est suffixé,
 * pas l'URL complète.
 */
function buildDocUrl(entry: StripeDocPath): string {
	const [docPath, query] = entry.split("?", 2);
	const params = new URLSearchParams(query);
	params.set("locale", DOC_LOCALE);
	return `${BASE_URL}/${docPath}.md?${params}`;
}

/** Le marqueur reste en anglais même sur une page servie en français (vérifié). */
const VARIANT_INDEX_MARKER = "This article has multiple variants";

/**
 * PIÈGE 2 : une 200 de ~500 o qui n'est pas de la doc mais un sommaire de variantes.
 * On échoue en listant les variantes disponibles — le manifeste doit en désigner une.
 */
function assertNotVariantIndex(docPath: StripeDocPath, markdown: string, bytes: number): void {
	if (!markdown.includes(VARIANT_INDEX_MARKER)) return;

	const variants = [...markdown.matchAll(/\((https:\/\/docs\.stripe\.com\/[^)]+\?[^)]+)\)/g)].map(
		(match) => `      ${match[1]}`,
	);

	throw new StripeDocFetchError(
		docPath,
		`index de variantes (${bytes} o), pas du contenu — choisir une variante :\n` +
			variants.join("\n"),
	);
}

async function fetchDocPage(docPath: StripeDocPath): Promise<FetchedPage> {
	const url = buildDocUrl(docPath);

	let response: Response;
	try {
		response = await fetch(url, {
			redirect: "follow",
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			headers: { accept: "text/markdown, text/plain, */*" },
		});
	} catch (cause) {
		throw new StripeDocFetchError(docPath, cause instanceof Error ? cause.message : String(cause));
	}

	// PIÈGE : une 404 de docs.stripe.com a un corps de ~24 Ko. Sans ce garde, la
	// page d'erreur est concaténée comme si c'était de la doc.
	if (!response.ok) {
		throw new StripeDocFetchError(docPath, `HTTP ${response.status}`);
	}

	const markdown = (await response.text()).trimEnd();
	if (markdown.length === 0) {
		throw new StripeDocFetchError(docPath, "corps vide");
	}

	const bytes = Buffer.byteLength(markdown, "utf8");
	assertNotVariantIndex(docPath, markdown, bytes);

	return { docPath, url, markdown, bytes };
}

/**
 * Exécute `worker` sur chaque item avec au plus `limit` appels en vol.
 * L'ordre du tableau de sortie suit l'ordre d'entrée (le manifeste fait foi).
 */
async function mapWithConcurrency<In, Out>(
	items: readonly In[],
	limit: number,
	worker: (item: In, index: number) => Promise<Out>,
): Promise<PromiseSettledResult<Out>[]> {
	const results = new Array<PromiseSettledResult<Out>>(items.length);
	let cursor = 0;

	async function runNext(): Promise<void> {
		while (cursor < items.length) {
			const index = cursor++;
			try {
				results[index] = { status: "fulfilled", value: await worker(items[index]!, index) };
			} catch (reason) {
				results[index] = { status: "rejected", reason };
			}
		}
	}

	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext));
	return results;
}

// ============================================================================
// RENDU
// ============================================================================

function renderBundle(bundle: Bundle, pages: readonly FetchedPage[], fetchedAt: string): string {
	const toc = pages.map((page) => `- [${page.docPath}](${page.url})`).join("\n");

	const body = pages
		.map(
			(page) =>
				`<!-- ${"=".repeat(74)} -->\n` +
				`<!-- Source : ${page.url} -->\n` +
				`<!-- Récupérée le ${fetchedAt} -->\n` +
				`<!-- ${"=".repeat(74)} -->\n\n` +
				`${page.markdown}\n`,
		)
		.join("\n");

	return (
		`<!-- GÉNÉRÉ PAR \`pnpm docs:stripe\` — NE PAS ÉDITER À LA MAIN -->\n\n` +
		`# ${bundle.title}\n\n` +
		`> ${bundle.rationale}\n>\n` +
		`> ${pages.length} pages · récupérées le ${fetchedAt} depuis ${BASE_URL}\n` +
		`> Manifeste et correspondance avec le code : [\`INDEX.md\`](./INDEX.md)\n\n` +
		`## Pages incluses\n\n${toc}\n\n---\n\n${body}`
	);
}

function formatKo(bytes: number): string {
	return `${(bytes / 1024).toFixed(1)} Ko`;
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
	// Date seule (pas d'heure) : un re-run le même jour produit des fichiers
	// bit-identiques, ce qui rend un `diff` de contrôle exploitable.
	const fetchedAt = new Date().toISOString().slice(0, 10);

	const manifest = BUNDLES.flatMap((bundle) =>
		bundle.pages.map((docPath) => ({ bundle, docPath })),
	);

	console.log(
		`Récupération de ${manifest.length} pages Stripe (${BUNDLES.length} bundles, ${CONCURRENCY} en parallèle)…\n`,
	);

	const settled = await mapWithConcurrency(manifest, CONCURRENCY, ({ docPath }) =>
		fetchDocPage(docPath),
	);

	const failures = settled.flatMap((result) =>
		result.status === "rejected" ? [result.reason as unknown] : [],
	);

	if (failures.length > 0) {
		console.error(`\n✖ ${failures.length} page(s) introuvable(s) — rien n'a été écrit.\n`);
		for (const failure of failures) {
			console.error(
				`  ${failure instanceof StripeDocFetchError ? failure.message : String(failure)}`,
			);
		}
		console.error(
			`\nSoit une page a été déplacée côté Stripe, soit elle est désormais déclinée` +
				` en variantes (choisir l'URL listée ci-dessus).` +
				`\nDans les deux cas : corriger le manifeste en tête de scripts/fetch-stripe-docs.ts.`,
		);
		process.exitCode = 1;
		return;
	}

	// Tout est en mémoire et valide : on peut écrire sans risque de bundle partiel.
	const byBundle = new Map<string, FetchedPage[]>();
	settled.forEach((result, index) => {
		if (result.status !== "fulfilled") return;
		const { bundle } = manifest[index]!;
		const pages = byBundle.get(bundle.file) ?? [];
		pages.push(result.value);
		byBundle.set(bundle.file, pages);
	});

	await mkdir(OUTPUT_DIR, { recursive: true });

	let totalBytes = 0;
	for (const bundle of BUNDLES) {
		const pages = byBundle.get(bundle.file) ?? [];
		const contents = renderBundle(bundle, pages, fetchedAt);
		await writeFile(path.join(OUTPUT_DIR, bundle.file), contents, "utf8");

		const bytes = Buffer.byteLength(contents, "utf8");
		totalBytes += bytes;
		console.log(
			`  ${bundle.file.padEnd(24)} ${String(pages.length).padStart(2)} pages  ${formatKo(bytes).padStart(9)}`,
		);
	}

	console.log(
		`\n✔ ${manifest.length} pages · ${formatKo(totalBytes)} · ${path.relative(process.cwd(), OUTPUT_DIR)}/`,
	);
	console.log(`  (bundles gitignorés — seul INDEX.md est versionné)`);
}

// Garde de point d'entrée : `BUNDLES` est importé par
// `test/contract/stripe-docs-mirror.contract.test.ts`, et sans ce garde un simple
// `import` déclencherait les 68 fetches réseau.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}
