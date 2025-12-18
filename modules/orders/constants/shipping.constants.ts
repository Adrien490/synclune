/**
 * Constantes pour la gestion des frais de port
 *
 * Les fonctions de calcul sont dans @/modules/orders/utils/shipping.utils.ts
 */

// Re-exporter les types et constantes de shipping-rates
export {
	SHIPPING_RATES,
	ALLOWED_SHIPPING_COUNTRIES,
	getShippingRate,
	isShippingAvailable,
	formatShippingPrice,
	type ShippingRate,
	type AllowedShippingCountry,
	type ShippingCarrier,
} from "@/modules/orders/constants/shipping-rates";
