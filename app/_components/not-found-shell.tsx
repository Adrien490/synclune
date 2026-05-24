"use client";

import { ParticleBackgroundError, RICH_ERROR_SHAPES } from "@/shared/components/animations";
import { trackEvent } from "@/shared/lib/analytics/track";
import * as Sentry from "@sentry/nextjs";
import type { ReactNode } from "react";
import { useEffect } from "react";

interface NotFoundShellProps {
	children: ReactNode;
	errorCode?: "404" | "403" | "401";
}

export function NotFoundShell({ children, errorCode = "404" }: NotFoundShellProps) {
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

	return (
		<main className="from-background via-primary/5 to-secondary/10 relative flex min-h-dvh items-center justify-center bg-linear-to-br px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
			<ParticleBackgroundError count={8} shape={RICH_ERROR_SHAPES} />
			<div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center">{children}</div>
		</main>
	);
}
