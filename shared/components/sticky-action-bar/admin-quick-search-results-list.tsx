"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, SearchX } from "lucide-react";
import type { MouseEvent } from "react";

import { Button } from "@/shared/components/ui/button";
import { Skeleton, SkeletonGroup, SkeletonText } from "@/shared/components/ui/skeleton";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

import type { AdminQuickSearchAdapter, AdminQuickSearchResult } from "./admin-quick-search.types";

interface AdminQuickSearchResultsListProps<TItem> {
	adapter: AdminQuickSearchAdapter<TItem>;
	result: AdminQuickSearchResult<TItem> | null;
	query: string;
	isPending: boolean;
	activeDescendantId: string | undefined;
	onSelect: () => void;
	onViewAllResults: () => void;
	onRetry: () => void;
}

const SKELETON_ROWS = 4;

/**
 * Renders the live search results listbox with three states:
 * - loading skeleton
 * - error/rate-limit (with retry)
 * - success (item list + "Voir N résultats")
 */
export function AdminQuickSearchResultsList<TItem>({
	adapter,
	result,
	query,
	isPending,
	activeDescendantId,
	onSelect,
	onViewAllResults,
	onRetry,
}: AdminQuickSearchResultsListProps<TItem>) {
	if (isPending && (!result || result.kind !== "success")) {
		return <ResultsSkeleton />;
	}

	if (result?.kind === "rate-limited") {
		return (
			<MessageState
				message={result.message ?? "Trop de recherches. Patientez un instant."}
				retry={onRetry}
			/>
		);
	}

	if (result?.kind === "error") {
		return (
			<MessageState
				message={result.message ?? "La recherche est temporairement indisponible."}
				retry={onRetry}
			/>
		);
	}

	if (!result) return null;

	if (result.items.length === 0) {
		return (
			<div className="text-muted-foreground flex flex-col items-center gap-2 px-4 py-8 text-center text-sm">
				<SearchX className="size-6 opacity-40" aria-hidden="true" />
				<p>Aucun résultat pour « {query} ».</p>
				<p className="text-xs">Essayez d&apos;ajuster votre recherche.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1 px-2 pb-4">
			{result.items.map((item) => (
				<ResultLink
					key={adapter.getResultId(item)}
					id={adapter.getResultId(item)}
					href={adapter.getResultHref(item)}
					ariaLabel={adapter.getResultLabel(item)}
					isActive={activeDescendantId === adapter.getResultId(item)}
					onSelect={onSelect}
				>
					{adapter.renderResultItem(item, {
						id: adapter.getResultId(item),
						isActive: activeDescendantId === adapter.getResultId(item),
						query,
					})}
				</ResultLink>
			))}

			{result.totalCount > result.items.length && (
				<Button
					variant="ghost"
					onClick={onViewAllResults}
					className="mt-1 h-11 w-full justify-between text-sm"
				>
					<span>Voir les {result.totalCount} résultats</span>
					<ArrowRight className="size-4" aria-hidden="true" />
				</Button>
			)}
		</div>
	);
}

interface ResultLinkProps {
	id: string;
	href: string;
	ariaLabel: string;
	isActive: boolean;
	onSelect: () => void;
	children: React.ReactNode;
}

function ResultLink({ id, href, ariaLabel, isActive, onSelect, children }: ResultLinkProps) {
	const router = useRouter();
	const haptic = useHaptic();

	const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
		if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
		e.preventDefault();
		haptic("light");
		onSelect();
		router.push(href);
	};

	return (
		<Link
			id={id}
			href={href}
			prefetch
			onClick={handleClick}
			onPointerEnter={() => router.prefetch(href)}
			role="option"
			aria-selected={isActive}
			aria-label={ariaLabel}
			data-active={isActive ? "true" : undefined}
			className={cn(
				"group/result flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5",
				"hover:bg-muted active:bg-muted motion-safe:transition-colors motion-safe:duration-150",
				"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
				"data-[active=true]:bg-muted",
			)}
		>
			{children}
		</Link>
	);
}

function ResultsSkeleton() {
	return (
		<SkeletonGroup label="Chargement des résultats…" className="space-y-2 px-4 pb-4">
			{Array.from({ length: SKELETON_ROWS }).map((_, i) => (
				<div key={i} className="flex items-center gap-3 py-2">
					<Skeleton shape="rounded" className="size-12 shrink-0" />
					<div className="min-w-0 flex-1">
						<SkeletonText lines={2} />
					</div>
				</div>
			))}
		</SkeletonGroup>
	);
}

function MessageState({ message, retry }: { message: string; retry: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 px-4 py-8">
			<p className="text-muted-foreground text-sm">{message}</p>
			<Button variant="outline" size="sm" onClick={retry}>
				Réessayer
			</Button>
		</div>
	);
}
