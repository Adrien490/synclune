"use client";

import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";

import { Button } from "@/shared/components/ui/button";

export function RefreshButton() {
	const router = useRouter();

	return (
		<Button variant="outline" size="sm" onClick={() => router.refresh()} className="shrink-0">
			<ArrowsClockwiseIcon className="size-4" aria-hidden="true" />
			Réessayer
		</Button>
	);
}
