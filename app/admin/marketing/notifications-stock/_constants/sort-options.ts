import {
	STOCK_NOTIFICATIONS_SORT_OPTIONS,
	STOCK_NOTIFICATIONS_SORT_LABELS,
} from "@/modules/stock-notifications/data/get-stock-notifications-admin";

export const SORT_OPTIONS = Object.values(STOCK_NOTIFICATIONS_SORT_OPTIONS);

export const SORT_OPTIONS_FOR_SELECT = SORT_OPTIONS.map((value) => ({
	value,
	label: STOCK_NOTIFICATIONS_SORT_LABELS[value] || value,
}));

export const DEFAULT_SORT = STOCK_NOTIFICATIONS_SORT_OPTIONS.CREATED_DESC;
