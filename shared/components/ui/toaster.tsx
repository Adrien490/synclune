"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";

/**
 * Icônes bijoux raffinées pour les toasts Synclune
 * Design ultrathink avec touches rose & doré
 */
const icons = {
	success: (
		<div className="relative">
			{/* Diamant/gemme - symbole de réussite précieuse */}
			<svg
				className="size-[18px] text-primary"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 3L4 9l8 12 8-12-8-6z"
				/>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M4 9h16"
				/>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M8.5 9L12 21l3.5-12"
				/>
			</svg>
			{/* Sparkle doré subtil */}
			<svg
				className="absolute -top-0.5 -right-0.5 size-2 text-secondary animate-pulse"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9L12 0Z" />
			</svg>
		</div>
	),
	error: (
		<svg
			className="size-[18px] text-destructive"
			viewBox="0 0 24 24"
			fill="none"
			strokeWidth="1.5"
			stroke="currentColor"
		>
			{/* Coeur brisé - métaphore bijou */}
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M12 21C12 21 4 14 4 8.5C4 5.5 6.5 3 9.5 3C11 3 12 4 12 4C12 4 13 3 14.5 3C17.5 3 20 5.5 20 8.5C20 14 12 21 12 21Z"
			/>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M12 4L10 10L14 12L12 21"
			/>
		</svg>
	),
	warning: (
		<svg
			className="size-[18px] text-secondary"
			viewBox="0 0 24 24"
			fill="none"
			strokeWidth="1.5"
			stroke="currentColor"
		>
			{/* Étoile/sparkle - attention élégante */}
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M12 2L14 8.5L21 9L16 14L17.5 21L12 17.5L6.5 21L8 14L3 9L10 8.5L12 2Z"
			/>
			<circle cx="12" cy="12" r="1" fill="currentColor" />
		</svg>
	),
	info: (
		<svg
			className="size-[18px] text-muted-foreground"
			viewBox="0 0 24 24"
			fill="none"
			strokeWidth="1.5"
			stroke="currentColor"
		>
			{/* Perle - information précieuse */}
			<circle cx="12" cy="12" r="8" />
			<ellipse cx="9" cy="9" rx="2" ry="1.5" className="opacity-40" fill="currentColor" />
			<path strokeLinecap="round" d="M12 11v5" />
			<circle cx="12" cy="8" r="0.5" fill="currentColor" />
		</svg>
	),
	loading: (
		<div className="relative size-[18px]">
			{/* Anneau/bague qui tourne - loading bijou */}
			<svg
				className="size-full text-primary/30"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<circle cx="12" cy="12" r="8" />
			</svg>
			<svg
				className="absolute inset-0 size-full text-primary animate-spin"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="2"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					d="M12 4a8 8 0 0 1 6.93 4"
				/>
			</svg>
			{/* Petite gemme sur l'anneau */}
			<svg
				className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px size-1.5 text-secondary animate-spin"
				style={{ animationDuration: "1s" }}
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M12 2L14 10L12 12L10 10L12 2Z" />
			</svg>
		</div>
	),
};

export function AppToaster() {
	const { resolvedTheme } = useTheme();

	return (
		<SonnerToaster
			theme={resolvedTheme as "light" | "dark" | "system"}
			position="top-center"
			duration={2500}
			visibleToasts={3}
			icons={icons}
			toastOptions={{
				classNames: {
					toast: "!bg-card/95 !backdrop-blur-sm !border-border/40 !rounded-xl !shadow-lg !shadow-primary/5 !py-3.5 !px-4 !gap-3",
					title: "!font-medium !text-sm !text-foreground !tracking-tight",
					description: "!text-sm !text-muted-foreground",
					success: "!border-l-[3px] !border-l-primary !shadow-primary/10",
					error: "!border-l-[3px] !border-l-destructive !shadow-destructive/10",
					warning: "!border-l-[3px] !border-l-secondary !shadow-secondary/10",
					info: "!border-l-[3px] !border-l-muted-foreground/30",
				},
			}}
		/>
	);
}
