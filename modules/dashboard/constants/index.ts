export {
	DASHBOARD_CACHE_TAGS,
	cacheDashboard,
	getDashboardBadgesInvalidationTags,
	getSalesKpisInvalidationTags,
	getInventoryInvalidationTags,
	getRevenueInvalidationTags,
	getAbandonmentInvalidationTags,
} from "./cache";

export { CHART_STYLES } from "./chart-styles";

export {
	GET_DASHBOARD_RECENT_ORDERS_SELECT,
	GET_DASHBOARD_TOP_PRODUCTS_SELECT,
	GET_DASHBOARD_STOCK_ALERTS_SELECT,
	DASHBOARD_RECENT_ORDERS_LIMIT,
	DASHBOARD_TOP_PRODUCTS_LIMIT,
	DASHBOARD_STOCK_ALERTS_LIMIT,
} from "./dashboard.constants";

export { EMPTY_STATES } from "./empty-states";

export {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	PAYMENT_STATUS_LABELS,
	PAYMENT_STATUS_VARIANTS,
} from "./order-status.constants";

export {
	PERIOD_OPTIONS,
	QUICK_PERIOD_OPTIONS,
	type PeriodOption,
} from "./periods";

export { DASHBOARD_TABS, type DashboardTab } from "./tabs";

export {
	TUTORIAL_STEPS,
	TUTORIAL_STORAGE_KEY,
	type TutorialStep,
} from "./tutorial-steps";
