import { TabNavigation } from "@/shared/components/tab-navigation";
import {
	DASHBOARD_TABS,
	DEFAULT_TAB,
	TAB_URL_KEY,
	type DashboardTab,
} from "../constants/tabs";
import {
	DEFAULT_PERIOD,
	FROM_DATE_URL_KEY,
	PERIOD_URL_KEY,
	TO_DATE_URL_KEY,
} from "../constants/periods";

interface DashboardTabsProps {
	/** Onglet actuellement actif */
	activeTab?: DashboardTab;
	/** Periode actuelle (pour la preserver dans les URLs) */
	currentPeriod?: string;
	/** Date de debut custom */
	fromDate?: string;
	/** Date de fin custom */
	toDate?: string;
}

/**
 * Navigation par onglets du dashboard admin
 * Server Component utilisant le pattern TabNavigation existant
 */
export function DashboardTabs({
	activeTab = DEFAULT_TAB,
	currentPeriod = DEFAULT_PERIOD,
	fromDate,
	toDate,
}: DashboardTabsProps) {
	// Construire les URLs en preservant les parametres de periode
	const buildTabUrl = (tabValue: DashboardTab) => {
		const params = new URLSearchParams();
		params.set(TAB_URL_KEY, tabValue);
		params.set(PERIOD_URL_KEY, currentPeriod);

		// Preserver les dates custom si presentes
		if (currentPeriod === "custom") {
			if (fromDate) params.set(FROM_DATE_URL_KEY, fromDate);
			if (toDate) params.set(TO_DATE_URL_KEY, toDate);
		}

		return `/admin?${params.toString()}`;
	};

	const items = DASHBOARD_TABS.map((tab) => ({
		label: tab.label,
		value: tab.value,
		href: buildTabUrl(tab.value),
	}));

	return (
		<TabNavigation
			items={items}
			activeValue={activeTab}
			ariaLabel="Navigation du tableau de bord"
			mobileVisibleCount={4}
		/>
	);
}
