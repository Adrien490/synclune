"use client";

import { BookMarked, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
	ResponsiveDialogTrigger,
} from "@/shared/components/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

import {
	COLOR_LIBRARY,
	COLOR_LIBRARY_CATEGORIES,
	type ColorLibraryCategory,
	type ColorLibraryEntry,
} from "../../constants/color-library";

export interface ColorLibrarySelection {
	name: string;
	hex: string;
	description: string | null;
}

interface ColorLibrarySheetProps {
	onSelect: (entry: ColorLibrarySelection) => void;
	disabled?: boolean;
}

/**
 * Bibliothèque de ~30 couleurs prédéfinies bijouterie. Permet à la créatrice
 * d'éviter de chercher/mémoriser les codes hex pour les couleurs courantes
 * (or jaune 18K, quartz rose, saphir, etc.) et pré-remplit le formulaire de
 * création (name + hex + description) en un tap.
 *
 * - Mobile : Vaul drawer pleine hauteur (drag-handle natif, swipe-to-close).
 * - Desktop : Radix dialog centré.
 */
export function ColorLibrarySheet({ onSelect, disabled }: ColorLibrarySheetProps) {
	const haptic = useHaptic();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState<ColorLibraryCategory>("all");

	const filteredEntries = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		return COLOR_LIBRARY.filter((entry) => {
			if (category !== "all" && entry.category !== category) return false;
			if (normalizedQuery.length === 0) return true;
			return (
				entry.name.toLowerCase().includes(normalizedQuery) ||
				(entry.description?.toLowerCase().includes(normalizedQuery) ?? false)
			);
		});
	}, [category, query]);

	const handleSelect = (entry: ColorLibraryEntry) => {
		haptic("selection");
		onSelect({ name: entry.name, hex: entry.hex, description: entry.description });
		setOpen(false);
		setQuery("");
		setCategory("all");
	};

	return (
		<ResponsiveDialog open={open} onOpenChange={setOpen}>
			<ResponsiveDialogTrigger asChild>
				<Button
					type="button"
					variant="outline"
					disabled={disabled}
					onClick={() => haptic("light")}
					className="min-h-11 w-full transition-transform duration-150 active:scale-[0.98] sm:min-h-9 sm:w-auto"
				>
					<BookMarked className="size-4" aria-hidden="true" />
					Choisir depuis le catalogue
				</Button>
			</ResponsiveDialogTrigger>
			<ResponsiveDialogContent className="sm:max-w-2xl">
				<ResponsiveDialogHeader className="text-left">
					<ResponsiveDialogTitle>Bibliothèque de couleurs</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{COLOR_LIBRARY.length} couleurs prédéfinies pour la bijouterie. Sélectionne-en une pour
						pré-remplir le formulaire.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<div className="bg-background sticky top-0 z-10 space-y-3 pb-2">
					<div className="relative">
						<Search
							className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
							aria-hidden="true"
						/>
						<Input
							type="search"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Rechercher (nom ou description)…"
							className="h-11 pl-10 sm:h-9"
							inputMode="search"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
							aria-label="Rechercher dans la bibliothèque"
						/>
					</div>

					<div
						className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
						role="tablist"
						aria-label="Catégories de couleurs"
					>
						{COLOR_LIBRARY_CATEGORIES.map((cat) => {
							const isActive = category === cat.value;
							return (
								<button
									key={cat.value}
									type="button"
									role="tab"
									aria-selected={isActive}
									onClick={() => {
										setCategory(cat.value);
										haptic("light");
									}}
									className={cn(
										"focus-visible:ring-ring inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
										isActive
											? "border-foreground bg-foreground text-background"
											: "border-border bg-background hover:bg-muted",
									)}
								>
									{cat.label}
								</button>
							);
						})}
					</div>
				</div>

				{filteredEntries.length === 0 ? (
					<p className="text-muted-foreground py-12 text-center text-sm">
						Aucune couleur ne correspond à ta recherche.
					</p>
				) : (
					<ul className="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-3">
						{filteredEntries.map((entry) => (
							<li key={`${entry.name}-${entry.hex}`}>
								<button
									type="button"
									onClick={() => handleSelect(entry)}
									className="border-border hover:bg-muted/40 focus-visible:ring-ring active:bg-muted/60 group flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
									aria-label={`Utiliser ${entry.name} (${entry.hex})`}
								>
									<span
										className="border-border size-10 shrink-0 rounded-md border shadow-sm"
										style={{ backgroundColor: entry.hex }}
										aria-hidden="true"
									/>
									<span className="min-w-0 flex-1">
										<span className="text-foreground block truncate text-sm font-medium">
											{entry.name}
										</span>
										<span className="text-muted-foreground block truncate font-mono text-xs">
											{entry.hex.toUpperCase()}
										</span>
									</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
