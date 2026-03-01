/**
 * Formats an isActive boolean filter into a localized status label.
 * Used by multiple admin filter-badges components to avoid duplication.
 *
 * @param value - The filter value ("true" or "false")
 * @param activeLabel - Label when active (default: "Actifs")
 * @param inactiveLabel - Label when inactive (default: "Inactifs")
 */
export function formatStatusFilter(
	value: string,
	activeLabel = "Actifs",
	inactiveLabel = "Inactifs",
): { label: string; displayValue: string } {
	return {
		label: "Statut",
		displayValue: value === "true" ? activeLabel : inactiveLabel,
	};
}
