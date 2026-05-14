import { fetchDashboardKpis } from "@/modules/dashboard/data/get-kpis";
import type {
	ComparisonMode,
	DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";

interface DashboardGreetingProps {
	period: DashboardPeriod;
	comparisonMode: ComparisonMode;
}

function getHourInParis(): number {
	const parts = new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		hour12: false,
		timeZone: "Europe/Paris",
	}).formatToParts(new Date());
	const hourPart = parts.find((p) => p.type === "hour");
	return hourPart ? parseInt(hourPart.value, 10) : 12;
}

function buildGreetingMessage(pendingShipmentCount: number, hour: number): string {
	if (pendingShipmentCount > 0) {
		const plural = pendingShipmentCount > 1;
		return `${pendingShipmentCount} ${plural ? "bijoux" : "bijou"} ${plural ? "attendent" : "attend"} leur enveloppe ✉`;
	}
	if (hour < 12) return "Bonjour ! L'atelier s'éveille.";
	if (hour < 19) return "L'atelier est en plein élan.";
	return "L'atelier se repose, mais la boutique veille.";
}

export async function DashboardGreeting({ period, comparisonMode }: DashboardGreetingProps) {
	let pendingShipmentCount = 0;
	try {
		const kpis = await fetchDashboardKpis(period, comparisonMode);
		pendingShipmentCount = kpis.pendingShipment.count;
	} catch {
		// Fallback gracieux : afficher le greeting horaire sans pendingShipment
	}
	const hour = getHourInParis();
	const message = buildGreetingMessage(pendingShipmentCount, hour);
	return (
		<p
			className="font-cursive text-muted-foreground/90 -mt-3 mb-6 text-base italic sm:-mt-4 sm:text-lg"
			aria-live="polite"
		>
			{message}
		</p>
	);
}
