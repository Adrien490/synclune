"use client";

import Image from "next/image";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StackIcon } from "@phosphor-icons/react/ssr";

import { Tap } from "@/shared/components/animations/tap";
import { cn } from "@/shared/utils/cn";

import type { QuickSearchCollection } from "./constants";
import { HighlightMatch } from "./search-result-item";
import { PAGE_FADE_NAVIGATION } from "@/shared/constants/view-transitions";

interface CollectionCardProps {
	collection: QuickSearchCollection;
	onSelect: () => void;
	/** Compact variant for search results, full variant for idle */
	variant?: "compact" | "full";
	/** Search query for highlighting in compact mode */
	query?: string;
	/**
	 * `true` quand la carte est rendue à l'intérieur du `role="listbox"` (mode
	 * recherche) : elle prend alors `role="option"`. En idle le conteneur n'est
	 * PAS un listbox, une option y serait orpheline — la carte reste un simple
	 * lien, navigable via `data-qs-option` et le focus réel.
	 */
	inListbox?: boolean;
}

export function CollectionCard({
	collection,
	onSelect,
	variant = "full",
	query,
	inListbox = false,
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
		// `replace`, jamais `push` : ce handler `preventDefault()` donc Next sort AVANT
		// de lire la prop `replace` du `<Link>`. C'est ici que la navigation se décide.
		router.replace(href, PAGE_FADE_NAVIGATION);
	};

	return (
		<Tap scale={0.97}>
			<Link
				href={href}
				// `replace` : consomme l'entrée d'historique du dialog (CLAUDE.md § Overlays).
				replace
				onClick={handleClick}
				data-active={undefined}
				data-qs-option=""
				role={inListbox ? "option" : undefined}
				aria-selected={inListbox ? false : undefined}
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
										quality={IMAGE_QUALITY.THUMBNAIL}
										className="size-full object-cover"
										placeholder="empty"
									/>
								</div>
							) : (
								<StackIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
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
									quality={IMAGE_QUALITY.THUMBNAIL}
									className="size-full object-cover"
									placeholder="empty"
								/>
							</div>
						) : (
							<div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
								<StackIcon className="text-muted-foreground/40 size-4" aria-hidden="true" />
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
