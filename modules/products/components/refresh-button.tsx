"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/shared/components/ui/button";

export function RefreshButton() {
	const router = useRouter();

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={() => router.refresh()}
			className="shrink-0"
		>
			<RefreshCw className="size-4" aria-hidden="true" />
			Reessayer
		</Button>
	);
}
