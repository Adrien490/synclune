"use client";

import { useRef, useState } from "react";
import { useToolbarDrawer } from "@/shared/hooks";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpDown, EllipsisVertical, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import {
	BottomBar,
	ActiveDot,
	bottomBarContainerClass,
	bottomBarItemClass,
	bottomBarActiveItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
	bottomBarCenterActionClass,
	bottomBarCenterButtonClass,
	bottomBarCenterLabelClass,
} from "@/shared/components/bottom-bar";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useSheetStore } from "@/shared/providers/sheet-store-provider";
import { cn } from "@/shared/utils/cn";
import {
	GET_PRODUCTS_SORT_FIELDS,
	ADMIN_PRODUCTS_SORT_LABELS,
} from "../../constants/product.constants";
import { ProductsFilterSheet } from "./products-filter-sheet";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";

// ============================================================================
// SORT OPTIONS
// ============================================================================

const SORT_OPTIONS: SortOption[] = GET_PRODUCTS_SORT_FIELDS.map((field) => ({
	value: field,
	label: ADMIN_PRODUCTS_SORT_LABELS[field] ?? field,
}));

// ============================================================================
// TYPES
// ============================================================================

interface ProductsBottomBarProps {
	productTypes: Array<{ id: string; label: string; slug: string }>;
	collections: Array<{ id: string; name: string }>;
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
	maxPriceInCents: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Mobile bottom bar for admin products page (md:hidden).
 *
 * 5 items: Filtrer | Recherche | + Ajouter (FAB) | Trier | Menu
 *
 * - Filtrer → opens ProductsFilterSheet
 * - Recherche → opens search Drawer
 * - Ajouter → Link to create product page (FAB-style center button)
 * - Trier → opens SortDrawer
 * - Menu → opens contextual menu Drawer
 *
 * Portal to document.body to escape SidebarInset's containing block.
 */
export function ProductsBottomBar({
	productTypes,
	collections,
	colors,
	materials,
	maxPriceInCents,
}: ProductsBottomBarProps) {
	const { openDrawer, open, close, isOpen, onOpenChange } = useToolbarDrawer<
		"sort" | "search" | "filter" | "menu"
	>();
	const [focusedIndex, setFocusedIndex] = useState(0);

	const searchParams = useSearchParams();
	const router = useRouter();

	// Hide when any sheet/dialog is open (same pattern as CustomizationsBottomBar)
	const { isOpen: isMenuOpen } = useDialog("admin-menu-sheet");
	const isAnySheetOpen = useSheetStore((state) => state.openSheet !== null);

	// Active states
	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";
	const hasActiveSort = searchParams.has("sortBy");
	const hasActiveFilter = Array.from(searchParams.keys()).some((key) => key.startsWith("filter_"));

	const isHidden = openDrawer !== null || isMenuOpen || isAnySheetOpen;

	// Refs for toolbar items (5 items)
	const filterButtonRef = useRef<HTMLButtonElement>(null);
	const searchButtonRef = useRef<HTMLButtonElement>(null);
	const addLinkRef = useRef<HTMLAnchorElement>(null);
	const sortButtonRef = useRef<HTMLButtonElement>(null);
	const menuButtonRef = useRef<HTMLButtonElement>(null);
	const itemRefs = [filterButtonRef, searchButtonRef, addLinkRef, sortButtonRef, menuButtonRef];

	// Keyboard navigation for toolbar
	const handleToolbarKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
		const itemCount = 5;
		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowRight":
			case "ArrowDown":
				e.preventDefault();
				nextIndex = (currentIndex + 1) % itemCount;
				break;
			case "ArrowLeft":
			case "ArrowUp":
				e.preventDefault();
				nextIndex = (currentIndex - 1 + itemCount) % itemCount;
				break;
			case "Home":
				e.preventDefault();
				nextIndex = 0;
				break;
			case "End":
				e.preventDefault();
				nextIndex = itemCount - 1;
				break;
		}

		if (nextIndex !== null) {
			setFocusedIndex(nextIndex);
			itemRefs[nextIndex]?.current?.focus();
		}
	};

	const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const search = (formData.get("search") as string | null)?.trim();

		const params = new URLSearchParams(searchParams);
		params.delete("cursor");
		params.delete("direction");

		if (search) {
			params.set("search", search);
		} else {
			params.delete("search");
		}

		router.push(`?${params.toString()}`, { scroll: false });
		close();
	};

	const handleClearSearch = () => {
		const params = new URLSearchParams(searchParams);
		params.delete("search");
		params.delete("cursor");
		params.delete("direction");
		router.push(`?${params.toString()}`, { scroll: false });
		close();
	};

	const buttonClassName = cn(bottomBarItemClass, "min-w-16");
	const activeButtonClassName = cn(buttonClassName, bottomBarActiveItemClass);

	// Portal to document.body to escape admin sidebar's containing block
	if (typeof document === "undefined") return null;

	return createPortal(
		<>
			<BottomBar
				as="nav"
				aria-label="Filtres, recherche, ajout, tri et menu"
				isHidden={isHidden}
				breakpointClass="md:hidden"
				className="overflow-visible"
			>
				<div
					role="toolbar"
					aria-orientation="horizontal"
					aria-label="Filtres, recherche, ajout, tri et menu"
					className={cn(bottomBarContainerClass, "overflow-visible")}
				>
					{/* Filtrer */}
					<button
						ref={filterButtonRef}
						type="button"
						onClick={() => open("filter")}
						onKeyDown={(e) => handleToolbarKeyDown(e, 0)}
						onFocus={() => setFocusedIndex(0)}
						tabIndex={focusedIndex === 0 ? 0 : -1}
						className={hasActiveFilter ? activeButtonClassName : buttonClassName}
						aria-label={
							hasActiveFilter ? "Filtres actifs. Modifier les filtres" : "Ouvrir les filtres"
						}
						aria-haspopup="dialog"
					>
						{hasActiveFilter && <ActiveDot />}
						<SlidersHorizontal className={bottomBarIconClass} aria-hidden="true" />
						<span className={bottomBarLabelClass}>Filtrer</span>
					</button>

					{/* Rechercher */}
					<button
						ref={searchButtonRef}
						type="button"
						onClick={() => open("search")}
						onKeyDown={(e) => handleToolbarKeyDown(e, 1)}
						onFocus={() => setFocusedIndex(1)}
						tabIndex={focusedIndex === 1 ? 0 : -1}
						className={hasActiveSearch ? activeButtonClassName : buttonClassName}
						aria-label={
							hasActiveSearch
								? `Recherche: "${searchParams.get("search")}". Modifier la recherche`
								: "Ouvrir la recherche"
						}
						aria-haspopup="dialog"
					>
						{hasActiveSearch && <ActiveDot />}
						<Search className={bottomBarIconClass} aria-hidden="true" />
						<span className={bottomBarLabelClass}>Recherche</span>
					</button>

					{/* Ajouter (FAB center action) */}
					<div className={bottomBarCenterActionClass}>
						<Link
							ref={addLinkRef}
							href="/admin/catalogue/produits/nouveau"
							onKeyDown={(e) => handleToolbarKeyDown(e, 2)}
							onFocus={() => setFocusedIndex(2)}
							tabIndex={focusedIndex === 2 ? 0 : -1}
							className={bottomBarCenterButtonClass}
							aria-label="Créer un nouveau produit"
						>
							<Plus className="size-7" aria-hidden="true" />
						</Link>
						<span className={bottomBarCenterLabelClass} aria-hidden="true">
							Ajouter
						</span>
					</div>

					{/* Trier */}
					<button
						ref={sortButtonRef}
						type="button"
						onClick={() => open("sort")}
						onKeyDown={(e) => handleToolbarKeyDown(e, 3)}
						onFocus={() => setFocusedIndex(3)}
						tabIndex={focusedIndex === 3 ? 0 : -1}
						className={hasActiveSort ? activeButtonClassName : buttonClassName}
						aria-label={hasActiveSort ? "Tri actif. Modifier le tri" : "Ouvrir les options de tri"}
						aria-haspopup="dialog"
					>
						{hasActiveSort && <ActiveDot />}
						<ArrowUpDown className={bottomBarIconClass} aria-hidden="true" />
						<span className={bottomBarLabelClass}>Trier</span>
					</button>

					{/* Menu */}
					<button
						ref={menuButtonRef}
						type="button"
						onClick={() => open("menu")}
						onKeyDown={(e) => handleToolbarKeyDown(e, 4)}
						onFocus={() => setFocusedIndex(4)}
						tabIndex={focusedIndex === 4 ? 0 : -1}
						className={buttonClassName}
						aria-label="Ouvrir le menu"
						aria-haspopup="dialog"
					>
						<EllipsisVertical className={bottomBarIconClass} aria-hidden="true" />
						<span className={bottomBarLabelClass}>Menu</span>
					</button>
				</div>
			</BottomBar>

			{/* Filter Sheet */}
			<ProductsFilterSheet
				open={isOpen("filter")}
				onOpenChange={onOpenChange("filter")}
				hideTrigger
				productTypes={productTypes}
				collections={collections}
				colors={colors}
				materials={materials}
				maxPriceInCents={maxPriceInCents}
			/>

			{/* Sort Drawer */}
			<SortDrawer
				open={isOpen("sort")}
				onOpenChange={onOpenChange("sort")}
				options={SORT_OPTIONS}
				showResetOption
			/>

			{/* Menu Drawer */}
			<Drawer open={isOpen("menu")} onOpenChange={onOpenChange("menu")}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Menu</DrawerTitle>
					</DrawerHeader>
					<DrawerBody className="flex flex-col gap-2">
						<Button
							variant="outline"
							className="w-full justify-start"
							onClick={() => {
								router.refresh();
								close();
							}}
						>
							Actualiser
						</Button>
						<Button variant="outline" className="w-full justify-start" disabled>
							Paramètres catalogue
						</Button>
					</DrawerBody>
				</DrawerContent>
			</Drawer>

			{/* Search Drawer */}
			<Drawer open={isOpen("search")} onOpenChange={onOpenChange("search")}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Rechercher</DrawerTitle>
					</DrawerHeader>
					<DrawerBody>
						<form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
							<div className="relative">
								<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
								<input
									name="search"
									type="search"
									// eslint-disable-next-line jsx-a11y/no-autofocus -- Drawer context: user explicitly opened search
									autoFocus
									defaultValue={searchParams.get("search") ?? ""}
									placeholder="Rechercher par titre, type..."
									aria-label="Rechercher un produit par titre ou type"
									className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-11 w-full rounded-lg border py-2 pr-10 pl-10 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
								/>
								{hasActiveSearch && (
									<button
										type="button"
										onClick={handleClearSearch}
										className="absolute top-1/2 right-3 -translate-y-1/2"
										aria-label="Effacer la recherche"
									>
										<X className="text-muted-foreground size-4" />
									</button>
								)}
							</div>
							<Button type="submit" className="w-full">
								Rechercher
							</Button>
						</form>
					</DrawerBody>
				</DrawerContent>
			</Drawer>
		</>,
		document.body,
	);
}
