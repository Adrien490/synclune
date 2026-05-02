"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface SentryUserBridgeProps {
	userId?: string | null;
	role?: string | null;
}

export function SentryUserBridge({ userId, role }: SentryUserBridgeProps) {
	useEffect(() => {
		if (userId) {
			Sentry.setUser({ id: userId });
			if (role) Sentry.setTag("role", role);
		} else {
			Sentry.setUser(null);
		}
	}, [userId, role]);

	return null;
}
