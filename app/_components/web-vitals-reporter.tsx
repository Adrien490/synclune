"use client";

import { useReportWebVitals } from "next/web-vitals";

type WebVitalMetric = {
	name: "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";
	value: number;
	rating: "good" | "needs-improvement" | "poor";
	id: string;
};

export function WebVitalsReporter() {
	useReportWebVitals((metric: WebVitalMetric) => {
		if (process.env.NODE_ENV !== "development") return;
		const value = metric.name === "CLS" ? metric.value.toFixed(3) : Math.round(metric.value);
		// eslint-disable-next-line no-console
		console.info(`[CWV] ${metric.name} ${value} (${metric.rating})`, metric);
	});

	return null;
}
