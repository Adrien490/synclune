import { Package, TrendingUp, ShoppingCart, type LucideIcon } from "lucide-react"

export interface EmptyStateConfig {
  icon: LucideIcon
  title: string
  description: string
  variant?: "default" | "success"
}

/**
 * Configurations des états vides pour les composants du dashboard
 * Garantit des messages cohérents et localisés
 */
export const EMPTY_STATES = {
  noData: {
    icon: Package,
    title: "Aucune donnée",
    description: "Les données apparaîtront ici une fois disponibles.",
  },
  noOrders: {
    icon: ShoppingCart,
    title: "Aucune commande",
    description: "Les commandes apparaîtront ici.",
  },
  noProducts: {
    icon: Package,
    title: "Aucun produit",
    description: "Les produits apparaîtront ici.",
  },
  allSold: {
    icon: TrendingUp,
    variant: "success" as const,
    title: "Tous les produits ont été vendus !",
    description: "Aucun produit n'est resté invendu.",
  },
} as const satisfies Record<string, EmptyStateConfig>

export type EmptyStateType = keyof typeof EMPTY_STATES
