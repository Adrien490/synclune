"use client";

import { useEffect, useState } from "react";

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

/** Format a past Date into a French relative time string ("il y a 5 s", "il y a 2 min"). */
export function formatRelativeTime(date: Date, now: number): string {
	const diffSeconds = Math.round((date.getTime() - now) / 1000);
	if (Math.abs(diffSeconds) < 60) return RELATIVE_FORMATTER.format(diffSeconds, "second");
	const diffMinutes = Math.round(diffSeconds / 60);
	if (Math.abs(diffMinutes) < 60) return RELATIVE_FORMATTER.format(diffMinutes, "minute");
	const diffHours = Math.round(diffMinutes / 60);
	if (Math.abs(diffHours) < 24) return RELATIVE_FORMATTER.format(diffHours, "hour");
	const diffDays = Math.round(diffHours / 24);
	return RELATIVE_FORMATTER.format(diffDays, "day");
}

interface RelativeClockProps {
	/** Reference moment (typically lastRefreshedAt). `null` shows the fallback label. */
	from: Date | null;
	/** When `true`, the 1s tick is paused (e.g. sheet closed) to avoid background re-renders. */
	paused: boolean;
	/** Label rendered when `from === null`. */
	fallback?: string;
}

/**
 * Self-contained ticking label. Re-renders once per second only inside this component
 * — keeps parent components static while the relative time updates ("il y a 5 s").
 */
export function RelativeClock({
	from,
	paused,
	fallback = "Jamais dans cette session",
}: RelativeClockProps) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (paused) return;
		// rAF defers the resync past the current commit
		// (react-hooks/set-state-in-effect) while still resyncing on un-pause.
		const raf = requestAnimationFrame(() => setNow(Date.now()));
		const id = window.setInterval(() => setNow(Date.now()), 1000);
		return () => {
			cancelAnimationFrame(raf);
			window.clearInterval(id);
		};
	}, [paused]);

	return <>{from ? formatRelativeTime(from, now) : fallback}</>;
}
