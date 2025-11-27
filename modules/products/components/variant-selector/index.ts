// Component
export { VariantSelector } from "./variant-selector";

// Note: Les hooks (use-product-variants, use-sku-selection, use-variant-validation)
// ne sont pas exportés car ils sont utilisés uniquement en interne par VariantSelector.
// Cela évite les erreurs "use client" lors de l'import depuis un Server Component.
