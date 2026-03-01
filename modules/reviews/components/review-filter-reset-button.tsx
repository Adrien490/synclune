"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/shared/components/ui/button";

/**
 * Button to clear the rating filter from search params
 * Used in the filtered empty state of ReviewsList
 */
export function ReviewFilterResetButton() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const handleReset = () => {
		startTransition(() => {
			const params = new URLSearchParams(searchParams.toString());
			params.delete("ratingFilter");
			params.delete("cursor");
			params.delete("direction");
			const queryString = params.toString();
			router.push(queryString ? `${pathname}?${queryString}` : pathname, {
				scroll: false,
			});
		});
	};

	return (
		<Button variant="outline" size="sm" onClick={handleReset} disabled={isPending}>
			Voir tous les avis
		</Button>
	);
}
