"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";
import {
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Info,
	Loader2,
} from "lucide-react";

/**
 * Composant Toaster personnalisé pour l'application de bijouterie Synclune
 *
 * Optimisé 2025 avec :
 * - Dark mode dynamique (next-themes)
 * - Position top-center (meilleur pour mobile e-commerce)
 * - Swipe tactile pour fermer
 * - Hotkey accessibilité (Alt+T)
 * - Offsets optimisés mobile/desktop
 * - Couleurs cohérentes avec le design system rose/doré
 */
export function AppToaster() {
	const { resolvedTheme } = useTheme();

	return (
		<SonnerToaster
			// Dark mode dynamique
			theme={resolvedTheme as "light" | "dark" | "system"}

			// Position optimale pour e-commerce mobile (ne masque pas le panier sticky)
			position="top-center"

			// Comportement
			expand={false}
			richColors={false}
			closeButton={false}
			gap={14}

			// Offsets optimisés mobile/desktop
			offset={32}
			mobileOffset={20}

			// Swipe tactile pour fermer (mobile-friendly)
			swipeDirections={["bottom"]}

			// Accessibilité clavier
			hotkey={["⌥", "T"]}

			// Durée et nombre de toasts
			duration={4000}
			visibleToasts={3}

			toastOptions={{
				// Classes générales pour tous les toasts
				classNames: {
					toast:
						"group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:transition-all group-[.toaster]:duration-300 group-[.toaster]:ease-in-out group-[.toaster]:backdrop-blur-sm",
					title:
						"group-[.toast]:font-semibold group-[.toast]:text-base group-[.toast]:leading-tight group-[.toast]:mb-1",
					description:
						"group-[.toast]:text-sm group-[.toast]:leading-relaxed group-[.toast]:opacity-90 group-[.toast]:mt-1",
					actionButton:
						"group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90 group-[.toast]:font-medium group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:text-sm group-[.toast]:transition-colors group-[.toast]:duration-200 group-[.toast]:shadow-sm",
					cancelButton:
						"group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80 group-[.toast]:font-medium group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:text-sm group-[.toast]:transition-colors group-[.toast]:duration-200 group-[.toast]:border group-[.toast]:border-border",

					// Success - Vert doux avec accent rose (pour cohérence avec le thème)
					success:
						"group-[.toast]:border-emerald-200 dark:group-[.toast]:border-emerald-800 group-[.toast]:bg-emerald-50/80 dark:group-[.toast]:bg-emerald-950/80 group-[.toast]:text-emerald-900 dark:group-[.toast]:text-emerald-100",

					// Error - Rouge rosé (cohérent avec la palette)
					error:
						"group-[.toast]:border-red-200 dark:group-[.toast]:border-red-800 group-[.toast]:bg-red-50/80 dark:group-[.toast]:bg-red-950/80 group-[.toast]:text-red-900 dark:group-[.toast]:text-red-100",

					// Warning - Orange chaud (lien avec le doré)
					warning:
						"group-[.toast]:border-amber-200 dark:group-[.toast]:border-amber-800 group-[.toast]:bg-amber-50/80 dark:group-[.toast]:bg-amber-950/80 group-[.toast]:text-amber-900 dark:group-[.toast]:text-amber-100",

					// Info - Indigo élégant (bijoux précieux, distinction claire avec primary)
					info: "group-[.toast]:border-indigo-200 dark:group-[.toast]:border-indigo-800 group-[.toast]:bg-indigo-50/80 dark:group-[.toast]:bg-indigo-950/80 group-[.toast]:text-indigo-900 dark:group-[.toast]:text-indigo-100",

					// Loading - Doré (accent logo)
					loading:
						"group-[.toast]:border-yellow-200 dark:group-[.toast]:border-yellow-800 group-[.toast]:bg-yellow-50/80 dark:group-[.toast]:bg-yellow-950/80 group-[.toast]:text-yellow-900 dark:group-[.toast]:text-yellow-100",
				},

				// Durées personnalisées
				duration: 4000,
			}}

			// Icônes personnalisées avec couleurs cohérentes
			icons={{
				success: (
					<CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
				),
				error: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />,
				warning: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />,
				info: <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />,
				loading: (
					<Loader2 className="h-5 w-5 text-yellow-600 dark:text-yellow-400 animate-spin shrink-0" />
				),
			}}
		/>
	);
}
