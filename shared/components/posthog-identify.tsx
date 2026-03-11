"use client";

import { useEffect, useRef } from "react";
import { getPostHog } from "@/shared/lib/posthog";

interface PostHogIdentifyUser {
	id: string;
	email: string;
	name?: string | null;
}

interface PostHogIdentifyProps {
	user: PostHogIdentifyUser | null;
}

/**
 * Identifies the current user in PostHog for cross-session analytics.
 * Renders in root layout with server-side session data.
 * Calls posthog.identify() once per user, reset when user is null.
 */
export function PostHogIdentify({ user }: PostHogIdentifyProps) {
	const identifiedRef = useRef<string | null>(null);

	useEffect(() => {
		const ph = getPostHog();
		if (!ph) return;

		if (!user) {
			if (identifiedRef.current) {
				ph.reset();
				identifiedRef.current = null;
			}
			return;
		}

		if (identifiedRef.current === user.id) return;

		ph.identify(user.id, {
			email: user.email,
			name: user.name ?? undefined,
		});
		identifiedRef.current = user.id;
	}, [user]);

	return null;
}
