"use client";

import { trackEvent } from "@/shared/lib/analytics/track";
import * as Sentry from "@sentry/nextjs";
import type { ReactNode } from "react";
import { useEffect } from "react";

interface NotFoundShellProps {
	children: ReactNode;
	errorCode?: "404" | "403" | "401";
	/**
	 * `page` (défaut) : coquille autonome — rend son propre `<main>` plein écran
	 * avec fond dégradé. Pour les segments dont le layout ne fournit pas de `<main>`.
	 *
	 * `inset` : rend une `<section>` sans `min-h-dvh` ni fond dégradé, pour les
	 * segments dont le layout fournit déjà un `<main>` et un fond (ex.
	 * `app/suivi-commande/layout.tsx`). Évite un `<main>` imbriqué et une hauteur
	 * cumulée supérieure au viewport.
	 */
	variant?: "page" | "inset";
}

export function NotFoundShell({
	children,
	errorCode = "404",
	variant = "page",
}: NotFoundShellProps) {
	useEffect(() => {
		const path = window.location.pathname;
		const referrer = document.referrer || null;
		Sentry.addBreadcrumb({
			category: "navigation",
			message: `error_page_${errorCode}`,
			level: "info",
			data: { path, referrer },
		});
		trackEvent(`error_page_${errorCode}`, { path, referrer });
	}, [errorCode]);

	if (variant === "inset") {
		return (
			<section className="relative flex min-h-[60dvh] items-center justify-center px-4 py-12">
				<div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center">{children}</div>
			</section>
		);
	}

	return (
		<main className="from-background via-primary/5 to-secondary/10 relative flex min-h-dvh items-center justify-center bg-linear-to-br px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
			<div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center">{children}</div>
		</main>
	);
}
