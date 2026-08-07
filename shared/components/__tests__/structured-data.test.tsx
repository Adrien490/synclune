import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StructuredData } from "../structured-data";
import type { Product } from "@/modules/products/types/product.types";
import { ATELIER_HOWTO, ATELIER_IMAGE, ATELIER_STEPS } from "@/shared/constants/atelier-content";
import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { LEGAL_WITHDRAWAL_DAYS } from "@/shared/constants/consumer-law";
import { BUSINESS_INFO, SITE_URL } from "@/shared/constants/seo-config";

/**
 * Le JSON-LD de l'accueil. Deux choses s'y vérifient et nulle part ailleurs :
 * la présence de l'`ItemList` de l'étal (perdue au vidage de la landing du
 * 2026-08-03, remise le 2026-08-04), et le fait que son champ `image` passe par
 * `pickPrimaryImage()` — la SSOT du choix de vignette.
 */

function readGraph(container: HTMLElement): Record<string, unknown>[] {
	const script = container.querySelector('script[type="application/ld+json"]');
	expect(script).not.toBeNull();
	const parsed = JSON.parse(script!.textContent) as {
		"@graph": Record<string, unknown>[];
	};
	return parsed["@graph"];
}

function findNode(container: HTMLElement, type: string) {
	return readGraph(container).find((node) => node["@type"] === type);
}

function createProduct(images: unknown[]): Product {
	return {
		id: "p-1",
		slug: "bague-lune",
		title: "Bague Lune",
		description: "Une bague peinte à la main.",
		skus: [{ priceInclTax: 3490, inventory: 3, images }],
	} as unknown as Product;
}

function image(overrides: Record<string, unknown>) {
	return { url: "https://cdn.test/img.jpg", isPrimary: false, mediaType: "IMAGE", ...overrides };
}

describe("StructuredData — ItemList de l'accueil", () => {
	it("n'émet aucune ItemList sans produit mis en avant", () => {
		const { container } = render(<StructuredData includeHomepageSchemas />);

		expect(findNode(container, "ItemList")).toBeUndefined();
		// ⚠️ Assertion INVERSÉE le 2026-08-06 : l'accueil n'émet plus de
		// `BreadcrumbList`. Elle n'avait qu'un `ListItem` (« Accueil » → la racine),
		// c'est-à-dire exactement — et uniquement — l'élément que Google demande
		// d'omettre ; elle ne pouvait donc jamais produire de rich result.
		expect(findNode(container, "BreadcrumbList")).toBeUndefined();
	});

	it("émet un Product + Offer par création affichée", () => {
		const { container } = render(
			<StructuredData
				includeHomepageSchemas
				featuredProducts={[createProduct([image({ isPrimary: true })])]}
			/>,
		);

		const itemList = findNode(container, "ItemList") as Record<string, unknown>;
		expect(itemList.numberOfItems).toBe(1);

		const [first] = itemList.itemListElement as Record<string, unknown>[];
		const product = first!.item as Record<string, unknown>;
		expect(product["@type"]).toBe("Product");
		expect(product.name).toBe("Bague Lune");
		expect(product.image).toBe("https://cdn.test/img.jpg");

		const offer = product.offers as Record<string, unknown>;
		expect(offer.price).toBe("34.90");
		expect(offer.priceCurrency).toBe("EUR");
		expect(offer.availability).toContain("InStock");
	});

	it("OMET `image` quand le média principal est une vidéo", () => {
		// C'est le défaut que `pickPrimaryImage()` existe pour empêcher : la
		// version d'avant le vidage écrivait `find(isPrimary) ?? images[0]`, ce
		// qui mettait un `.mp4` dans le champ `image` d'un nœud Product —
		// invalide en schema.org.
		const { container } = render(
			<StructuredData
				includeHomepageSchemas
				featuredProducts={[
					createProduct([
						image({ url: "https://cdn.test/clip.mp4", isPrimary: true, mediaType: "VIDEO" }),
					]),
				]}
			/>,
		);

		const itemList = findNode(container, "ItemList") as Record<string, unknown>;
		const [first] = itemList.itemListElement as Record<string, unknown>[];
		const product = first!.item as Record<string, unknown>;

		expect(product).not.toHaveProperty("image");
	});

	it("préfère la première IMAGE quand le média primaire est une vidéo", () => {
		const { container } = render(
			<StructuredData
				includeHomepageSchemas
				featuredProducts={[
					createProduct([
						image({ url: "https://cdn.test/clip.mp4", isPrimary: true, mediaType: "VIDEO" }),
						image({ url: "https://cdn.test/photo.jpg" }),
					]),
				]}
			/>,
		);

		const itemList = findNode(container, "ItemList") as Record<string, unknown>;
		const [first] = itemList.itemListElement as Record<string, unknown>[];
		const product = first!.item as Record<string, unknown>;

		expect(product.image).toBe("https://cdn.test/photo.jpg");
	});
});

describe("StructuredData — HowTo de l'atelier", () => {
	it("émet un nœud HowTo dans le @graph avec les schémas d'accueil, jamais un second script", () => {
		const { container } = render(<StructuredData includeHomepageSchemas />);

		// TOUT vit dans un script unique : le montage à deux scripts de
		// l'ancienne section atelier est exactement ce qu'on ne refait pas.
		expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);

		const howTo = findNode(container, "HowTo") as Record<string, unknown>;
		expect(howTo).toBeDefined();
		// L'@id pointe la section réellement rendue (le précédent du FAQPage →
		// #faq) : le balisage doit correspondre à du contenu visible.
		expect(howTo["@id"]).toBe(`${SITE_URL}/#atelier`);
		expect(howTo.name).toBe(ATELIER_HOWTO.name);
		expect(howTo.totalTime).toBe(ATELIER_HOWTO.totalTime);
		// Même règle que l'`image` d'un nœud Product : OMISE tant que la SSOT
		// est null (asset FOUNDER en 404) — on ne publie jamais une URL cassée.
		if (ATELIER_IMAGE) {
			expect(howTo.image).toBe(ATELIER_IMAGE);
		} else {
			expect(howTo).not.toHaveProperty("image");
		}
		expect(howTo.supply).toHaveLength(ATELIER_HOWTO.supplies.length);
		expect(howTo.tool).toHaveLength(ATELIER_HOWTO.tools.length);
	});

	it("émet un HowToStep par étape de la SSOT, positionné et ancré sur la section", () => {
		const { container } = render(<StructuredData includeHomepageSchemas />);

		const howTo = findNode(container, "HowTo") as Record<string, unknown>;
		const steps = howTo.step as Record<string, unknown>[];
		expect(steps).toHaveLength(ATELIER_STEPS.length);

		ATELIER_STEPS.forEach((step, index) => {
			const node = steps[index]!;
			expect(node.position).toBe(index + 1);
			// `name`/`text` strictement égaux à la SSOT : la section rend les
			// mêmes chaînes — si l'une des deux consommations dérive, ce test ou
			// celui de la section casse.
			expect(node.name).toBe(step.title);
			expect(node.text).toBe(step.description);
			// L'ancre réelle du <li> correspondant (vérifiée côté section).
			expect(node.url).toBe(`${SITE_URL}/#atelier-step-${step.id}`);
		});
	});

	it("n'émet pas de HowTo hors accueil", () => {
		const { container } = render(<StructuredData />);

		expect(findNode(container, "HowTo")).toBeUndefined();
	});
});

/**
 * @regression graph-no-private-address
 *
 * Le `@graph` publiait l'adresse postale complète de l'atelier — numéro de rue
 * inclus — et ses coordonnées GPS, dans TROIS nœuds à la fois (`LocalBusiness`,
 * `Organization`, `LocalBusiness.founder`). L'atelier n'accueille pas de public :
 * ces champs ne décrivaient donc qu'un domicile, dans une surface conçue pour
 * être moissonnée, et pour zéro rich result de plus.
 *
 * Le test porte sur la chaîne SÉRIALISÉE, pas sur des champs nommés : c'est la
 * seule formulation qui attrape aussi une réintroduction dans un nœud futur.
 */
describe("StructuredData — aucune adresse privée dans le graphe", () => {
	function serialize(container: HTMLElement) {
		return container.querySelector('script[type="application/ld+json"]')!.textContent!;
	}

	it("n'expose ni numéro de rue ni coordonnées GPS", () => {
		const { container } = render(<StructuredData includeHomepageSchemas />);
		const json = serialize(container);

		expect(json).not.toContain("streetAddress");
		expect(json).not.toContain("GeoCoordinates");
		expect(json).not.toContain(BUSINESS_INFO.location.street);
	});

	it("garde la ville et la région — ce sont elles qui portent le SEO local", () => {
		const { container } = render(<StructuredData includeHomepageSchemas />);
		const json = serialize(container);

		expect(json).toContain(BUSINESS_INFO.location.addressLocality);
		expect(json).toContain(BUSINESS_INFO.location.addressRegion);
	});
});

/**
 * Livraison et retours déclarés UNE fois sur le nœud marchand (Google, nov. 2025)
 * plutôt que répétés par produit. Les valeurs doivent dériver des SSOT : un port
 * annoncé au balisage que le tunnel facture autrement est le motif d'abandon nº 1.
 */
describe("StructuredData — politiques marchand", () => {
	it("déclare la livraison et les retours sur le nœud OnlineStore", () => {
		const { container } = render(<StructuredData includeHomepageSchemas />);
		const store = findNode(container, "OnlineStore");

		expect(store).toBeDefined();

		const services = store!["hasShippingService"] as unknown as {
			shippingRate: { value: string };
		}[];
		expect(services.map((s) => s.shippingRate.value)).toEqual([
			(SHIPPING_RATES.FR.amount / 100).toFixed(2),
			(SHIPPING_RATES.EU.amount / 100).toFixed(2),
		]);

		const policy = store!["hasMerchantReturnPolicy"] as Record<string, unknown>;
		expect(policy.merchantReturnDays).toBe(LEGAL_WITHDRAWAL_DAYS);
		// Les CGV § 6.3 et /retractation disent « frais de retour à votre charge » :
		// annoncer `FreeReturn` serait une allégation commerciale fausse.
		expect(policy.returnFees).toBe("https://schema.org/ReturnShippingFees");
	});
});
