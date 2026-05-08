export const sizeClasses = {
	dots: {
		xs: "size-0.5",
		sm: "size-1",
		md: "size-1.5",
		lg: "size-2",
		xl: "size-2.5",
	},
};

export const bgColorClass = {
	default: "bg-muted-foreground",
	primary: "bg-primary",
	secondary: "bg-secondary",
	foreground: "bg-foreground",
	muted: "bg-muted",
	accent: "bg-accent",
	success: "bg-emerald-600",
	warning: "bg-amber-600",
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
