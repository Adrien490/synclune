/**
 * Constantes de style standardisées pour les charts du dashboard
 * Garantit la cohérence visuelle entre tous les composants
 */
export const CHART_STYLES = {
  /** Bordure standardisée (style Overview) */
  border: "border-l-4 border-primary/30",

  /** Gradient de fond standardisé */
  gradient: "bg-gradient-to-br from-primary/3 to-transparent",

  /** Combinaison complète pour les cartes de chart */
  card: "border-l-4 border-primary/30 bg-gradient-to-br from-primary/3 to-transparent",

  /** Hauteurs standardisées */
  height: {
    /** Hauteur par défaut pour les charts principaux */
    default: "min-h-[300px]",
    /** Hauteur compacte pour les charts secondaires */
    compact: "min-h-[250px]",
  },

  /** Typographie des titres de charts */
  title: "text-xl font-semibold tracking-wide",

  /** Typographie des descriptions */
  description: "text-sm text-muted-foreground",
} as const
