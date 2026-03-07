"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { initPostHog, posthog } from "@/shared/lib/posthog";
import { useCookieConsentStore } from "@/shared/providers/cookie-consent-store-provider";
import type { ReactNode } from "react";

/**
 * Captures pageview events on route changes
 */
function PostHogPageview() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const ph = usePostHog();

	useEffect(() => {
		if (pathname && ph) {
			let url = window.origin + pathname;
			const search = searchParams?.toString();
			if (search) {
				url += `?${search}`;
			}
			ph.capture("$pageview", { $current_url: url });
		}
	}, [pathname, searchParams, ph]);

	return null;
}

/**
 * Manages PostHog opt-in/opt-out based on cookie consent
 */
function PostHogConsentSync() {
	const accepted = useCookieConsentStore((state) => state.accepted);
	const ph = usePostHog();

	useEffect(() => {
		if (!ph) return;

		if (accepted === true) {
			ph.opt_in_capturing();
		} else {
			ph.opt_out_capturing();
		}
	}, [accepted, ph]);

	return null;
}

interface PostHogProviderProps {
	children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
	useEffect(() => {
		initPostHog();
	}, []);

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
