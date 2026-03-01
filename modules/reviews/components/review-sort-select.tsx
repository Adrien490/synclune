"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import type { ReviewSortField } from "../types/review.types";

const STOREFRONT_SORT_OPTIONS: { value: ReviewSortField; label: string }[] = [
	{ value: "createdAt-desc", label: "Plus récents" },
	{ value: "createdAt-asc", label: "Plus anciens" },
	{ value: "rating-desc", label: "Meilleures notes" },
	{ value: "rating-asc", label: "Notes les plus basses" },
];

const DEFAULT_SORT: ReviewSortField = "createdAt-desc";

/**
 * Sélecteur de tri pour les avis clients
 * Met à jour les searchParams pour déclencher un re-fetch serveur
 */
export function ReviewSortSelect() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const currentSort = (searchParams.get("sortBy") as ReviewSortField) || DEFAULT_SORT;

	const handleSortChange = (value: string) => {
		startTransition(() => {
			const params = new URLSearchParams(searchParams.toString());

			if (value === DEFAULT_SORT) {
				params.delete("sortBy");
			} else {
				params.set("sortBy", value);
			}

			// Reset pagination on sort change
			params.delete("cursor");
			params.delete("direction");

			const queryString = params.toString();
			router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
		});
	};

	return (
		<Select value={currentSort} onValueChange={handleSortChange} disabled={isPending}>
			<SelectTrigger className="h-9 w-[180px] text-sm" aria-label="Trier les avis">
				<SelectValue placeholder="Trier par" />
			</SelectTrigger>
			<SelectContent>
				{STOREFRONT_SORT_OPTIONS.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
