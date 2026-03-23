"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getPostHog } from "@/shared/lib/posthog";
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
		const ph = getPostHog();
		if (pathname && ph) {
			let url = window.origin + pathname;
			if (searchParamsString) {
				url += `?${searchParamsString}`;
			}
			ph.capture("$pageview", { $current_url: url });
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
		const ph = getPostHog();
		if (!ph) return;

		if (accepted === true) {
			ph.opt_in_capturing();
		} else {
			ph.opt_out_capturing();
		}
	}, [accepted]);

	return null;
}

interface PostHogProviderProps {
	children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

		// PostHog is initialized by instrumentation-client.ts via requestIdleCallback.
		// Poll until the instance is available.
		const check = () => {
			if (getPostHog()) {
				setReady(true);
			} else {
				setTimeout(check, 200);
			}
		};
		check();
	}, []);

	return (
		<>
			{ready && (
				<>
					<Suspense fallback={null}>
						<PostHogPageview />
					</Suspense>
					<PostHogConsentSync />
				</>
			)}
			{children}
		</>
	);
}
