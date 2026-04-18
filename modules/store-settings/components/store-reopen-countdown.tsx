"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCountdown } from "@/shared/hooks/use-countdown";

interface StoreReopenCountdownProps {
	reopensAt: Date;
}

function formatRemaining(snapshot: { days: number; hours: number; minutes: number }): string {
	const { days, hours, minutes } = snapshot;
	if (days > 0) {
		return `${days} jour${days > 1 ? "s" : ""} et ${hours} heure${hours > 1 ? "s" : ""}`;
	}
	if (hours > 0) {
		return `${hours} heure${hours > 1 ? "s" : ""} et ${minutes} minute${minutes > 1 ? "s" : ""}`;
	}
	if (minutes > 0) {
		return `${minutes} minute${minutes > 1 ? "s" : ""}`;
	}
	return "moins d'une minute";
}

export function StoreReopenCountdown({ reopensAt }: StoreReopenCountdownProps) {
	const snapshot = useCountdown(reopensAt);
	const router = useRouter();
	const refreshedRef = useRef(false);

	useEffect(() => {
		if (snapshot?.isExpired && !refreshedRef.current) {
			refreshedRef.current = true;
			router.refresh();
		}
	}, [snapshot?.isExpired, router]);

	if (!snapshot || snapshot.isExpired) return null;

	return (
		<p className="text-muted-foreground text-sm" role="timer" aria-live="off">
			Réouverture dans{" "}
			<span className="text-foreground font-medium">{formatRemaining(snapshot)}</span>
		</p>
	);
}
