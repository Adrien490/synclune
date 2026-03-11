"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog, getPostHogInstance } from "@/shared/lib/posthog";
import { useCookieConsentStore } from "@/shared/providers/cookie-consent-store-provider";
import type { PostHog } from "posthog-js";
import type { ReactNode } from "react";

/**
 * Captures pageview events on route changes
 */
function PostHogPageview({ ph }: { ph: PostHog }) {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		if (pathname) {
			let url = window.origin + pathname;
			const search = searchParams.toString();
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
function PostHogConsentSync({ ph }: { ph: PostHog }) {
	const accepted = useCookieConsentStore((state) => state.accepted);

	useEffect(() => {
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
	const [ph, setPh] = useState<PostHog | null>(getPostHogInstance);

	useEffect(() => {
		if (ph) return;
		void initPostHog().then((instance) => {
			if (instance) setPh(instance);
		});
	}, [ph]);

	if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !ph) {
		return <>{children}</>;
	}

	// Dynamically import PHProvider only when PostHog is ready
	return (
		<PostHogProviderInner ph={ph}>
			<Suspense fallback={null}>
				<PostHogPageview ph={ph} />
			</Suspense>
			<PostHogConsentSync ph={ph} />
			{children}
		</PostHogProviderInner>
	);
}

/**
 * Lazy wrapper around posthog-js/react PHProvider.
 * We pass the PostHog instance directly to children instead of using PHProvider
 * to avoid importing posthog-js/react statically.
 */
function PostHogProviderInner({ ph, children }: { ph: PostHog; children: ReactNode }) {
	// posthog-js/react's PHProvider just puts the instance in context.
	// Since we already pass ph as props, we skip the PHProvider import entirely
	// to avoid pulling in posthog-js/react bundle.
	// If any downstream code uses usePostHog(), we need the provider.
	const [PHProvider, setPHProvider] = useState<React.ComponentType<{
		client: PostHog;
		children: ReactNode;
	}> | null>(null);

	useEffect(() => {
		void import("posthog-js/react").then((mod) => {
			setPHProvider(() => mod.PostHogProvider);
		});
	}, []);

	if (!PHProvider) {
		return <>{children}</>;
	}

	return <PHProvider client={ph}>{children}</PHProvider>;
}
