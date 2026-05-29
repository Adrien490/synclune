import type { useCreateRefundForm } from "@/modules/refunds/hooks/use-create-refund-form";

/**
 * Type de l'instance de formulaire TanStack Form du remboursement, dérivé du
 * hook source. Calque `CreateProductFormInstance` — permet de typer les props
 * des sous-cards (`refund-items-card`, `refund-sidebar-cards`) sans dupliquer
 * la forme du formulaire.
 */
export type CreateRefundFormInstance = ReturnType<typeof useCreateRefundForm>["form"];
