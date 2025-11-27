export const sizeClasses = {
	dots: {
		xs: "h-0.5 w-0.5",
		sm: "h-1 w-1",
		md: "h-1.5 w-1.5",
		lg: "h-2 w-2",
		xl: "h-2.5 w-2.5",
	},
};

export const bgColorClass = {
	default: "bg-muted-foreground",
	primary: "bg-primary",
	secondary: "bg-secondary",
	foreground: "bg-foreground",
	muted: "bg-muted",
	accent: "bg-accent",
	success: "bg-emerald-600 dark:bg-emerald-500",
	warning: "bg-amber-600 dark:bg-amber-500",
	destructive: "bg-destructive",
	white: "bg-white",
};

// Animation presets pour framer-motion
export const loaderAnimations = {
	container: {
		initial: { opacity: 0 },
		animate: {
			opacity: 1,
			transition: {
				staggerChildren: 0.15,
			},
		},
	},
	dot: {
		initial: {
			opacity: 0.2,
			scale: 0.6,
		},
		animate: {
			opacity: [0.2, 1, 0.2],
			scale: [0.6, 1, 0.6],
		},
	},
};
