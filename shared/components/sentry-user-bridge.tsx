"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface SentryUserBridgeProps {
	userId?: string | null;
	/** Rôle applicatif remonté en tag Sentry — nommé userRole pour ne pas collisionner avec l'attribut ARIA `role`. */
	userRole?: string | null;
}

/**
 * Bridges the session user/role into Sentry scope.
 *
 * Deferred via `requestIdleCallback` (fallback `setTimeout(0)` for Safari)
 * so the Sentry tag/user calls don't compete with the main thread during
 * the LCP/TTI window. Errors thrown before idle still capture correctly
 * because the Sentry SDK itself is already initialized at boot.
 */
export function SentryUserBridge({ userId, userRole }: SentryUserBridgeProps) {
	useEffect(() => {
		const apply = () => {
			if (userId) {
				Sentry.setUser({ id: userId });
				if (userRole) Sentry.setTag("role", userRole);
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
	}, [userId, userRole]);

	return null;
}
