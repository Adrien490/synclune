"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { type FilterDefinition } from "@/shared/hooks/use-filter";

import { REVIEW_STATUS_LABELS } from "../../constants/review.constants";

const RATING_LABELS: Record<string, string> = {
	"1": "1 étoile",
	"2": "2 étoiles",
	"3": "3 étoiles",
	"4": "4 étoiles",
	"5": "5 étoiles",
};

function formatReviewFilter(filter: FilterDefinition) {
	const value = filter.value as string;

	if (filter.key === "status") {
		const label = REVIEW_STATUS_LABELS[value as keyof typeof REVIEW_STATUS_LABELS] as
			| string
			| undefined;
		return { label: "Statut", displayValue: label ?? value };
	}

	if (filter.key === "rating") {
		const label = RATING_LABELS[value] as string | undefined;
		return { label: "Note", displayValue: label ?? value };
	}

	if (filter.key === "hasResponse") {
		return {
			label: "Réponse",
			displayValue: value === "true" ? "Avec réponse" : "Sans réponse",
		};
	}

	return { label: filter.key, displayValue: value };
}

/**
 * Badges des filtres actifs pour la liste avis admin.
 * Reviews utilisent des clés brutes (status, rating, hasResponse) sans préfixe `filter_`.
 */
export function ReviewsFilterBadges() {
	return <FilterBadges formatFilter={formatReviewFilter} filterOptions={{ filterPrefix: "" }} />;
}
