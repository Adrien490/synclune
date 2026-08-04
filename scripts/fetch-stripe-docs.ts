/**
 * Récupère la documentation officielle Stripe pertinente pour Synclune et la
 * concatène en 6 bundles markdown dans `docs/stripe/`.
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
 * « Elements » ne liste que du mobile et l'Address Element — `payments/payment-element`,
 * le composant web réellement monté dans `checkout-stripe-section.tsx`, n'y figure
 * pas. Idem pour `api/idempotent_requests`, `disputes/*`, `payments/3d-secure/*` et
 * `changelog/dahlia`. Un filtre par section aurait raté l'essentiel.
 *
 * À l'inverse, ~417 de ses pages couvrent des produits sans aucun appelant ici
 * (Connect, Issuing, Terminal, Treasury, Checkout Sessions, Billing…) : les tirer
 * ferait ~10 Mo pour rien. Cf. `docs/stripe/INDEX.md` pour le détail des exclusions.
 *
 * ============================================================================
 * TROIS PIÈGES ENCODÉS ICI
 * ============================================================================
 *
 * 1. **Une 404 de docs.stripe.com renvoie un corps de ~24 Ko**, pas un corps vide.
 *    Un `curl -sL` naïf écrit donc la page d'erreur comme si c'était de la doc,
 *    et elle se noie dans un bundle de 855 Ko. On rejette sur `!res.ok` et on
 *    sort en code 1 avec la liste des URLs mortes — c'est le signal qu'une page
 *    Stripe a été déplacée et que le manifeste doit être corrigé.
 * 2. **Concurrence bornée** : 64 fetches séquentiels sont lents, 64 en parallèle
 *    sont impolis.
 * 3. **En-tête de provenance par page** : sans URL source ni date, une page
 *    périmée au milieu d'un bundle est intraçable.
 *
 * Sortie idempotente : deux exécutions produisent des fichiers identiques hors
 * la ligne de date de l'en-tête de bundle.
 *
 * Usage :
 *   pnpm docs:stripe
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// ============================================================================
// MANIFESTE — SSOT des pages récupérées
// ============================================================================

/** Chemin relatif à `https://docs.stripe.com/`, SANS le suffixe `.md`. */
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

const BUNDLES: readonly Bundle[] = [
	{
		file: "01-payments.md",
		title: "Paiements — PaymentIntents",
		rationale:
			"Le flow réel de Synclune : PaymentIntents card-only, 3DS en settlement, codes de refus. " +
			"Voir modules/payments/actions/initialize-payment.ts et confirm-checkout.ts.",
		pages: [
			"payments/accept-a-payment",
			"payments/payment-intents",
			"payments/payment-intents/verifying-status",
			"payments/payment-intents/asynchronous-capture",
			"payments/quickstart",
			"payments/place-a-hold-on-a-payment-method",
			"payments/payment-methods",
			"payments/payment-methods/integration-options",
			"payments/3d-secure",
			"payments/3d-secure/authentication-flow",
			"declines",
			"declines/codes",
			"payments/analytics",
			"api/payment_intents",
			"api/payment_intents/object",
			"api/payment_intents/create",
			"api/payment_methods",
			"api/payment_methods/object",
			"payments-api/tour",
		],
	},
	{
		file: "02-elements.md",
		title: "Elements — Payment Element (web)",
		rationale:
			"Le tunnel /paiement monte <Elements> + <PaymentElement>. " +
			"Voir modules/payments/components/checkout-stripe-section.tsx et hooks/use-checkout-submit.ts.",
		pages: [
			"payments/payment-element",
			"payments/payment-element/control-billing-details-collection",
			"payments/payment-element/migration-ct",
			"elements/address-element",
			"payments/advanced/collect-addresses",
			"js/initializing",
			"js/elements_object/create_payment_element",
			"js/payment_intents/confirm_payment",
			"payments/link/payment-element-link",
			"payments/link/link-payment-integrations",
			"testing/wallets",
		],
	},
	{
		file: "03-webhooks.md",
		title: "Webhooks — signature, events, idempotence",
		rationale:
			"12 events routés par modules/webhooks/utils/event-registry.ts. " +
			"Les 4 couches anti-replay sont documentées en tête de app/api/webhooks/stripe/route.ts.",
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
		file: "04-refunds-disputes.md",
		title: "Remboursements et litiges",
		rationale:
			"Remboursements Stripe-first (dashboard → webhook → modules/webhooks/services/refund.service.ts). " +
			"Pas de modèle Dispute : l'état est dérivé d'OrderHistory (has-open-dispute.service.ts).",
		pages: [
			"refunds",
			"api/refunds",
			"api/refunds/object",
			"api/refunds/create",
			"disputes",
			"disputes/responding",
			"disputes/measuring",
			"api/disputes/object",
			"api/charges/object",
		],
	},
	{
		file: "05-testing.md",
		title: "Test et mise en production",
		rationale:
			"Cartes de test et `stripe trigger`, qui alimente test/fixtures/stripe/*.json " +
			"consommées par test/contract/stripe-events.test.ts.",
		pages: [
			"testing",
			"stripe-cli",
			"cli/trigger",
			"get-started/checklist/go-live",
			"get-started/test-developer-integration",
			"get-started/development-environment",
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

/** Requêtes simultanées. Assez pour que les 64 pages tiennent en ~10 s, assez peu pour rester poli. */
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

async function fetchDocPage(docPath: StripeDocPath): Promise<FetchedPage> {
	const url = `${BASE_URL}/${docPath}.md`;

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

	return {
		docPath,
		url,
		markdown,
		bytes: Buffer.byteLength(markdown, "utf8"),
	};
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
			`\nUne page a probablement été déplacée côté Stripe : corriger le manifeste` +
				` en tête de scripts/fetch-stripe-docs.ts.`,
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

await main();
