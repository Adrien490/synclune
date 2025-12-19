"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { cn } from "@/shared/utils/cn";

interface ClearSearchButtonProps {
	className?: string;
}

/**
 * Bouton pour effacer la recherche active en un tap.
 * N'apparaît que si une recherche est active (paramètre `search` dans l'URL).
 *
 * @example
 * ```tsx
 * <ClearSearchButton className="md:hidden" />
 * ```
 */
export function ClearSearchButton({ className }: ClearSearchButtonProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const searchTerm = searchParams.get("search");

	// Ne rien afficher si pas de recherche active
	if (!searchTerm) return null;

	const handleClear = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("search");
		params.delete("cursor");
		params.delete("direction");

		startTransition(() => {
			router.replace(`?${params.toString()}`, { scroll: false });
		});
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={handleClear}
			disabled={isPending}
			className={cn("size-11 text-muted-foreground", className)}
			aria-label={`Effacer la recherche "${searchTerm}"`}
		>
			{isPending ? <Spinner className="size-4" /> : <X className="size-5" />}
		</Button>
	);
}
