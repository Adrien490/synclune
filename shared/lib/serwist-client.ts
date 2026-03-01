"use client";

import { useEffect, type ReactNode } from "react";

interface SerwistProviderProps {
	children: ReactNode;
	swUrl: string;
}

function SafeSerwistProvider({ children, swUrl }: SerwistProviderProps) {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) return;
		navigator.serviceWorker
			.register(swUrl, { type: "module", scope: "/" })
			.catch((err: unknown) => {
				console.warn("[SW] Registration failed:", err);
			});
	}, [swUrl]);

	return children;
}

function PassThrough({ children }: { children: ReactNode }) {
	return children;
}

export const SerwistProvider =
	process.env.NODE_ENV === "production" ? SafeSerwistProvider : PassThrough;
