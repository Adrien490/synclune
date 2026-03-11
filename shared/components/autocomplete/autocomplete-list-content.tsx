import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";
import { m } from "motion/react";
import { AlertCircleIcon, SearchIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import Image from "next/image";
import { AUTOCOMPLETE_ANIMATIONS } from "./constants";

interface AutocompleteListContentProps<T> {
	items: T[];
	activeIndex: number;
	error?: string | null;
	isLoading: boolean;
	hasResults: boolean;
	showResultsCount: boolean;
	showEmptyState: boolean;
	noResultsMessage: string;
	onRetry?: () => void;
	getItemLabel: (item: T) => string;
	getItemKey?: (item: T) => string;
	getItemDescription?: (item: T) => string | null;
	getItemImage?: (item: T) => {
		src: string;
		alt: string;
		blurDataUrl?: string | null;
	} | null;
	effectiveImageSize: number;
	onItemSelect: (item: T) => void;
	onItemHover: (index: number) => void;
	getItemId: (index: number) => string;
	loadingSkeletonCount: number;
}

export function AutocompleteListContent<T>({
	items,
	activeIndex,
	error,
	isLoading,
	hasResults,
	showResultsCount,
	showEmptyState,
	noResultsMessage,
	onRetry,
	getItemLabel,
	getItemKey,
	getItemDescription,
	getItemImage,
	effectiveImageSize,
	onItemSelect,
	onItemHover,
	getItemId,
	loadingSkeletonCount,
}: AutocompleteListContentProps<T>) {
	if (error) {
		return <AutocompleteErrorState error={error} onRetry={onRetry} />;
	}

	if (isLoading) {
		return (
			<AutocompleteLoadingSkeletons
				count={loadingSkeletonCount}
				effectiveImageSize={effectiveImageSize}
				hasImage={!!getItemImage}
				hasDescription={!!getItemDescription}
			/>
		);
	}

	if (hasResults) {
		return (
			<>
				{showResultsCount && <AutocompleteResultsCount count={items.length} />}
				{items.map((item, index) => (
					<AutocompleteItem
						key={getItemKey?.(item) ?? `${getItemLabel(item)}-${index}`}
						item={item}
						index={index}
						isActive={index === activeIndex}
						itemCount={items.length}
						getItemLabel={getItemLabel}
						getItemDescription={getItemDescription}
						getItemImage={getItemImage}
						effectiveImageSize={effectiveImageSize}
						onSelect={onItemSelect}
						onHover={onItemHover}
						getItemId={getItemId}
					/>
				))}
			</>
		);
	}

	if (showEmptyState) {
		return <AutocompleteEmptyState noResultsMessage={noResultsMessage} />;
	}

	return null;
}

// ========================================
// Co-located helper components
// ========================================

function AutocompleteResultsCount({ count }: { count: number }) {
	return (
		<li
			role="presentation"
			className="text-muted-foreground bg-muted/30 border-b px-3 py-1.5 text-xs"
		>
			{count} résultat{count > 1 ? "s" : ""}
		</li>
	);
}

function AutocompleteLoadingSkeletons({
	count,
	effectiveImageSize,
	hasImage,
	hasDescription,
}: {
	count: number;
	effectiveImageSize: number;
	hasImage: boolean;
	hasDescription: boolean;
}) {
	return (
		<>
			{[...Array<unknown>(count)].map((_, i) => (
				<li key={`skeleton-${i}`} className="px-3 py-3 md:py-2" aria-hidden="true">
					<div className="flex items-center gap-3">
						{hasImage && (
							<Skeleton
								className="shrink-0 rounded-sm"
								style={{
									width: effectiveImageSize,
									height: effectiveImageSize,
									animationDelay: `${i * 100}ms`,
								}}
							/>
						)}
						<div className="flex flex-1 flex-col gap-1.5">
							<Skeleton className="h-4 w-3/4" style={{ animationDelay: `${i * 100}ms` }} />
							{hasDescription && (
								<Skeleton className="h-3 w-1/2" style={{ animationDelay: `${i * 100 + 50}ms` }} />
							)}
						</div>
					</div>
				</li>
			))}
		</>
	);
}

function AutocompleteEmptyState({ noResultsMessage }: { noResultsMessage: string }) {
	return (
		<li className="w-full">
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<SearchIcon className="size-6" strokeWidth={1.5} />
					</EmptyMedia>
					<EmptyTitle>{noResultsMessage}</EmptyTitle>
					<EmptyDescription>Essayez de modifier votre recherche</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</li>
	);
}

function AutocompleteErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
	return (
		<li className="w-full">
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<AlertCircleIcon className="text-destructive size-6" strokeWidth={1.5} />
					</EmptyMedia>
					<EmptyTitle className="text-destructive">{error}</EmptyTitle>
					{onRetry && (
						<Button variant="ghost" size="sm" onClick={onRetry}>
							Réessayer
						</Button>
					)}
				</EmptyHeader>
			</Empty>
		</li>
	);
}

// ========================================
// Item component
// ========================================

interface AutocompleteItemProps<T> {
	item: T;
	index: number;
	isActive: boolean;
	itemCount: number;
	getItemLabel: (item: T) => string;
	getItemDescription?: (item: T) => string | null;
	getItemImage?: (item: T) => {
		src: string;
		alt: string;
		blurDataUrl?: string | null;
	} | null;
	effectiveImageSize: number;
	onSelect: (item: T) => void;
	onHover: (index: number) => void;
	getItemId: (index: number) => string;
}

function AutocompleteItem<T>({
	item,
	index,
	isActive,
	itemCount,
	getItemLabel,
	getItemDescription,
	getItemImage,
	effectiveImageSize,
	onSelect,
	onHover,
	getItemId,
}: AutocompleteItemProps<T>) {
	const imageData = getItemImage?.(item);

	return (
		<m.li
			id={getItemId(index)}
			role="option"
			aria-selected={isActive}
			aria-posinset={index + 1}
			aria-setsize={itemCount}
			className={cn(
				"cursor-pointer px-3 py-3 transition-colors duration-150 select-none md:py-2",
				isActive ? "bg-accent" : "bg-card hover:bg-muted",
			)}
			onClick={() => onSelect(item)}
			onMouseEnter={() => onHover(index)}
			tabIndex={-1}
			initial={AUTOCOMPLETE_ANIMATIONS.item.initial}
			animate={AUTOCOMPLETE_ANIMATIONS.item.animate}
			transition={{
				delay: Math.min(
					index * AUTOCOMPLETE_ANIMATIONS.item.delayMultiplier,
					AUTOCOMPLETE_ANIMATIONS.item.maxDelay,
				),
			}}
		>
			<div className="flex items-center gap-3">
				{imageData && (
					<div
						className="relative shrink-0 overflow-hidden rounded-sm"
						style={{ width: effectiveImageSize, height: effectiveImageSize }}
					>
						<Image
							src={imageData.src}
							alt={imageData.alt}
							aria-hidden={!imageData.alt}
							fill
							sizes={`${effectiveImageSize}px`}
							quality={80}
							className="object-cover"
							placeholder={imageData.blurDataUrl ? "blur" : "empty"}
							blurDataURL={imageData.blurDataUrl ?? undefined}
						/>
					</div>
				)}
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-sm font-medium">{getItemLabel(item)}</span>
					{getItemDescription && getItemDescription(item) && (
						<span className="text-muted-foreground line-clamp-2 text-xs">
							{getItemDescription(item)}
						</span>
					)}
				</div>
			</div>
		</m.li>
	);
}
