// ============================================================================
// DASHBOARD PERIOD CONFIGURATION
//
// Lot 4 SIMPLIFICATION.md S3.5 (2026-08-03) : le sélecteur de période est
// parti — le tableau de bord montre le MOIS EN COURS, point. Le type et le
// défaut restent car `getPeriodBoundaries` en dépend ; les labels, le parsing
// d'URL et les libellés de comparaison sont morts avec le sélecteur.
// ============================================================================

export type DashboardPeriod = "7d" | "30d" | "month" | "quarter" | "year";

export const DEFAULT_PERIOD: DashboardPeriod = "month";
