import type { GetOrdersParams } from "@/modules/orders/types/order.types";
import type { OrdersSearchParams } from "../page";
import { getAllParams, getFirstParam } from "@/shared/utils/params";
import { ORDER_TOTAL_FILTER_MAX_CENTS } from "@/modules/orders/constants/order.constants";

type OrderFilters = NonNullable<GetOrdersParams["filters"]>;

/**
 * Convertit une borne de montant (EUROS, depuis l'URL) en centimes valides.
 *
 * Retourne `undefined` — donc « pas de filtre » — pour toute valeur que
 * `orderFiltersSchema` refuserait, au lieu de la propager jusqu'au `safeParse` de
 * `getOrders` qui **throw** (« Invalid parameters ») hors du `try/catch` de
 * `fetchOrders` → error boundary. Une URL forgée ne doit jamais produire un 500.
 */
const parseAmountToCents = (raw: string): number | undefined => {
	const euros = Number(raw);
	if (!Number.isFinite(euros) || euros < 0) return undefined;

	// `.int()` côté schéma : arrondir, sinon `10.005 €` → 1000.5 centimes → rejet.
	const cents = Math.round(euros * 100);
	if (cents > ORDER_TOTAL_FILTER_MAX_CENTS) return undefined;

	return cents;
};

/** Parse une date d'URL en rejetant les `Invalid Date` (`new Date("garbage")`). */
const parseDate = (raw: string): Date | undefined => {
	const date = new Date(raw);
	return Number.isNaN(date.getTime()) ? undefined : date;
};

/** Remet deux bornes comparables dans l'ordre croissant (no-op si l'une est absente). */
const sortedBounds = <T extends number | Date>(
	min: T | undefined,
	max: T | undefined,
): [T | undefined, T | undefined] =>
	min !== undefined && max !== undefined && min > max ? [max, min] : [min, max];

export const parseFilters = (params: OrdersSearchParams): GetOrdersParams["filters"] => {
	let status: OrderFilters["status"] = undefined;
	let paymentStatus: OrderFilters["paymentStatus"] = undefined;
	let fulfillmentStatus: OrderFilters["fulfillmentStatus"] = undefined;
	let invoiceStatus: OrderFilters["invoiceStatus"] = undefined;
	let invoiceAnomaly: boolean | undefined = undefined;
	let pdfNotArchived: boolean | undefined = undefined;
	let retryDeferred: boolean | undefined = undefined;
	let totalMin: number | undefined = undefined;
	let totalMax: number | undefined = undefined;
	let createdAfter: Date | undefined = undefined;
	let createdBefore: Date | undefined = undefined;
	let showDeleted: "all" | "active" | "deleted" = "active";

	Object.entries(params).forEach(([key, value]) => {
		if (key.startsWith("filter_")) {
			const filterKey = key.replace("filter_", "");
			const filterValue = getFirstParam(value);
			// Les 4 filtres d'énumération sont MULTI-SÉLECTION : la feuille de filtres
			// écrit `params.append(...)` une fois par case cochée, et le schéma comme le
			// query-builder acceptent déjà `T | T[]`. `getFirstParam()` ne retenait que la
			// première valeur → toutes les cases suivantes étaient silencieusement ignorées,
			// et aucun lien profond ne pouvait exprimer « PAID ou PARTIALLY_REFUNDED ».
			const filterValues = getAllParams(value);

			if (filterValues) {
				switch (filterKey) {
					case "status":
						status = filterValues as OrderFilters["status"];
						break;
					case "paymentStatus":
						paymentStatus = filterValues as OrderFilters["paymentStatus"];
						break;
					case "fulfillmentStatus":
						fulfillmentStatus = filterValues as OrderFilters["fulfillmentStatus"];
						break;
					case "invoiceStatus":
						invoiceStatus = filterValues as OrderFilters["invoiceStatus"];
						break;
				}
			}

			if (filterValue) {
				switch (filterKey) {
					case "invoiceAnomaly":
						invoiceAnomaly = filterValue === "true" || filterValue === "1";
						break;
					case "pdfNotArchived":
						pdfNotArchived = filterValue === "true" || filterValue === "1";
						break;
					case "retryDeferred":
						retryDeferred = filterValue === "true" || filterValue === "1";
						break;
					case "totalMin":
						totalMin = parseAmountToCents(filterValue);
						break;
					case "totalMax":
						totalMax = parseAmountToCents(filterValue);
						break;
					case "createdAfter":
						createdAfter = parseDate(filterValue);
						break;
					case "createdBefore":
						createdBefore = parseDate(filterValue);
						break;
					case "showDeleted":
						if (filterValue === "all" || filterValue === "active" || filterValue === "deleted") {
							showDeleted = filterValue;
						}
						break;
				}
			}
		}
	});

	// Bornes inversées : `orderFiltersSchema` les refuse via `.refine()`, ce qui faisait
	// throw `getOrders`. On les remet dans l'ordre — c'est l'intention évidente d'un
	// lien profond mal construit, et ça vaut mieux qu'une page d'erreur.
	//
	// Normalisation déléguée à `sortedBounds` : les comparer en place ici produisait des
	// avertissements `no-unnecessary-condition`, car TS ne suit pas les affectations
	// faites dans le callback de `forEach` et considère ces variables comme encore
	// `undefined` à ce point.
	// Argument de type explicite : les variables étant vues comme `undefined` à ce point
	// (cf. ci-dessus), l'inférence retomberait sur la contrainte `number | Date`.
	const [orderedMin, orderedMax] = sortedBounds<number>(totalMin, totalMax);
	const [orderedAfter, orderedBefore] = sortedBounds<Date>(createdAfter, createdBefore);

	return {
		status,
		paymentStatus,
		fulfillmentStatus,
		invoiceStatus,
		invoiceAnomaly,
		pdfNotArchived,
		retryDeferred,
		totalMin: orderedMin,
		totalMax: orderedMax,
		createdAfter: orderedAfter,
		createdBefore: orderedBefore,
		showDeleted,
	};
};
