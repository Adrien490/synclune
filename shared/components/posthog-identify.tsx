"use client";

import { useEffect, useRef } from "react";
import { initPostHog, getPostHogInstance } from "@/shared/lib/posthog";

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
		if (!user) {
			// User logged out - reset if we previously identified
			if (identifiedRef.current) {
				getPostHogInstance()?.reset();
				identifiedRef.current = null;
			}
			return;
		}

		// Don't re-identify the same user
		if (identifiedRef.current === user.id) return;

		void initPostHog().then((ph) => {
			if (!ph) return;
			ph.identify(user.id, {
				email: user.email,
				name: user.name ?? undefined,
			});
			identifiedRef.current = user.id;
		});
	}, [user]);

	return null;
}
