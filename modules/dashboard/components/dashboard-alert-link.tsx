"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

type AlertTone = "info" | "warning";

interface DashboardAlertLinkProps {
	href: string;
	tone: AlertTone;
	icon: ReactNode;
	children: ReactNode;
	/** Open in a new tab — used for URSSAF official portal. */
	external?: boolean;
}

const TONE_CLASSES: Record<AlertTone, string> = {
	info: "border-info/30 bg-info/5 hover:bg-info/10",
	warning: "border-warning/30 bg-warning/5 hover:bg-warning/10",
};

/**
 * Tappable alert pill for the dashboard alerts banner.
 * Adds `touch-manipulation`, `active:scale` and a 44px minimum touch target —
 * keeps SSR-friendly (no `useState`).
 *
 * Pas d'haptique : c'est de la navigation. Le retour tactile est réservé aux
 * changements d'état signifiants (soumission, destruction, sélection, geste) —
 * sur un lien, il devient du bruit.
 */
export function DashboardAlertLink({
	href,
	tone,
	icon,
	children,
	external = false,
}: DashboardAlertLinkProps) {
	return (
		<Link
			href={href}
			{...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
			className={cn(
				"focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-h-9",
				"transform-gpu touch-manipulation active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150",
				TONE_CLASSES[tone],
			)}
		>
			{icon}
			<span className="font-medium">{children}</span>
		</Link>
	);
}
