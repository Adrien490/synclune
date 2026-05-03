"use client";

import { Clock, X } from "lucide-react";

import { useHaptic } from "@/shared/hooks/use-haptic";
import { toast } from "@/shared/utils/toast";

interface AdminQuickSearchRecentsProps {
	searches: string[];
	onTap: (term: string) => void;
	onRemove: (term: string) => void;
	onClearAll: () => void;
	onRestore: (snapshot: string[]) => void;
}

/**
 * Recents section displayed in idle state (no input).
 *
 * - Tap recent → re-runs live search (parent handles, NOT a redirect)
 * - Remove → updates localStorage, light haptic
 * - Clear all → toast with 5s undo
 */
export function AdminQuickSearchRecents({
	searches,
	onTap,
	onRemove,
	onClearAll,
	onRestore,
}: AdminQuickSearchRecentsProps) {
	const haptic = useHaptic();

	if (searches.length === 0) return null;

	const handleTap = (term: string) => {
		haptic("selection");
		onTap(term);
	};

	const handleRemove = (term: string) => {
		haptic("light");
		onRemove(term);
	};

	const handleClearAll = () => {
		const snapshot = [...searches];
		if (snapshot.length === 0) return;
		haptic("light");
		onClearAll();
		toast.success(
			snapshot.length === 1 ? "Recherche effacée" : `${snapshot.length} recherches effacées`,
			{
				action: {
					label: "Annuler",
					onClick: () => onRestore(snapshot),
				},
				duration: 5000,
			},
		);
	};

	return (
		<section aria-label="Recherches récentes" className="mt-6 flex flex-col gap-1">
			<header className="flex items-center justify-between px-1 pb-1">
				<h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					Récentes
				</h3>
				{searches.length >= 2 && (
					<button
						type="button"
						onClick={handleClearAll}
						className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded text-xs underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
					>
						Effacer tout
					</button>
				)}
			</header>
			<ul className="flex flex-col gap-0.5">
				{searches.map((term) => (
					<li key={term} className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => handleTap(term)}
							className="hover:bg-muted/60 active:bg-muted focus-visible:ring-ring flex min-h-11 flex-1 items-center gap-3 rounded-md px-3 text-left text-sm focus-visible:ring-2 focus-visible:outline-none motion-safe:transition-colors motion-safe:duration-150"
						>
							<Clock className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
							<span className="truncate">{term}</span>
						</button>
						<button
							type="button"
							onClick={() => handleRemove(term)}
							className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-11 shrink-0 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none motion-safe:transition-colors motion-safe:duration-150"
							aria-label={`Retirer « ${term} » des recherches récentes`}
						>
							<X className="size-4" aria-hidden="true" />
						</button>
					</li>
				))}
			</ul>
		</section>
	);
}
