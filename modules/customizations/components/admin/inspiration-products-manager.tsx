"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Pencil, Plus, Search, Sparkles, X } from "lucide-react";

import { updateCustomizationInspirationProducts } from "@/modules/customizations/actions/update-customization-inspiration-products";
import { quickSearch } from "@/modules/products/actions/quick-search";
import type { QuickSearchProduct } from "@/modules/products/data/quick-search-products";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { ROUTES } from "@/shared/constants/urls";
import { logger } from "@/shared/lib/logger";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

import { MAX_INSPIRATION_PRODUCTS } from "@/modules/customizations/schemas/update-inspiration-products.schema";

export type InspirationProduct = {
	id: string;
	title: string;
	slug: string;
	imageUrl?: string;
};

interface InspirationProductsManagerProps {
	requestId: string;
	products: InspirationProduct[];
}

const SEARCH_MIN_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

function getProductImage(product: QuickSearchProduct): string | undefined {
	const defaultSku = product.skus.find((sku) => sku.isDefault) ?? product.skus[0];
	return defaultSku?.images[0]?.url;
}

export function InspirationProductsManager({
	requestId,
	products,
}: InspirationProductsManagerProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<InspirationProduct[]>(products);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<QuickSearchProduct[]>([]);
	const [isSearching, startSearch] = useTransition();
	const latestQueryRef = useRef("");

	const [, action, isSubmitting] = useActionState(
		withCallbacks(
			updateCustomizationInspirationProducts,
			createToastCallbacks({
				loadingMessage: "Mise à jour des produits inspirants...",
				onSuccess: () => {
					setOpen(false);
					router.refresh();
				},
			}),
		),
		undefined,
	);

	const openDialog = () => {
		setSelected(products);
		setQuery("");
		setResults([]);
		setOpen(true);
	};

	// Debounced search
	useEffect(() => {
		const trimmed = query.trim();
		if (trimmed.length < SEARCH_MIN_LENGTH) return;

		const timeoutId = setTimeout(() => {
			latestQueryRef.current = trimmed;
			startSearch(async () => {
				try {
					const result = await quickSearch(trimmed);
					if (latestQueryRef.current !== trimmed) return;
					if (result.kind === "success") {
						setResults(result.products);
					} else {
						setResults([]);
					}
				} catch (e) {
					logger.error("Inspiration product search failed", e, {
						action: "InspirationProductsManager",
					});
					setResults([]);
				}
			});
		}, SEARCH_DEBOUNCE_MS);

		return () => clearTimeout(timeoutId);
	}, [query]);

	const isSelected = (id: string) => selected.some((p) => p.id === id);

	const addProduct = (product: QuickSearchProduct) => {
		if (isSelected(product.id)) return;
		if (selected.length >= MAX_INSPIRATION_PRODUCTS) return;
		setSelected((prev) => [
			...prev,
			{
				id: product.id,
				title: product.title,
				slug: product.slug,
				imageUrl: getProductImage(product),
			},
		]);
	};

	const removeProduct = (id: string) => {
		setSelected((prev) => prev.filter((p) => p.id !== id));
	};

	const handleSubmit = () => {
		const formData = new FormData();
		formData.set("requestId", requestId);
		formData.set("productIds", JSON.stringify(selected.map((p) => p.id)));
		action(formData);
	};

	const limitReached = selected.length >= MAX_INSPIRATION_PRODUCTS;

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-lg">
						<Sparkles className="h-5 w-5" aria-hidden="true" />
						Produits inspirants ({products.length})
					</CardTitle>
					<Button variant="outline" size="sm" onClick={openDialog}>
						<Pencil className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
						Modifier
					</Button>
				</CardHeader>
				<CardContent>
					{products.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Aucun produit inspirant n&apos;est associé à cette demande.
						</p>
					) : (
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
							{products.map((product) => (
								<Link
									key={product.id}
									href={ROUTES.SHOP.PRODUCT(product.slug)}
									target="_blank"
									rel="noopener noreferrer"
									className="group bg-card hover:border-primary block overflow-hidden rounded-lg border transition-colors"
								>
									<div className="bg-muted relative aspect-square">
										{product.imageUrl && (
											<Image
												src={product.imageUrl}
												alt={product.title}
												fill
												sizes="(max-width: 640px) 50vw, 33vw"
												className="object-cover"
											/>
										)}
									</div>
									<p className="group-hover:text-primary truncate p-2 text-xs font-medium">
										{product.title}
									</p>
								</Link>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<ResponsiveDialog
				open={open}
				onOpenChange={(value) => {
					if (!value && !isSubmitting) setOpen(false);
				}}
			>
				<ResponsiveDialogContent className="max-w-2xl">
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle>Gérer les produits inspirants</ResponsiveDialogTitle>
						<ResponsiveDialogDescription>
							Sélectionnez jusqu&apos;à {MAX_INSPIRATION_PRODUCTS} produits existants comme
							références pour cette demande.
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<div className="space-y-4">
						{/* Selected products */}
						<div>
							<p className="mb-2 text-sm font-medium">
								Sélection actuelle ({selected.length}/{MAX_INSPIRATION_PRODUCTS})
							</p>
							{selected.length === 0 ? (
								<p className="text-muted-foreground text-sm">Aucun produit sélectionné.</p>
							) : (
								<div className="flex flex-wrap gap-2">
									{selected.map((product) => (
										<Badge
											key={product.id}
											variant="secondary"
											className="flex items-center gap-1.5 py-1 pr-1 pl-2"
										>
											<span className="max-w-[160px] truncate">{product.title}</span>
											<button
												type="button"
												onClick={() => removeProduct(product.id)}
												className="hover:bg-background/60 rounded-full p-0.5"
												aria-label={`Retirer ${product.title}`}
											>
												<X className="h-3 w-3" aria-hidden="true" />
											</button>
										</Badge>
									))}
								</div>
							)}
						</div>

						{/* Search */}
						<div className="space-y-2">
							<label htmlFor="inspiration-search" className="text-sm font-medium">
								Rechercher un produit
							</label>
							<div className="relative">
								<Search
									className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4"
									aria-hidden="true"
								/>
								<Input
									id="inspiration-search"
									type="search"
									inputMode="search"
									enterKeyHint="search"
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Titre du produit..."
									className="pl-9"
									disabled={limitReached}
								/>
								{isSearching && (
									<Loader2
										className="text-muted-foreground absolute top-2.5 right-3 h-4 w-4 animate-spin"
										aria-hidden="true"
									/>
								)}
							</div>
							{limitReached && (
								<p className="text-muted-foreground text-xs">
									Limite atteinte. Retirez un produit pour en ajouter un nouveau.
								</p>
							)}
						</div>

						{/* Search results */}
						{query.trim().length >= SEARCH_MIN_LENGTH && (
							<div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-1">
								{results.length === 0 && !isSearching && (
									<p className="text-muted-foreground p-3 text-sm">
										Aucun résultat pour &laquo;&nbsp;{query}&nbsp;&raquo;.
									</p>
								)}
								{results.map((product) => {
									const alreadySelected = isSelected(product.id);
									const imageUrl = getProductImage(product);
									return (
										<button
											key={product.id}
											type="button"
											onClick={() => addProduct(product)}
											disabled={alreadySelected || limitReached}
											className="hover:bg-muted disabled:bg-muted/40 flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60"
										>
											<div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded">
												{imageUrl && (
													<Image src={imageUrl} alt="" fill sizes="40px" className="object-cover" />
												)}
											</div>
											<span className="flex-1 truncate text-sm font-medium">{product.title}</span>
											{alreadySelected ? (
												<Badge variant="secondary" className="text-xs">
													Ajouté
												</Badge>
											) : (
												<Plus className="text-muted-foreground h-4 w-4" aria-hidden="true" />
											)}
										</button>
									);
								})}
							</div>
						)}
					</div>

					<ResponsiveDialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isSubmitting}
						>
							Annuler
						</Button>
						<Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
									Enregistrement...
								</>
							) : (
								"Enregistrer"
							)}
						</Button>
					</ResponsiveDialogFooter>
				</ResponsiveDialogContent>
			</ResponsiveDialog>
		</>
	);
}
