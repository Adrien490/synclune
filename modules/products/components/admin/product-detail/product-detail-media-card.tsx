"use client";

import { ImageBrokenIcon, ImageSquareIcon, ImagesIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";
import { lazy, Suspense, useState } from "react";
import { useReducedMotion } from "motion/react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useLightbox } from "@/shared/hooks/use-lightbox";
import { buildLightboxSlides } from "@/modules/media/services/lightbox-builder.service";
import { resolveMediaThumbSrc } from "@/modules/media/utils/media-utils";
import { VideoPlayBadge } from "@/shared/components/ui/video-play-badge";
import { buildVariantLabel } from "@/modules/skus/utils/sku-variant-label";
import type { ProductMedia } from "@/modules/media/types/product-media.types";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";

const MediaLightbox = lazy(() => import("@/modules/media/components/media-lightbox"));

type ProductImage = GetProductReturn["skus"][number]["images"][number];

interface ProductDetailMediaCardProps {
	product: GetProductReturn;
}

function sortImages(images: readonly ProductImage[]): ProductImage[] {
	return images.toSorted((a, b) => {
		if (a.isPrimary && !b.isPrimary) return -1;
		if (!a.isPrimary && b.isPrimary) return 1;
		return 0;
	});
}

function pickInitialSku(skusWithImages: ProductSku[]): ProductSku | undefined {
	return skusWithImages.find((sku) => sku.isDefault) ?? skusWithImages[0];
}

function toProductMedia(image: ProductImage, fallbackAlt: string): ProductMedia {
	return {
		id: image.id,
		url: image.url,
		thumbnailUrl: image.thumbnailUrl,
		alt: image.altText ?? fallbackAlt,
		blurDataUrl: image.blurDataUrl ?? undefined,
		width: image.width,
		height: image.height,
		// GET_PRODUCT_SELECT ne filtre pas les vidéos : forcer "IMAGE" ici faisait
		// construire une slide image à partir d'une URL .mp4 dans la lightbox.
		mediaType: image.mediaType,
	};
}

export function ProductDetailMediaCard({ product }: ProductDetailMediaCardProps) {
	const haptic = useHaptic();
	const lightbox = useLightbox();
	const prefersReducedMotion = useReducedMotion();
	const [activeIndex, setActiveIndex] = useState(0);

	const skusWithImages = product.skus.filter((sku) => sku.images.length > 0);
	const initialSku = pickInitialSku(skusWithImages);
	const [selectedSkuId, setSelectedSkuId] = useState(initialSku?.id ?? null);

	// Le SKU sélectionné peut disparaître (improbable sur une fiche statique) → fallback.
	const selectedSku = skusWithImages.find((sku) => sku.id === selectedSkuId) ?? initialSku;
	const showVariantSelector = skusWithImages.length > 1;

	const images = selectedSku ? sortImages(selectedSku.images) : [];
	const [primary, ...rest] = images;
	// Une vidéo sans poster n'est pas décodable par l'optimiseur -> tuile bg-muted
	const primarySrc = primary ? resolveMediaThumbSrc(primary) : null;

	const slides = buildLightboxSlides(
		images.map((image) => toProductMedia(image, product.title)),
		prefersReducedMotion ?? false,
	);

	const selectSku = (skuId: string) => {
		haptic("light");
		setSelectedSkuId(skuId);
		setActiveIndex(0);
	};

	const openAt = (index: number) => {
		haptic("light");
		setActiveIndex(index);
		lightbox.open();
	};

	return (
		<Card style={{ viewTransitionName: "product-edit-media" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ImagesIcon className="size-5" aria-hidden="true" />
					Médias
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{showVariantSelector ? (
					<div
						className="flex flex-wrap gap-2"
						role="group"
						aria-label="Choisir la variante à prévisualiser"
					>
						{skusWithImages.map((sku) => {
							const isSelected = sku.id === selectedSku?.id;
							const label = buildVariantLabel(sku) || sku.sku;
							return (
								<button
									key={sku.id}
									type="button"
									onClick={() => selectSku(sku.id)}
									aria-pressed={isSelected}
									aria-label={`Variante : ${label} (${sku.images.length} image${sku.images.length > 1 ? "s" : ""})`}
									className={cn(
										"focus-visible:ring-ring inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 sm:min-h-9",
										isSelected
											? "border-primary bg-primary text-primary-foreground"
											: "bg-background hover:bg-muted/50",
									)}
								>
									{sku.colors.length > 0 ? (
										<span className="flex shrink-0 items-center -space-x-1" aria-hidden="true">
											{sku.colors.slice(0, 3).map((entry) => (
												<span
													key={entry.colorId}
													className="border-background size-3 rounded-full border"
													style={{ backgroundColor: entry.color.hex }}
												/>
											))}
										</span>
									) : null}
									<span className="max-w-32 truncate">{label}</span>
								</button>
							);
						})}
					</div>
				) : null}

				{primary ? (
					<>
						<button
							type="button"
							onClick={() => openAt(0)}
							aria-label={`Agrandir l'image principale${primary.altText ? ` : ${primary.altText}` : ""}`}
							className="focus-visible:ring-ring relative block aspect-square w-full max-w-sm cursor-zoom-in touch-manipulation overflow-hidden rounded-lg border transition-transform duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.99]"
						>
							{primarySrc ? (
								<Image
									src={primarySrc}
									alt={primary.altText ?? product.title}
									fill
									sizes="(max-width: 768px) 100vw, 384px"
									className="object-cover"
									preload
									fetchPriority="high"
									{...(primary.blurDataUrl
										? { placeholder: "blur" as const, blurDataURL: primary.blurDataUrl }
										: {})}
								/>
							) : (
								<div className="bg-muted h-full w-full">
									<VideoPlayBadge />
								</div>
							)}
						</button>
						{rest.length > 0 ? (
							<ul
								className="grid grid-cols-4 gap-2 sm:grid-cols-6"
								aria-label={`${rest.length} image${rest.length > 1 ? "s" : ""} secondaire${rest.length > 1 ? "s" : ""}`}
							>
								{rest.map((image, restIndex) => {
									const thumbSrc = resolveMediaThumbSrc(image);
									return (
										<li key={image.id} className="relative">
											<button
												type="button"
												onClick={() => openAt(restIndex + 1)}
												aria-label={`Agrandir l'image ${restIndex + 2}${image.altText ? ` : ${image.altText}` : ""}`}
												className="focus-visible:ring-ring relative block aspect-square w-full cursor-zoom-in touch-manipulation overflow-hidden rounded-md border transition-transform duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95"
											>
												{thumbSrc ? (
													<Image
														src={thumbSrc}
														alt={image.altText ?? ""}
														fill
														sizes="120px"
														className="object-cover"
														{...(image.blurDataUrl
															? { placeholder: "blur" as const, blurDataURL: image.blurDataUrl }
															: {})}
													/>
												) : (
													<div className="bg-muted h-full w-full">
														<VideoPlayBadge />
													</div>
												)}
											</button>
										</li>
									);
								})}
							</ul>
						) : null}
						{lightbox.isOpen ? (
							<Suspense
								fallback={
									<div
										className="bg-background/95 fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md"
										role="status"
										aria-busy="true"
										aria-label="Chargement de la galerie"
									>
										<div className="bg-muted/30 aspect-square w-full max-w-3xl rounded-lg motion-safe:animate-pulse" />
									</div>
								}
							>
								<MediaLightbox
									open={lightbox.isOpen}
									close={lightbox.close}
									slides={slides}
									index={activeIndex}
									onIndexChange={setActiveIndex}
								/>
							</Suspense>
						) : null}
					</>
				) : (
					<div
						className="bg-muted/40 text-muted-foreground flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-4 text-center"
						role="status"
					>
						<ImageBrokenIcon className="size-8" aria-hidden="true" />
						<p className="text-sm">Aucun média</p>
						<Button
							render={
								<Link
									href={`/admin/catalogue/produits/${product.slug}/modifier`}
									onClick={() => haptic("light")}
								/>
							}
							size="sm"
							variant="outline"
							className="touch-manipulation transition-transform duration-150 active:scale-[0.98]"
						>
							<ImageSquareIcon className="size-4" aria-hidden="true" />
							Ajouter des médias
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
