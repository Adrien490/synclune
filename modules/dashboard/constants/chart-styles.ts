/**
 * Constantes de style standardisees pour les charts et KPIs du dashboard
 * Garantit la coherence visuelle entre tous les composants
 * Utilise uniquement des classes Tailwind natives
 */
export const CHART_STYLES = {
  /** Bordure standardisee (style Overview) */
  border: "border-l-4 border-primary/30",

  /** Gradient de fond standardise */
  gradient: "bg-linear-to-br from-primary/5 to-transparent",

  /** Combinaison complete pour les cartes de chart */
  card: "border-l-4 border-primary/30 bg-linear-to-br from-primary/5 to-transparent",

  /** Hauteurs standardisees pour les charts */
  height: {
    /** Hauteur par defaut pour les charts principaux */
    default: "h-75",
    /** Hauteur compacte pour les charts secondaires */
    compact: "h-[250px]",
    /** Hauteur responsive (220px sm, 250px md, 300px lg) */
    responsive: "h-55 sm:h-[250px] md:h-75",
    /** Hauteur compacte responsive */
    compactResponsive: "h-45 sm:h-50 md:h-[250px]",
    /** Hauteur fluide avec clamp() pour adaptation continue */
    fluid: "h-[clamp(200px,40vw,300px)]",
    /** Hauteur pour pie charts (carre contraint) */
    pie: "h-[clamp(200px,min(50vw,50vh),300px)]",
  },

  /** Styles specifiques pour pie charts */
  pie: {
    /** Container pour centrer et limiter la taille */
    container: "w-full max-w-75 mx-auto",
  },

  /** Padding standardise pour les cards */
  padding: {
    /** Padding standard pour les cards de chart (24px) */
    card: "p-6",
    /** Padding compact pour les charts secondaires (16px) */
    cardCompact: "p-4",
    /** Padding pour le contenu interne des charts */
    content: "px-6 pb-6",
  },

  /** Typographie des titres de charts */
  title: "text-xl font-semibold tracking-wide",

  /** Typographie des descriptions */
  description: "text-sm text-muted-foreground",

  /** Couleurs d'evolution standardisees (Tailwind) */
  evolution: {
    /** Classe pour evolution positive (+) */
    positive: "text-emerald-600",
    /** Classe pour evolution negative (-) */
    negative: "text-rose-600",
  },

  /** Touch targets WCAG - minimum 44px (h-11 = 44px) */
  touchTarget: {
    /** Bouton minimal WCAG compliant */
    button: "h-11 min-w-11",
    /** Icon button WCAG compliant */
    iconButton: "h-11 w-11",
  },

  /** Espacements dashboard */
  spacing: {
    /** Gap entre KPI cards */
    kpiGap: "gap-4",
    /** Gap entre sections */
    sectionGap: "gap-6",
  },

  /** Transitions standardisees */
  transition: {
    /** Transition par defaut pour hover effects */
    default: "transition-all duration-300",
    /** Transition rapide pour interactions */
    fast: "transition-all duration-200",
  },

  /** Dimensions Recharts standardisees (en pixels) */
  dimensions: {
    /** Largeur Y-axis responsive */
    yAxis: { sm: 80, md: 100, lg: 120 },
    /** Hauteurs de chart */
    chartHeight: { compact: 250, default: 300, expanded: 400 },
    /** Marges internes Recharts */
    margin: { top: 10, right: 10, bottom: 0, left: 0 },
  },

  /** Styles mobile */
  mobile: {
    /** Container scroll horizontal mobile */
    scrollContainer: "overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible",
    /** Largeur minimum pour scroll */
    minChartWidth: "min-w-125 md:min-w-0",
  },
} as const

/** Type pour les cles de hauteur */
export type ChartHeightKey = keyof typeof CHART_STYLES.height;
