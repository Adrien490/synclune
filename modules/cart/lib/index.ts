// ============================================================================
// Cart Module Library Exports
// ============================================================================

// ❌ Ne pas exporter cart-session ici car il utilise next/headers (server-only)
// Les imports doivent etre directs : import { ... } from "@/modules/cart/lib/cart-session"

// SKU Validation (server-only - "use server")
export * from "./sku-validation";

// Re-exports depuis actions/ et hooks/ pour compatibilité
export { updateCartPrices } from "../actions/update-cart-prices";
export { removeUnavailableItems } from "../actions/remove-unavailable-items";
export { useUpdateCartPrices } from "../hooks/use-update-cart-prices";
export { useRemoveUnavailableItems } from "../hooks/use-remove-unavailable-items";
