/**
 * Configuration SEO et référencement local pour Synclune
 * Créatrice de bijoux faits main
 */

import {
	PREPARATION_BUSINESS_DAYS,
	SHIPPING_RATES,
} from "@/modules/orders/constants/shipping-rates";
import { BRAND } from "./brand";
import { LEGAL_WITHDRAWAL_DAYS } from "./consumer-law";
import { SHIPPING_COUNTRIES } from "./countries";
import { IMAGES } from "./images";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://synclune.fr";

/**
 * L'intitulé de Léane — SSOT des DEUX nœuds qui la décrivent (le `Person` de
 * `getFounderSchema()` et le `founder` imbriqué de `getLocalBusinessSchema()`),
 * tous deux présents dans le même `@graph`.
 *
 * Ils divergeaient : « Créatrice de bijoux artisanaux » d'un côté, « Artisan
 * créateur de bijoux » de l'autre — deux intitulés, un seul `@id`.
 */
const FOUNDER_JOB_TITLE = "Créatrice de bijoux colorés faits main";

export const BUSINESS_INFO = {
	name: "Synclune",
	legalName: "TADDEI LEANE",
	tradeName: "Synclune",
	/**
	 * LA chaîne d'identité de la marque — publiée dans les nœuds
	 * `LocalBusiness` ET `Organization` du `@graph` de chaque page, donc la
	 * description de Synclune la plus lue par les moteurs.
	 *
	 * ⚠️ Elle disait « faits main avec amour […] pour le quotidien et les
	 * occasions spéciales » : « avec amour » est le registre interchangeable que
	 * `docs/BRAND-DA.md` § ADN écarte, et « occasions spéciales » tirait vers la
	 * cérémonie — un des mots à NE PAS mettre au centre (§ dédiée). Le texte
	 * ci-dessous est la formulation LONGUE de référence du même document,
	 * augmentée de la clause fait-main. Toute réécriture repasse par là, jamais
	 * par une variante locale.
	 */
	description:
		"Synclune crée à Nantes des bijoux miniatures, colorés et expressifs, inspirés par les fruits, la pluie, les tableaux, le ciel et les souvenirs d'enfance. Chaque pièce est peinte ou assemblée à la main, en petite série.",
	email: BRAND.contact.email,
	// Informations légales
	siren: "839 183 027",
	siret: "839 183 027 00037",
	vat: "FR35839183027",
	apeCode: "47.91B",
	social: BRAND.social,
	/**
	 * Localisation de l'atelier.
	 *
	 * ⚠️ **`street` ne va PAS dans le JSON-LD.** L'atelier n'accueille pas de
	 * public : publier le numéro de rue dans un `PostalAddress` moissonnable
	 * revient à publier une adresse résidentielle, pour un gain nul (le nœud
	 * `Organization` n'exige aucune adresse, et une fiche Google Business Profile
	 * suppose un local réellement visitable — expédier un colis n'ouvre pas ce
	 * droit). Le balisage ne porte donc que ville + région + pays.
	 *
	 * `street` reste ici parce qu'une surface l'exige : `/informations-legales`,
	 * où l'adresse complète est une **obligation légale** — mais c'est du HTML lu
	 * par une personne, pas un champ conçu pour être moissonné. Les coordonnées
	 * GPS, elles, ont été supprimées le 2026-08-06 : plus aucun consommateur, et
	 * elles ne servaient qu'au `geo` du `LocalBusiness` retiré.
	 */
	location: {
		street: "77 Boulevard du Tertre",
		city: "Nantes",
		region: "Loire-Atlantique",
		regionCode: "44",
		country: "France",
		countryCode: "FR",
		postalCode: "44100",
		// Description pour le SEO local
		addressLocality: "Nantes",
		addressRegion: "Pays de la Loire",
	},
	// Mots-clés SEO — repris VERBATIM de `docs/BRAND-DA.md` § Expressions à
	// privilégier. Les quatre précédents (« bijoux faits main France »,
	// « bijoux artisanaux France »…) étaient vrais et interchangeables : aucun
	// ne portait le lieu, la peinture ni la couleur comme sujet.
	//
	// ⚠️ La garde « uniquement quand c'est vrai pour la pièce » vaut aussi ici.
	// Elle est tenue au niveau du site : `shared/constants/atelier-content.ts`
	// atteste la peinture à la main et l'assemblage. Ne pas y ajouter une
	// expression descriptive (rose, cœur, arc-en-ciel) qui ne serait vraie que
	// d'une partie du catalogue.
	localKeywords: [
		"bijoux colorés faits main",
		"bijoux faits main à Nantes",
		"bijoux de créatrice française",
		"boucles d'oreilles colorées artisanales",
		"bague peinte à la main",
	],
} as const;

/**
 * LE titre de la boutique — SSOT du `<title>` de l'accueil ET du repli global.
 *
 * ⚠️ Les deux surfaces avaient DIVERGÉ, et c'est le repli qui portait la copie
 * périmée : `page.tsx` disait déjà « Bijoux colorés faits main à Nantes » quand
 * `root-metadata.ts` répétait « Bijoux artisanaux faits main » en **cinq**
 * littéraux (titre, description, `og:title`, `og:description`, `og:image.alt`,
 * `twitter:title`), avec en prime deux variantes contradictoires entre l'OG et
 * Twitter. Or le repli est la surface la plus HÉRITÉE du site : toute page qui ne
 * redéfinit pas son OG en hérite.
 *
 * « Bijoux artisanaux faits main » est un pléonasme sans couleur ni lieu — la
 * formule que `docs/BRAND-DA.md` classe comme *juste mais interchangeable*.
 *
 * 45 caractères, sous la borne de 60 au-delà de laquelle Google tronque.
 */
export const HOME_TITLE = "Synclune | Bijoux colorés faits main à Nantes";

/**
 * LA description de la boutique — SSOT de la meta de l'accueil ET du repli global.
 *
 * Même histoire que `HOME_TITLE`. Jamais de promesse logistique dans une meta :
 * une variante annonçait une « livraison rapide » que la FAQ contredit (délai de
 * préparation PUIS envoi suivi — chaque pièce est faite main).
 *
 * Le noyau lexical à défendre est couleur + fait main + miniature + récit +
 * Nantes ; la chute reprend la formulation COURTE de référence de la DA.
 *
 * 140 caractères, sous la borne de 155 au-delà de laquelle Google tronque.
 */
export const HOME_DESCRIPTION =
	"Bijoux colorés faits main à Nantes. Boucles, colliers et bagues peints et assemblés un par un par Léane — des petits mondes colorés à porter.";

/** Alt de la carte d'aperçu social : DÉCRIT l'image, ne recopie pas le titre (le « | » est une convention de SERP). */
export const HOME_OG_ALT = "Synclune — bijoux colorés faits main à Nantes";

export const SEO_DEFAULTS = {
	siteName: BUSINESS_INFO.name,
	locale: "fr_FR",
	type: "website",
	images: {
		// Image par defaut pour Open Graph (generee dynamiquement par app/opengraph-image.tsx)
		default: `${SITE_URL}/opengraph-image`,
		width: 1200,
		height: 630,
	},
	twitter: {
		card: "summary_large_image",
		// Pas de compte Twitter/X - utilisation du card type uniquement
	},
} as const;

/**
 * Génère les données structurées LocalBusiness pour le référencement
 */
export function getLocalBusinessSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "LocalBusiness",
		"@id": `${SITE_URL}/#local-business`,
		name: BUSINESS_INFO.name,
		legalName: BUSINESS_INFO.legalName,
		description: BUSINESS_INFO.description,
		url: SITE_URL,
		logo: `${SITE_URL}/logo.webp`,
		image: `${SITE_URL}/opengraph-image`,
		email: BUSINESS_INFO.email,
		// Ni `streetAddress` ni `geo` : cf. le JSDoc de `BUSINESS_INFO.location`.
		// L'atelier n'accueille pas de public, donc le numéro de rue et les
		// coordonnées GPS ne décrivent qu'un domicile — dans un champ moissonnable,
		// et pour zéro rich result de plus (`LocalBusiness` n'exige que `address`,
		// que ville + région + pays satisfont).
		address: {
			"@type": "PostalAddress",
			addressLocality: BUSINESS_INFO.location.addressLocality,
			addressRegion: BUSINESS_INFO.location.addressRegion,
			addressCountry: BUSINESS_INFO.location.countryCode,
			postalCode: BUSINESS_INFO.location.postalCode,
		},
		areaServed: [
			{
				"@type": "Country",
				name: "France",
			},
		],
		priceRange: "€€",
		sameAs: [BUSINESS_INFO.social.instagram.url, BUSINESS_INFO.social.tiktok.url],
		brand: {
			"@type": "Brand",
			name: BUSINESS_INFO.name,
			logo: `${SITE_URL}/logo.webp`,
		},
		founder: {
			"@type": "Person",
			name: "Léane Taddei",
			// Même `jobTitle` que le nœud `Person` de `getFounderSchema()` : les
			// deux nœuds décrivent la MÊME personne et cohabitent dans le `@graph`
			// de chaque page. Ils disaient « Artisan créateur de bijoux » ici et
			// « Créatrice de bijoux artisanaux » là — deux intitulés divergents
			// pour un seul `@id`.
			jobTitle: FOUNDER_JOB_TITLE,
			// Pas d'`address` : l'adresse d'une PERSONNE nommée est la donnée la plus
			// sensible du graphe, elle n'ouvre aucun rich result, et elle était ici la
			// TROISIÈME copie de la même adresse dans le même `@graph`.
		},
		knowsAbout: [
			"Bijoux faits main",
			"Bijoux artisanaux",
			"Création de bijoux",
			"Bijoux colorés",
			"Bijoux originaux",
		],
		hasOfferCatalog: {
			"@type": "OfferCatalog",
			name: "Bijoux Synclune",
			itemListElement: [
				{
					"@type": "OfferCatalog",
					name: "Boucles d'oreilles",
					itemListElement: [
						{
							"@type": "Offer",
							itemOffered: {
								"@type": "Product",
								name: "Boucles d'oreilles artisanales",
							},
						},
					],
				},
				{
					"@type": "OfferCatalog",
					name: "Colliers",
					itemListElement: [
						{
							"@type": "Offer",
							itemOffered: {
								"@type": "Product",
								name: "Colliers faits main",
							},
						},
					],
				},
				{
					"@type": "OfferCatalog",
					name: "Bracelets",
					itemListElement: [
						{
							"@type": "Offer",
							itemOffered: {
								"@type": "Product",
								name: "Bracelets artisanaux",
							},
						},
					],
				},
			],
		},
	};
}

/**
 * Génère les données structurées Person pour la créatrice Léane Taddei
 * Renforce l'E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
 */
export function getFounderSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "Person",
		"@id": `${SITE_URL}/#founder`,
		name: "Léane Taddei",
		jobTitle: FOUNDER_JOB_TITLE,
		// Première personne, comme le chapô du premier écran et la copie de la
		// section atelier — c'est la même voix. « avec amour » est parti pour la
		// même raison que dans `BUSINESS_INFO.description` ci-dessus.
		description:
			"Créatrice de bijoux colorés à Nantes. Je peins et j'assemble chaque pièce à la main dans mon atelier — des bijoux miniatures et narratifs, jamais deux fois les mêmes.",
		url: SITE_URL,
		// Champ OMIS tant que l'asset est mort (404) — une URL d'image cassée
		// dans un nœud Person dessert l'E-E-A-T au lieu de le renforcer.
		...(IMAGES.FOUNDER && { image: IMAGES.FOUNDER }),
		sameAs: [BUSINESS_INFO.social.instagram.url, BUSINESS_INFO.social.tiktok.url],
		worksFor: {
			"@id": `${SITE_URL}/#organization`,
		},
		// Les deux derniers nomment les savoir-faire RÉELS attestés par
		// `atelier-content.ts` (peinture, plastique fou) — les quatre premiers
		// décriraient n'importe quelle créatrice de bijoux.
		knowsAbout: [
			"Création de bijoux",
			"Bijoux faits main",
			"Artisanat",
			"Design de bijoux",
			"Bijoux colorés",
			"Peinture miniature",
			"Plastique fou",
		],
		address: {
			"@type": "PostalAddress",
			addressLocality: BUSINESS_INFO.location.addressLocality,
			addressRegion: BUSINESS_INFO.location.addressRegion,
			addressCountry: BUSINESS_INFO.location.countryCode,
		},
	};
}

/**
 * Génère les données structurées Organization
 */
export function getOrganizationSchema() {
	return {
		"@context": "https://schema.org",
		// Sous-type e-commerce d'`Organization` : c'est celui que Google documente
		// pour une boutique en ligne, et il conditionne l'interprétation de
		// `hasShippingService` / `hasMerchantReturnPolicy` ci-dessous.
		"@type": "OnlineStore",
		"@id": `${SITE_URL}/#organization`,
		name: BUSINESS_INFO.name,
		legalName: BUSINESS_INFO.legalName,
		url: SITE_URL,
		logo: {
			"@type": "ImageObject",
			"@id": `${SITE_URL}/#logo`,
			url: `${SITE_URL}/logo.webp`,
			contentUrl: `${SITE_URL}/logo.webp`,
			caption: BUSINESS_INFO.name,
		},
		image: {
			"@type": "ImageObject",
			"@id": `${SITE_URL}/#image`,
			url: `${SITE_URL}/opengraph-image`,
			contentUrl: `${SITE_URL}/opengraph-image`,
		},
		description: BUSINESS_INFO.description,
		email: BUSINESS_INFO.email,
		sameAs: [BUSINESS_INFO.social.instagram.url, BUSINESS_INFO.social.tiktok.url],
		// Sans `streetAddress` : cf. le JSDoc de `BUSINESS_INFO.location`.
		// `Organization` n'a de toute façon aucune propriété obligatoire.
		address: {
			"@type": "PostalAddress",
			addressLocality: BUSINESS_INFO.location.addressLocality,
			addressRegion: BUSINESS_INFO.location.addressRegion,
			postalCode: BUSINESS_INFO.location.postalCode,
			addressCountry: BUSINESS_INFO.location.countryCode,
		},
		contactPoint: {
			"@type": "ContactPoint",
			contactType: "customer service",
			email: BUSINESS_INFO.email,
			availableLanguage: "French",
		},
		paymentAccepted: "Visa, Mastercard, CB, Apple Pay",
		/**
		 * Politique de livraison déclarée **une seule fois**, au niveau du marchand.
		 *
		 * Depuis novembre 2025, Google lit `hasShippingService` sur `Organization`
		 * au lieu d'exiger un `OfferShippingDetails` répété sur chaque produit — pour
		 * un périmètre France + UE, c'est quelques lignes écrites une fois contre une
		 * répétition par bijou. Les montants et les délais dérivent de la SSOT
		 * `SHIPPING_RATES` : une page d'accueil qui annoncerait un port que le tunnel
		 * facture autrement fabrique le motif d'abandon nº 1.
		 */
		hasShippingService: [
			buildShippingService(SHIPPING_RATES.FR, [...SHIPPING_RATES.FR.countries]),
			buildShippingService(SHIPPING_RATES.EU, [...SHIPPING_RATES.EU.countries]),
		],
		/**
		 * Politique de retour, déclarée au même niveau et pour le même motif.
		 *
		 * ⚠️ `returnFees` vaut **`ReturnShippingFees`**, pas `FreeReturn` : les CGV
		 * (§ 6.3) et `/retractation` disent toutes deux « les frais de retour sont à
		 * votre charge ». Le nœud produit affirmait l'inverse à Google — déclarer un
		 * retour gratuit qu'on ne pratique pas est une allégation commerciale fausse,
		 * pas une inexactitude de balisage.
		 */
		hasMerchantReturnPolicy: {
			"@type": "MerchantReturnPolicy",
			applicableCountry: [...SHIPPING_COUNTRIES],
			returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
			merchantReturnDays: LEGAL_WITHDRAWAL_DAYS,
			returnMethod: "https://schema.org/ReturnByMail",
			returnFees: "https://schema.org/ReturnShippingFees",
		},
	};
}

/**
 * Un `OfferShippingDetails` de marchand, dérivé d'un tarif de `SHIPPING_RATES`.
 *
 * `estimatedDays` est une chaîne lisible (« 2-4 jours ouvrés ») parce que c'est
 * aussi ce que la FAQ et le pied de page affichent ; Google veut un intervalle
 * numérique. On le dérive plutôt que de le ressaisir — un délai qui diverge entre
 * la page et le balisage est exactement ce que cette SSOT existe pour empêcher.
 */
function buildShippingService(
	rate: (typeof SHIPPING_RATES)[keyof typeof SHIPPING_RATES],
	countries: string[],
) {
	const [transitMin, transitMax] = parseDayRange(rate.estimatedDays);
	const [handlingMin, handlingMax] = PREPARATION_BUSINESS_DAYS;

	return {
		"@type": "OfferShippingDetails",
		shippingRate: {
			"@type": "MonetaryAmount",
			value: (rate.amount / 100).toFixed(2),
			currency: "EUR",
		},
		shippingDestination: {
			"@type": "DefinedRegion",
			addressCountry: countries,
		},
		deliveryTime: {
			"@type": "ShippingDeliveryTime",
			handlingTime: {
				"@type": "QuantitativeValue",
				minValue: handlingMin,
				maxValue: handlingMax,
				unitCode: "DAY",
			},
			transitTime: {
				"@type": "QuantitativeValue",
				minValue: transitMin,
				maxValue: transitMax,
				unitCode: "DAY",
			},
		},
	};
}

/** « 2-4 jours ouvrés » → `[2, 4]`. Replie sur les deux bornes trouvées, ou `[2, 4]`. */
function parseDayRange(label: string): [number, number] {
	const found = label.match(/\d+/g);
	if (!found || found.length < 2) return [2, 4];
	return [Number(found[0]), Number(found[1])];
}

/**
 * Génère les données structurées WebSite avec SearchAction
 * Améliore le référencement en permettant à Google de comprendre
 * que le site dispose d'une fonction de recherche
 */
export function getWebSiteSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${SITE_URL}/#website`,
		url: SITE_URL,
		name: BUSINESS_INFO.name,
		description: BUSINESS_INFO.description,
		publisher: {
			"@id": `${SITE_URL}/#organization`,
		},
		potentialAction: {
			"@type": "SearchAction",
			target: {
				"@type": "EntryPoint",
				urlTemplate: `${SITE_URL}/produits?search={search_term_string}`,
			},
			"query-input": "required name=search_term_string",
		},
	};
}
