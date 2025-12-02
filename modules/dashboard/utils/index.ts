export {
	calculateEvolutionRate,
	calculateEvolutionRate as calculateEvolution, // Alias pour compatibilité
	calculatePercentage,
	calculateRate,
	roundToDecimals,
	formatCurrency,
	formatPercentage,
} from "./calculations";

export {
	getStartOfDay,
	getEndOfDay,
	getStartOfMonth,
	getEndOfMonth,
	getStartOfYear,
	getEndOfYear,
	subtractDays,
	subtractMonths,
	DAY_MS,
} from "./date-helpers";

export {
	resolvePeriodToDates,
	formatPeriodLabel,
	type DashboardPeriod,
	type DateRange,
} from "./period-resolver";

export { truncateText } from "./truncate-text";
