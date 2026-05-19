"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface SentryUserBridgeProps {
	userId?: string | null;
	role?: string | null;
}

/**
 * Bridges the session user/role into Sentry scope.
 *
 * Deferred via `requestIdleCallback` (fallback `setTimeout(0)` for Safari)
 * so the Sentry tag/user calls don't compete with the main thread during
 * the LCP/TTI window. Errors thrown before idle still capture correctly
 * because the Sentry SDK itself is already initialized at boot.
 */
export function SentryUserBridge({ userId, role }: SentryUserBridgeProps) {
	useEffect(() => {
		const apply = () => {
			if (userId) {
				Sentry.setUser({ id: userId });
				if (role) Sentry.setTag("role", role);
			} else {
				Sentry.setUser(null);
			}
		};

		// Safari 16.4+ ships requestIdleCallback; older Safari falls back to setTimeout(0).
		if (typeof window.requestIdleCallback === "function") {
			const handle = window.requestIdleCallback(apply, { timeout: 2000 });
			return () => window.cancelIdleCallback(handle);
		}

		const timeout = window.setTimeout(apply, 0);
		return () => window.clearTimeout(timeout);
	}, [userId, role]);

	return null;
}
