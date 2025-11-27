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
 * - Variables CSS shadcn/ui pour la cohérence du thème
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
			duration={4000}
			visibleToasts={3}
			// Styles inline avec variables CSS shadcn/ui (recommandé par Sonner)
			style={
				{
					"--normal-bg": "hsl(var(--popover))",
					"--normal-text": "hsl(var(--popover-foreground))",
					"--normal-border": "hsl(var(--border))",
					"--success-bg": "hsl(var(--primary) / 0.08)",
					"--success-text": "hsl(var(--foreground))",
					"--success-border": "hsl(var(--primary) / 0.2)",
					"--error-bg": "hsl(var(--destructive) / 0.08)",
					"--error-text": "hsl(var(--foreground))",
					"--error-border": "hsl(var(--destructive) / 0.2)",
					"--warning-bg": "hsl(var(--secondary) / 0.15)",
					"--warning-text": "hsl(var(--foreground))",
					"--warning-border": "hsl(var(--secondary) / 0.3)",
					"--border-radius": "var(--radius-lg)",
				} as React.CSSProperties
			}
			toastOptions={{
				classNames: {
					// Base commune - Glassmorphism minimaliste
					toast: [
						"group toast",
						"!bg-popover/90 !backdrop-blur-md",
						"!border !border-border/50",
						"!border-l-[3px]",
						"!rounded-xl",
						"!shadow-lg !shadow-black/[0.04] dark:!shadow-black/20",
						"!p-4",
						"!min-w-[320px] !max-w-[400px]",
					].join(" "),

					// Typographie
					title: "!font-medium !text-[15px] !leading-snug !tracking-tight",
					description: "!text-sm !leading-relaxed !opacity-75 !mt-1",

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
						"!border-primary/15 dark:!border-primary/20",
						"!border-l-primary",
					].join(" "),

					// Error - Destructive
					error: [
						"!bg-destructive/5 dark:!bg-destructive/10",
						"!border-destructive/15 dark:!border-destructive/20",
						"!border-l-destructive",
					].join(" "),

					// Warning - Doré secondary Synclune
					warning: [
						"!bg-secondary/10 dark:!bg-secondary/15",
						"!border-secondary/25 dark:!border-secondary/30",
						"!border-l-secondary",
					].join(" "),

					// Info - Gris neutre élégant
					info: [
						"!bg-muted/50 dark:!bg-muted/60",
						"!border-border",
						"!border-l-muted-foreground/40",
					].join(" "),

					// Loading - Doré subtil
					loading: [
						"!bg-secondary/8 dark:!bg-secondary/12",
						"!border-secondary/20 dark:!border-secondary/25",
						"!border-l-secondary/60",
					].join(" "),
				},
				duration: 4000,
			}}
			icons={icons}
		/>
	);
}
