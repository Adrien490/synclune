/**
 * Types pour la sélection et le calcul de stock des SKUs
 *
 * NOTE: Ces types sont maintenant définis dans shared/types/product-sku.types.ts
 * pour éviter la dépendance circulaire avec le module products.
 * Ce fichier ré-exporte pour rétrocompatibilité.
 */

export type { StockStatus, ProductStockInfo } from "@/shared/types/product-sku.types";
