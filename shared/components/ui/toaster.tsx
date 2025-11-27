"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";

/**
 * Icônes SVG outline minimalistes pour les toasts Synclune
 * Design élégant avec cercles fins et traits délicats (24px)
 */
const icons = {
	success: (
		<svg
			className="size-6 shrink-0 text-primary"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<circle
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth="1.5"
				className="opacity-30"
			/>
			<path
				d="M7 12.5L10 15.5L17 8.5"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	),
	error: (
		<svg
			className="size-6 shrink-0 text-destructive"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<circle
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth="1.5"
				className="opacity-30"
			/>
			<path
				d="M8 8L16 16M16 8L8 16"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	),
	warning: (
		<svg
			className="size-6 shrink-0 text-secondary"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M12 3L21 20H3L12 3Z"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
				className="opacity-40"
			/>
			<path
				d="M12 9V13M12 16V16.01"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	),
	info: (
		<svg
			className="size-6 shrink-0 text-muted-foreground"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<circle
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth="1.5"
				className="opacity-30"
			/>
			<path
				d="M12 11V16M12 8V8.01"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	),
	loading: (
		<svg
			className="size-6 shrink-0 text-secondary animate-spin"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<circle
				cx="12"
				cy="12"
				r="9"
				stroke="currentColor"
				strokeWidth="1.5"
				className="opacity-20"
			/>
			<path
				d="M12 3A9 9 0 0 1 21 12"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	),
};

/**
 * Composant Toaster personnalisé pour Synclune - Bijoux Artisanaux
 *
 * Design minimaliste élégant avec :
 * - Variables CSS shadcn/ui (--primary, --secondary, --destructive, etc.)
 * - Glassmorphism subtil (backdrop-blur)
 * - Bordure gauche colorée pour distinction rapide
 * - Icônes SVG outline fines (24px)
 *
 * @see https://sonner.emilkowal.ski/styling
 */
export function AppToaster() {
	const { resolvedTheme } = useTheme();

	return (
		<SonnerToaster
			theme={resolvedTheme as "light" | "dark" | "system"}
			position="top-center"
			expand={false}
			richColors={false}
			closeButton={false}
			gap={12}
			offset={28}
			mobileOffset={16}
			swipeDirections={["bottom"]}
			hotkey={["Alt", "T"]}
			duration={2500}
			visibleToasts={3}
			toastOptions={{
				classNames: {
					// Base commune - Glassmorphism minimaliste avec variables du thème
					toast: [
						"group toast",
						"!bg-popover/90 !backdrop-blur-md",
						"!border !border-border/50",
						"!border-l-[3px]",
						"!rounded-xl",
						"!shadow-lg",
						"!p-4",
						"!min-w-[320px] !max-w-[400px]",
					].join(" "),

					// Typographie
					title: "!font-medium !text-[15px] !leading-snug !tracking-tight !text-foreground",
					description: "!text-sm !leading-relaxed !text-muted-foreground !mt-1",

					// Boutons d'action
					actionButton: [
						"!bg-primary !text-primary-foreground",
						"hover:!bg-primary/90",
						"!font-medium !rounded-lg !px-4 !py-2 !text-sm",
						"!transition-colors !duration-200 !shadow-sm",
					].join(" "),

					cancelButton: [
						"!text-sm !font-medium",
						"!text-muted-foreground hover:!text-foreground",
						"!transition-colors !duration-200",
					].join(" "),

					// Success - Rose primary Synclune
					success: [
						"!bg-primary/5 dark:!bg-primary/10",
						"!border-primary/20",
						"!border-l-primary",
					].join(" "),

					// Error - Destructive (rouge/corail)
					error: [
						"!bg-destructive/5 dark:!bg-destructive/10",
						"!border-destructive/20",
						"!border-l-destructive",
					].join(" "),

					// Warning - Doré secondary Synclune
					warning: [
						"!bg-secondary/15 dark:!bg-secondary/20",
						"!border-secondary/30",
						"!border-l-secondary",
					].join(" "),

					// Info - Gris neutre élégant (muted)
					info: [
						"!bg-muted/50 dark:!bg-muted/60",
						"!border-border",
						"!border-l-muted-foreground/50",
					].join(" "),

					// Loading - Doré subtil
					loading: [
						"!bg-secondary/10 dark:!bg-secondary/15",
						"!border-secondary/25",
						"!border-l-secondary/70",
					].join(" "),
				},
				duration: 2500,
			}}
			icons={icons}
		/>
	);
}
