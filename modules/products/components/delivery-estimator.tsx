import {
	PREPARATION_BUSINESS_DAYS,
	SHIPPING_RATES,
} from "@/modules/orders/constants/shipping-rates";
import { parseEstimatedDays } from "@/modules/orders/services/shipping.service";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { addBusinessDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { cacheLife, cacheTag } from "next/cache";
import { TruckIcon } from "@phosphor-icons/react/ssr";

/**
 * DeliveryEstimator - Estimated delivery date range on product page
 *
 * Calculates dynamic delivery dates based on preparation time + shipping time,
 * skipping weekends via date-fns addBusinessDays.
 * Proven conversion driver (Baymard: 64% look for delivery info before add-to-cart).
 *
 * ⚠️ **C'est un Server Component, et ça doit le rester.** Il lit l'horloge
 * (`new Date()`) pour dériver la fenêtre : monté depuis un composant client, ce
 * rendu cesse d'être déterministe (le SSR et l'hydratation peuvent tomber de part
 * et d'autre de minuit) et le React Compiler se voit confier une valeur impure.
 * Il était rendu depuis `ProductDetails` (`"use client"`) jusqu'au 2026-08-07 ;
 * il est désormais monté par `app/(shop)/creations/[slug]/page.tsx` et relayé en
 * `ReactNode` via la prop `deliveryEstimate`. Ne pas le ré-importer depuis un
 * fichier `"use client"` — verrouillé par
 * `__tests__/delivery-estimator-stays-server.regression.test.ts`. Le `"use cache"`
 * de `getDeliveryWindow()` ci-dessous l'y verrouille une seconde fois : la
 * directive est illégale dans le graphe client.
 */
const formatDeliveryDate = (date: Date) => format(date, "d MMMM", { locale: fr });

/**
 * Fenêtre de livraison, dérivée de l'horloge DANS un scope caché.
 *
 * ⚠️ Le scope n'est pas du confort : sous Cache Components, lire l'heure courante
 * pendant un prerender est une **erreur** (`blocking-prerender-current-time`) —
 * c'est ce qui faisait échouer le prerender de `/creations/[slug]` le 2026-08-08,
 * alors même que le composant était déjà côté serveur. Même remède que
 * `getPriceValidUntil()` de la même route : seule la **valeur dérivée** est cachée,
 * la clé sans argument fait une entrée unique rafraîchie par le profil `catalog`.
 * Décalage possible de quelques minutes autour de minuit, pour une fenêtre exprimée
 * en jours ouvrés — invisible.
 *
 * ⚠️ Ne PAS « corriger » par `await connection()` : la fiche entière basculerait au
 * temps de requête (le composant est monté dans la colonne d'achat, sous le
 * `Suspense` de `ProductMainSkeleton`), donc un squelette pour tout le monde au prix
 * d'une date à la minute que personne ne lit à la minute.
 *
 * Tag `PRODUCTS_LIST` : même levier que `getPriceValidUntil` — sans tag l'entrée
 * n'a aucune invalidation possible et n'attend que l'expiration du profil.
 */
async function getDeliveryWindow(): Promise<{ min: string; max: string }> {
	"use cache";
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);

	const now = new Date();

	// Préparation atelier — SSOT partagée avec `PRODUCT_TEXTS` (auparavant codée en
	// dur ici, avec un commentaire renvoyant à une constante que personne ne lisait).
	const [prepMin, prepMax] = PREPARATION_BUSINESS_DAYS;

	// Shipping: from SHIPPING_RATES (FR zone as default display)
	const [shipMin, shipMax] = parseEstimatedDays(SHIPPING_RATES.FR.estimatedDays);

	return {
		min: formatDeliveryDate(addBusinessDays(now, prepMin + shipMin)),
		max: formatDeliveryDate(addBusinessDays(now, prepMax + shipMax)),
	};
}

export async function DeliveryEstimator() {
	const { min, max } = await getDeliveryWindow();

	return (
		<div className="text-muted-foreground flex items-center gap-2.5 text-sm">
			<TruckIcon className="text-foreground size-4 shrink-0" aria-hidden="true" />
			{/* « (France) » : la fenêtre est calculée sur le barème FR — sans la
			    mention, une cliente UE (5-8 j ouvrés) lisait une promesse plus
			    courte que la sienne. La fenêtre UE s'affiche sur /paiement. */}
			<p>
				Livraison estimée entre le <span className="text-foreground font-medium">{min}</span> et le{" "}
				<span className="text-foreground font-medium">{max}</span> (France)
			</p>
		</div>
	);
}
