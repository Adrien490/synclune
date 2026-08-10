import { pickPrimaryImage } from "@/modules/products/services/product-display.service";
import type { Product } from "@/modules/products/types/product.types";
import { ATELIER_HOWTO, ATELIER_IMAGE, ATELIER_STEPS } from "@/shared/constants/atelier-content";
import {
	getFounderSchema,
	getLocalBusinessSchema,
	getOrganizationSchema,
	getWebSiteSchema,
	SITE_URL,
} from "@/shared/constants/seo-config";

import { getOfferAvailability } from "@/shared/utils/offer-availability";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

interface StructuredDataProps {
	includeHomepageSchemas?: boolean;
	/**
	 * Créations mises en avant sur l'accueil (l'étal). Émet une `ItemList` de
	 * `Product` + `Offer` — l'éligibilité au carrousel produit de Google.
	 *
	 * ⚠️ L'accueil est le SEUL émetteur d'`ItemList` de son URL : `ProductList`
	 * n'en émet plus, et il n'y a pas de `PageHeader` ici. Ne pas en ajouter une
	 * seconde ailleurs sur `/` (cf. CLAUDE.md, une seule `ItemList` par URL).
	 */
	featuredProducts?: Product[];
}

/**
 * Construit le nœud `Product` d'un item de l'`ItemList` de l'accueil.
 *
 * ⚠️ L'image passe par `pickPrimaryImage()` — SSOT du choix de vignette — et le
 * champ est OMIS quand elle rend `null`. La version d'avant le vidage de la
 * landing écrivait `images.find((i) => i.isPrimary) ?? images[0]` : sur un SKU
 * dont le média principal est une vidéo, ça mettait un `.mp4` dans le champ
 * `image` d'un nœud `Product` (invalide en schema.org).
 */
function buildFeaturedProductNode(product: Product, position: number) {
	const url = `${SITE_URL}/creations/${product.slug}`;
	// skus pré-triés par [position asc, id asc] dans GET_PRODUCTS_SELECT (rang 0 = représentant)
	const defaultSku = product.skus[0];
	const primaryImage = pickPrimaryImage(defaultSku?.images);
	const priceCents = defaultSku?.priceInclTax;

	const productNode: Record<string, unknown> = {
		"@type": "Product",
		"@id": `${url}#product`,
		name: product.title,
		url,
		...(product.description && { description: product.description }),
		...(primaryImage && { image: primaryImage.url }),
		...(typeof priceCents === "number" && {
			offers: {
				"@type": "Offer",
				url,
				price: (priceCents / 100).toFixed(2),
				priceCurrency: "EUR",
				availability: getOfferAvailability((defaultSku?.inventory ?? 0) > 0),
				itemCondition: "https://schema.org/NewCondition",
			},
		}),
	};

	return { "@type": "ListItem", position, item: productNode };
}

/**
 * Consolidates all JSON-LD schemas into a single @graph script.
 * Sync component — data must be passed as props (no Suspense around <script> tags).
 */
// Remove @context from each schema for @graph format
const BASE_GRAPH_SCHEMAS: Record<string, unknown>[] = [
	getOrganizationSchema(),
	getWebSiteSchema(),
	getLocalBusinessSchema(),
	getFounderSchema(),
].map(({ "@context": _, ...rest }) => rest);

export function StructuredData({ includeHomepageSchemas, featuredProducts }: StructuredDataProps) {
	// Copie par rendu : le tableau est muté (push) selon les props.
	const graphSchemas: Record<string, unknown>[] = [...BASE_GRAPH_SCHEMAS];

	if (includeHomepageSchemas) {
		/*
		 * ⚠️ Pas de `BreadcrumbList` sur l'accueil, et c'est une SUPPRESSION du
		 * 2026-08-06, pas un oubli.
		 *
		 * Il n'en portait qu'UN seul `ListItem` — « Accueil » pointant la racine.
		 * Or Google exige au moins deux items ET demande explicitement d'omettre le
		 * niveau racine comme la page courante : ce fil ne contenait donc
		 * exactement, et uniquement, l'élément qu'il faut omettre. Il ne pouvait
		 * s'afficher dans aucun cas.
		 *
		 * L'invariant « une seule BreadcrumbList par URL » (CLAUDE.md § Catalogue)
		 * n'est pas affaibli : il interdit le DOUBLON, il n'impose pas d'en émettre
		 * une. Les pages profondes gardent la leur, où elle a ≥ 2 maillons.
		 */

		// ItemList de l'étal — les créations réellement affichées sur l'accueil.
		if (featuredProducts && featuredProducts.length > 0) {
			graphSchemas.push({
				"@type": "ItemList",
				"@id": `${SITE_URL}/#hero`,
				name: "Dernières créations Synclune",
				numberOfItems: featuredProducts.length,
				itemListOrder: "https://schema.org/ItemListOrderDescending",
				itemListElement: featuredProducts.map((product, index) =>
					buildFeaturedProductNode(product, index + 1),
				),
			});
		}

		/*
		 * ⚠️ Pas de `FAQPage` : la section « Des questions ? » a été RETIRÉE de la
		 * landing le 2026-08-08, pour être refaite. Le nœud est parti avec elle —
		 * un `FAQPage` doit pointer du contenu réellement VISIBLE, donc le laisser
		 * sur une page sans FAQ était du balisage mensonger.
		 *
		 * Quand la FAQ revient : le nœud se rouvre ICI, dans ce `@graph`, et
		 * JAMAIS en `<script>` séparé. C'était le montage de `/aide` (deux scripts,
		 * faute de générateur), et le recopier sur `/` y ajouterait une seconde
		 * `BreadcrumbList` au premier copier-coller.
		 */

		// HowTo — le processus de création de la section « Viens voir l'atelier »
		// (retour sur la landing, 2026-08-05). Même principe que le FAQPage : un
		// NŒUD de ce @graph, jamais un second <script> (le montage à deux scripts
		// de l'ancienne section atelier est exactement ce qu'on ne refait pas).
		// L'`@id` pointe la section réellement rendue (`#atelier`), et chaque
		// `url` de step pointe l'ancre réelle de son <li> — la SSOT
		// `atelier-content.ts` est bi-consommée précisément pour que balisage et
		// contenu visible ne puissent pas diverger. Statique et inconditionnel :
		// émis identiquement par les deux rendus autour de la frontière Suspense
		// de la home (ne JAMAIS le conditionner à `featuredProducts`).
		graphSchemas.push({
			"@type": "HowTo",
			"@id": `${SITE_URL}/#atelier`,
			inLanguage: "fr-FR",
			name: ATELIER_HOWTO.name,
			description: ATELIER_HOWTO.description,
			// Champ OMIS tant que l'asset est mort (404, cf. `IMAGES.FOUNDER`) :
			// même règle que l'`image` d'un nœud Product via `pickPrimaryImage` —
			// on omet, on ne publie jamais une URL cassée.
			...(ATELIER_IMAGE && { image: ATELIER_IMAGE }),
			totalTime: ATELIER_HOWTO.totalTime,
			supply: ATELIER_HOWTO.supplies.map((name) => ({ "@type": "HowToSupply", name })),
			tool: ATELIER_HOWTO.tools.map((name) => ({ "@type": "HowToTool", name })),
			step: ATELIER_STEPS.map((step, index) => ({
				"@type": "HowToStep",
				position: index + 1,
				name: step.title,
				text: step.description,
				url: `${SITE_URL}/#atelier-step-${step.id}`,
			})),
		});
	}

	const jsonLd = {
		"@context": "https://schema.org",
		"@graph": graphSchemas,
	};

	return (
		// SAFE: serialized via safeJsonLd (no user HTML)
		// react-doctor-disable-next-line react/no-danger
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: safeJsonLd(jsonLd),
			}}
		/>
	);
}
