"use client";

import { useEffect, useRef } from "react";
import { initPostHog } from "@/shared/lib/posthog";

interface PostHogTrackProps {
	event: string;
	properties?: Record<string, unknown>;
}

/**
 * Fires a PostHog event once on mount.
 * Used in server components (checkout, confirmation) that can't call PostHog directly.
 */
export function PostHogTrack({ event, properties }: PostHogTrackProps) {
	const tracked = useRef(false);

	useEffect(() => {
		if (tracked.current) return;
		tracked.current = true;

		void initPostHog().then((ph) => {
			ph?.capture(event, properties);
		});
	}, [event, properties]);

	return null;
}
