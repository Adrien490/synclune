/**
 * Standardized style constants for dashboard charts and KPIs
 * Ensures visual consistency across all components
 * Uses only native Tailwind classes
 */
export const CHART_STYLES = {
	border: "border-l-4 border-primary/30",
	gradient: "bg-linear-to-br from-primary/5 to-transparent",
	card: "border-l-4 border-primary/30 bg-linear-to-br from-primary/5 to-transparent",

	height: {
		default: "h-75",
		compact: "h-[250px]",
		responsive: "h-55 sm:h-[250px] md:h-75",
		compactResponsive: "h-45 sm:h-50 md:h-[250px]",
		fluid: "h-[clamp(200px,40vw,300px)]",
		pie: "h-[clamp(200px,min(50vw,50vh),300px)]",
	},

	pie: {
		container: "w-full max-w-75 mx-auto",
	},

	padding: {
		card: "p-6",
		cardCompact: "p-4",
		content: "px-6 pb-6",
	},

	title: "text-xl font-semibold tracking-wide",
	description: "text-sm text-muted-foreground",

	evolution: {
		positive: "text-emerald-600",
		negative: "text-rose-600",
	},

	touchTarget: {
		button: "h-11 min-w-11",
		iconButton: "h-11 w-11",
	},

	spacing: {
		kpiGap: "gap-4",
		sectionGap: "gap-6",
	},

	transition: {
		default: "transition-all duration-300",
		fast: "transition-all duration-200",
	},

	dimensions: {
		yAxis: { sm: 80, md: 100, lg: 120 },
		chartHeight: { compact: 250, default: 300, expanded: 400 },
		margin: { top: 10, right: 10, bottom: 0, left: 0 },
	},

	mobile: {
		scrollContainer:
			"overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible",
		minChartWidth: "min-w-125 md:min-w-0",
	},
} as const;

export type ChartHeightKey = keyof typeof CHART_STYLES.height;
