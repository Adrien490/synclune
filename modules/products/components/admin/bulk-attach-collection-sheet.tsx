"use client";

import { FolderPlus, Loader2, Search } from "lucide-react";
import { useDeferredValue, useState, useTransition } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { useAdminListPendingContextOptional } from "@/shared/contexts/admin-list-pending-context";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { cn } from "@/shared/utils/cn";
import { toast } from "@/shared/utils/toast";

import { bulkAttachCollectionProducts } from "../../actions/bulk-attach-collection-products";

interface CollectionOption {
	id: string;
	name: string;
}

interface BulkAttachCollectionSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	productIds: string[];
	collections: CollectionOption[];
	onSuccess?: (result: ActionState) => void;
}

/**
 * Bottom sheet (Vaul mobile / centered Radix desktop) pour lier des produits
 * selectionnes a une collection en lot.
 *
 * Liste filtrable type combobox simple — radio comportement (1 collection a la
 * fois). Submit appelle `bulkAttachCollectionProducts` + toast + close.
 */
export function BulkAttachCollectionSheet({
	open,
	onOpenChange,
	productIds,
	collections,
	onSuccess,
}: BulkAttachCollectionSheetProps) {
	const [search, setSearch] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const deferredSearch = useDeferredValue(search);
	const pendingCtx = useAdminListPendingContextOptional();

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			setSearch("");
			setSelectedId(null);
		}
		onOpenChange(next);
	};

	const filtered = deferredSearch
		? collections.filter((c) => c.name.toLowerCase().includes(deferredSearch.toLowerCase()))
		: collections;

	const handleSubmit = () => {
		if (!selectedId || productIds.length === 0) return;
		triggerHaptic("medium");
		pendingCtx?.startPending(productIds, "attach-collection");
		startTransition(async () => {
			const fd = new FormData();
			fd.set("productIds", JSON.stringify(productIds));
			fd.set("collectionId", selectedId);
			const result = await bulkAttachCollectionProducts(undefined, fd);
			pendingCtx?.clearPending();
			if (result.status === ActionStatus.SUCCESS) {
				toast.success(result.message);
				onSuccess?.(result);
				handleOpenChange(false);
			} else {
				toast.error(result.message);
			}
		});
	};

	return (
		<Drawer
			open={open}
			onOpenChange={handleOpenChange}
			direction="bottom"
			handleOnly
			repositionInputs
		>
			<DrawerContent>
				<DrawerHeader>
					<div className="flex items-center gap-2">
						<span className="bg-primary/10 text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-full">
							<FolderPlus className="size-4" aria-hidden="true" />
						</span>
						<div className="min-w-0 flex-1">
							<DrawerTitle>Lier à une collection</DrawerTitle>
							<DrawerDescription>
								{productIds.length} bijou{productIds.length > 1 ? "x" : ""} sélectionné
								{productIds.length > 1 ? "s" : ""}
							</DrawerDescription>
						</div>
					</div>
				</DrawerHeader>

				<DrawerBody className="space-y-3">
					<div className="relative">
						<Search
							className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
							aria-hidden="true"
						/>
						<Input
							type="search"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Rechercher une collection…"
							className="pl-9"
							inputMode="search"
							enterKeyHint="search"
							autoCapitalize="off"
							autoCorrect="off"
							spellCheck={false}
							aria-label="Rechercher une collection"
							data-vaul-no-drag
						/>
					</div>

					<ScrollArea
						className="max-h-[min(60dvh,420px)] overscroll-contain"
						aria-label="Collections disponibles"
						data-vaul-no-drag
					>
						{filtered.length === 0 ? (
							<div className="text-muted-foreground py-8 text-center text-sm">
								{deferredSearch
									? `Aucune collection ne correspond à « ${deferredSearch} »`
									: "Aucune collection disponible"}
							</div>
						) : (
							<div role="radiogroup" aria-label="Choisir une collection" className="space-y-1">
								{filtered.map((collection) => {
									const isSelected = selectedId === collection.id;
									return (
										<button
											key={collection.id}
											type="button"
											role="radio"
											aria-checked={isSelected}
											onClick={() => {
												triggerHaptic("selection");
												setSelectedId(collection.id);
											}}
											data-vaul-no-drag
											className={cn(
												"flex min-h-11 w-full items-center justify-between rounded-md border px-3 py-2 text-left",
												"focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
												"transform-gpu active:scale-[0.98] motion-safe:transition-[background-color,border-color,transform] motion-safe:duration-150",
												"touch-manipulation [-webkit-tap-highlight-color:transparent]",
												isSelected
													? "border-primary bg-primary/5 text-foreground"
													: "border-border hover:bg-muted/50",
											)}
										>
											<span className="truncate font-medium">{collection.name}</span>
											{isSelected ? (
												<Badge variant="default" className="shrink-0">
													Choisie
												</Badge>
											) : null}
										</button>
									);
								})}
							</div>
						)}
					</ScrollArea>
				</DrawerBody>

				<DrawerFooter className="gap-2 pb-[env(safe-area-inset-bottom)]" data-vaul-no-drag>
					<Button
						type="button"
						onClick={handleSubmit}
						disabled={!selectedId || isPending || productIds.length === 0}
						aria-busy={isPending || undefined}
						data-vaul-no-drag
					>
						{isPending && (
							<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
						)}
						{isPending ? "Ajout en cours…" : "Lier à la collection"}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={isPending}
						data-vaul-no-drag
					>
						Annuler
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
