import { cn } from "@/shared/utils/cn";

/**
 * Styles partages pour les items de navigation
 */
export const sharedItemStyles = {
	focusRing:
		"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
	transition: "motion-safe:transition-all motion-safe:active:scale-95",
	layout: "flex flex-col items-center justify-center rounded-lg relative",
} as const;

export const navItemStyles = {
	base: cn(
		sharedItemStyles.layout,
		sharedItemStyles.transition,
		sharedItemStyles.focusRing,
		"gap-1 px-3 py-2 min-w-16 min-h-12"
	),
	active: "text-foreground font-semibold",
	inactive:
		"text-muted-foreground hover:text-foreground hover:bg-accent/50 active:bg-accent/30 font-medium",
} as const;

export const panelItemStyles = {
	base: cn(
		sharedItemStyles.layout,
		sharedItemStyles.transition,
		sharedItemStyles.focusRing,
		// Touch targets ameliores pour WCAG AAA (min 44x44, ici 76x76)
		"gap-1.5 py-3 px-2 min-h-19 min-w-19 rounded-xl",
		// Reset pour que les boutons s'alignent comme les liens
		"border-0 bg-transparent appearance-none cursor-pointer"
	),
	active: "bg-accent/50 text-foreground font-semibold",
	inactive:
		"text-muted-foreground hover:text-foreground hover:bg-accent/50 active:bg-accent/30 font-medium",
	destructive:
		"text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:bg-destructive/20 font-medium",
} as const;
