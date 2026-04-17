"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
	COMPARISON_MODE_LABELS,
	COMPARISON_MODE_SEARCH_PARAM,
	DASHBOARD_PERIODS,
	DEFAULT_COMPARISON_MODE,
	DEFAULT_PERIOD,
	PERIOD_SEARCH_PARAM,
	type ComparisonMode,
	type DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";

/**
 * SR-only aria-live announcer that vocalises dashboard period/comparison changes.
 * Once streamed data resolves the Suspense boundaries, the screen reader reads a
 * message like « Données du tableau de bord chargées : Ce mois · Période précédente ».
 *
 * Skips the initial mount so the first page load isn't re-announced alongside
 * Next.js' built-in page-title announcer.
 */
export function DashboardRefreshAnnouncer() {
	const searchParams = useSearchParams();
	const period = (searchParams.get(PERIOD_SEARCH_PARAM) ?? DEFAULT_PERIOD) as DashboardPeriod;
	const comparison = (searchParams.get(COMPARISON_MODE_SEARCH_PARAM) ??
		DEFAULT_COMPARISON_MODE) as ComparisonMode;

	const [message, setMessage] = useState("");
	const isFirstRender = useRef(true);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		const periodLabel = DASHBOARD_PERIODS[period].label;
		const comparisonLabel = COMPARISON_MODE_LABELS[comparison];
		// Announcing aria-live content synchronises React state with an external
		// system (the SR live region). The aria-live pattern is a valid
		// setState-in-effect use case — silence the rule-of-thumb lint.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMessage(`Données du tableau de bord chargées : ${periodLabel} · ${comparisonLabel}.`);
	}, [period, comparison]);

	return (
		<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
			{message}
		</span>
	);
}
