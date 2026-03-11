"use client";

import { useEffect, useRef } from "react";
import { getPostHog } from "@/shared/lib/posthog";
import { useCookieConsentStore } from "@/shared/providers/cookie-consent-store-provider";

/**
 * Reports Core Web Vitals (LCP, CLS, INP, FCP, TTFB) to a server endpoint
 * and forwards them to PostHog for persistent storage and analysis.
 * Uses the attribution build for diagnostic information on poor metrics.
 * Only activates when the user has accepted cookies (RGPD-compliant).
 *
 * Metrics are batched and flushed when the page is backgrounded (visibilitychange)
 * or when all 5 Core Web Vitals have been collected, to minimize network requests
 * while ensuring reliable delivery.
 */

export function WebVitalsReporter() {
	const accepted = useCookieConsentStore((state) => state.accepted);
	const registeredRef = useRef(false);

	useEffect(() => {
		if (accepted !== true) return;
		if (registeredRef.current) return;
		registeredRef.current = true;

		const queue: Record<string, unknown>[] = [];

		function flushQueue() {
			if (queue.length === 0) return;

			const body = JSON.stringify(queue);
			queue.length = 0;

			// Use sendBeacon with Blob for correct Content-Type header
			const blob = new Blob([body], { type: "application/json" });
			navigator.sendBeacon("/api/analytics/web-vitals", blob);
		}

		function handleVisibilityChange() {
			if (document.visibilityState === "hidden") {
				flushQueue();
			}
		}

		function enqueueMetric(
			name: string,
			value: number,
			rating: string,
			delta: number,
			id: string,
			navigationType: string,
			debugInfo?: Record<string, unknown>,
		) {
			const report: Record<string, unknown> = {
				name,
				value,
				rating,
				delta,
				id,
				navigationType,
				url: window.location.pathname,
				...debugInfo,
			};

			queue.push(report);

			// Forward to PostHog for persistent storage (if loaded)
			getPostHog()?.capture("web_vital", {
				metric_name: name,
				metric_value: value,
				metric_rating: rating,
				metric_delta: delta,
				metric_id: id,
				navigation_type: navigationType,
				page_url: window.location.pathname,
				...debugInfo,
			});

			// Flush when all 5 Core Web Vitals have been collected
			if (queue.length >= 5) flushQueue();

			// Log poor metrics for debugging (dev only)
			if (process.env.NODE_ENV === "development" && rating === "poor") {
				console.warn(
					`[Web Vitals] Poor ${name}: ${value.toFixed(2)}`,
					debugInfo?.debug_target ?? "",
				);
			}
		}

		async function reportWebVitals() {
			try {
				const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import("web-vitals/attribution");

				onCLS(
					(metric) => {
						enqueueMetric(
							metric.name,
							metric.value,
							metric.rating,
							metric.delta,
							metric.id,
							metric.navigationType,
							{
								debug_target: metric.attribution.largestShiftTarget,
								largestShiftValue: metric.attribution.largestShiftValue,
								loadState: metric.attribution.loadState,
							},
						);
					},
					{ reportAllChanges: process.env.NODE_ENV === "development" },
				);

				onINP(
					(metric) => {
						const longestScript = metric.attribution.longestScript;
						enqueueMetric(
							metric.name,
							metric.value,
							metric.rating,
							metric.delta,
							metric.id,
							metric.navigationType,
							{
								debug_target: metric.attribution.interactionTarget,
								inputDelay: metric.attribution.inputDelay,
								processingDuration: metric.attribution.processingDuration,
								presentationDelay: metric.attribution.presentationDelay,
								loadState: metric.attribution.loadState,
								...(longestScript && {
									scriptInvokerType: longestScript.entry.invokerType,
									scriptSourceURL: longestScript.entry.sourceURL,
									scriptSourceFunctionName: longestScript.entry.sourceFunctionName,
									scriptIntersectingDuration: longestScript.intersectingDuration,
								}),
							},
						);
					},
					{ reportAllChanges: process.env.NODE_ENV === "development" },
				);

				onLCP((metric) => {
					enqueueMetric(
						metric.name,
						metric.value,
						metric.rating,
						metric.delta,
						metric.id,
						metric.navigationType,
						{
							debug_target: metric.attribution.target,
							resourceLoadDelay: metric.attribution.resourceLoadDelay,
							resourceLoadDuration: metric.attribution.resourceLoadDuration,
							elementRenderDelay: metric.attribution.elementRenderDelay,
							resourceUrl: metric.attribution.url,
						},
					);
				});

				onFCP((metric) => {
					enqueueMetric(
						metric.name,
						metric.value,
						metric.rating,
						metric.delta,
						metric.id,
						metric.navigationType,
						{
							timeToFirstByte: metric.attribution.timeToFirstByte,
							firstByteToFCP: metric.attribution.firstByteToFCP,
							loadState: metric.attribution.loadState,
						},
					);
				});

				onTTFB((metric) => {
					enqueueMetric(
						metric.name,
						metric.value,
						metric.rating,
						metric.delta,
						metric.id,
						metric.navigationType,
						{
							dnsDuration: metric.attribution.dnsDuration,
							connectionDuration: metric.attribution.connectionDuration,
							requestDuration: metric.attribution.requestDuration,
							waitingDuration: metric.attribution.waitingDuration,
							cacheDuration: metric.attribution.cacheDuration,
						},
					);
				});
			} catch {
				// Silently fail if web-vitals cannot be loaded (ad blocker, network error)
			}
		}

		document.addEventListener("visibilitychange", handleVisibilityChange);
		void reportWebVitals();

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			flushQueue();
			registeredRef.current = false;
		};
	}, [accepted]);

	return null;
}
