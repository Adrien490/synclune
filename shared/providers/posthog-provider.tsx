"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { posthog } from "@/shared/lib/posthog";
import { useCookieConsentStore } from "@/shared/providers/cookie-consent-store-provider";
import type { ReactNode } from "react";

/**
 * Captures pageview events on route changes
 */
function PostHogPageview() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const searchParamsString = searchParams.toString();

	useEffect(() => {
		if (pathname) {
			let url = window.origin + pathname;
			if (searchParamsString) {
				url += `?${searchParamsString}`;
			}
			posthog.capture("$pageview", { $current_url: url });
		}
	}, [pathname, searchParamsString]);

	return null;
}

/**
 * Manages PostHog opt-in/opt-out based on cookie consent
 */
function PostHogConsentSync() {
	const accepted = useCookieConsentStore((state) => state.accepted);

	useEffect(() => {
		if (accepted === true) {
			posthog.opt_in_capturing();
		} else {
			posthog.opt_out_capturing();
		}
	}, [accepted]);

	return null;
}

interface PostHogProviderProps {
	children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
	if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
		return <>{children}</>;
	}

	return (
		<PHProvider client={posthog}>
			<Suspense fallback={null}>
				<PostHogPageview />
			</Suspense>
			<PostHogConsentSync />
			{children}
		</PHProvider>
	);
}
