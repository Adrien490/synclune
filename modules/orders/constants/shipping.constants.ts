/**
 * Constantes pour la gestion des frais de port
 *
 * Les fonctions de calcul sont dans @/modules/orders/services/shipping.service.ts
 */

// Re-exporter les types et constantes de shipping-rates
export {
	SHIPPING_RATES,
	ALLOWED_SHIPPING_COUNTRIES,
	type ShippingRate,
	type AllowedShippingCountry,
	type ShippingCarrier,
} from "@/modules/orders/constants/shipping-rates";

// Re-exporter les fonctions depuis le service
export {
	getShippingRate,
	isShippingAvailable,
	formatShippingPrice,
} from "@/modules/orders/services/shipping.service";
