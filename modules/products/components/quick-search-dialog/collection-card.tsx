"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";

import { Tap } from "@/shared/components/animations/tap";
import { cn } from "@/shared/utils/cn";
import { withViewTransition } from "@/shared/utils/with-view-transition";

import type { QuickSearchCollection } from "./constants";
import { HighlightMatch } from "./search-result-item";

interface CollectionCardProps {
	collection: QuickSearchCollection;
	onSelect: () => void;
	/** Compact variant for search results, full variant for idle */
	variant?: "compact" | "full";
	/** Search query for highlighting in compact mode */
	query?: string;
}

export function CollectionCard({
	collection,
	onSelect,
	variant = "full",
	query,
}: CollectionCardProps) {
	const isCompact = variant === "compact";
	const router = useRouter();
	const href = `/collections/${collection.slug}`;
	const thumbStyle = { viewTransitionName: `collection-thumb-${collection.slug}` };

	const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
		// Let the browser handle modifier clicks (new tab, etc.)
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
		event.preventDefault();
		onSelect();
		withViewTransition(() => router.push(href));
	};

	return (
		<Tap scale={0.97}>
			<Link
				href={href}
				onClick={handleClick}
				data-active={undefined}
				role="option"
				aria-selected={false}
				// Out of the Tab order: reached via arrow keys (combobox pattern).
				tabIndex={-1}
				className={cn(
					"flex items-center rounded-xl text-left transition-all",
					"touch-manipulation",
					"focus-ring",
					"data-[active=true]:bg-muted",
					isCompact
						? "hover:bg-muted justify-between gap-2 px-3 py-2.5"
						: cn(
								"gap-3 px-4 py-3",
								"bg-muted/40 hover:bg-muted hover:border-border border border-transparent",
								"data-[active=true]:border-border",
							),
				)}
			>
				{isCompact ? (
					<>
						<div className="flex min-w-0 items-center gap-2">
							{collection.image ? (
								<div
									className="bg-muted size-8 shrink-0 overflow-hidden rounded-lg"
									style={thumbStyle}
								>
									<Image
										src={collection.image.url}
										alt=""
										width={32}
										height={32}
										className="size-full object-cover"
										placeholder={collection.image.blurDataUrl ? "blur" : "empty"}
										blurDataURL={collection.image.blurDataUrl ?? undefined}
									/>
								</div>
							) : (
								<Layers className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
							)}
							<span className="truncate font-medium">
								{query ? <HighlightMatch text={collection.name} query={query} /> : collection.name}
							</span>
						</div>
						<span className="text-muted-foreground shrink-0 text-xs tabular-nums">
							{collection.productCount}
						</span>
					</>
				) : (
					<>
						{collection.image ? (
							<div
								className="bg-muted size-10 shrink-0 overflow-hidden rounded-lg"
								style={thumbStyle}
							>
								<Image
									src={collection.image.url}
									alt=""
									width={40}
									height={40}
									className="size-full object-cover"
									placeholder={collection.image.blurDataUrl ? "blur" : "empty"}
									blurDataURL={collection.image.blurDataUrl ?? undefined}
								/>
							</div>
						) : (
							<div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
								<Layers className="text-muted-foreground/40 size-4" aria-hidden="true" />
							</div>
						)}
						<div className="min-w-0">
							<span className="line-clamp-1 text-sm font-medium">{collection.name}</span>
							<span className="text-muted-foreground block text-xs tabular-nums">
								{collection.productCount} produit{collection.productCount > 1 ? "s" : ""}
							</span>
						</div>
					</>
				)}
			</Link>
		</Tap>
	);
}
