"use client";

import { ImageBrokenIcon, ImageSquareIcon, ImagesIcon } from "@phosphor-icons/react/ssr";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import Image from "next/image";
import Link from "next/link";
import { lazy, Suspense, useState } from "react";
import { useReducedMotion } from "motion/react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useLightbox } from "@/shared/hooks/use-lightbox";
import { buildLightboxSlides } from "@/modules/media/services/lightbox-builder.service";
import { resolveMediaThumbSrc } from "@/modules/media/utils/media-utils";
import { VideoPlayBadge } from "@/shared/components/ui/video-play-badge";
import type { ProductMedia } from "@/modules/media/types/product-media.types";
import type { GetProductReturn } from "@/modules/products/types/product.types";

const MediaLightbox = lazy(() => import("@/modules/media/components/media-lightbox"));

type ProductImage = GetProductReturn["media"][number];

interface ProductDetailMediaCardProps {
	product: GetProductReturn;
}

function toProductMedia(image: ProductImage, fallbackAlt: string): ProductMedia {
	return {
		id: image.id,
		url: image.url,
		alt: image.alt ?? fallbackAlt,
		// GET_PRODUCT_SELECT ne filtre pas les vidéos : forcer "IMAGE" ici ferait
		// construire une slide image à partir d'une URL .mp4 dans la lightbox.
		type: image.type,
	};
}

/**
 * Médias du PRODUIT (schéma lean : la galerie vit sur le produit, plus sur les
 * variantes — plus de sélecteur de variante ici).
 */
export function ProductDetailMediaCard({ product }: ProductDetailMediaCardProps) {
	const haptic = useHaptic();
	const lightbox = useLightbox();
	const prefersReducedMotion = useReducedMotion();
	const [activeIndex, setActiveIndex] = useState(0);

	const images = product.media;
	const [primary, ...rest] = images;
	// Une vidéo n'est pas décodable par l'optimiseur -> tuile bg-muted
	const primarySrc = primary ? resolveMediaThumbSrc(primary) : null;

	const slides = buildLightboxSlides(
		images.map((image) => toProductMedia(image, product.name)),
		prefersReducedMotion ?? false,
	);

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
				{primary ? (
					<>
						<button
							type="button"
							onClick={() => openAt(0)}
							aria-label={`Agrandir l'image principale${primary.alt ? ` : ${primary.alt}` : ""}`}
							className="focus-visible:ring-ring relative block aspect-square w-full max-w-sm cursor-zoom-in touch-manipulation overflow-hidden rounded-lg border transition-transform duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.99]"
						>
							{primarySrc ? (
								<Image
									src={primarySrc}
									alt={primary.alt ?? product.name}
									fill
									sizes="(max-width: 768px) 100vw, 384px"
									quality={IMAGE_QUALITY.STANDARD}
									className="object-cover"
									preload
									fetchPriority="high"
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
												aria-label={`Agrandir l'image ${restIndex + 2}${image.alt ? ` : ${image.alt}` : ""}`}
												className="focus-visible:ring-ring relative block aspect-square w-full cursor-zoom-in touch-manipulation overflow-hidden rounded-md border transition-transform duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95"
											>
												{thumbSrc ? (
													<Image
														src={thumbSrc}
														alt={image.alt ?? ""}
														fill
														sizes="120px"
														quality={IMAGE_QUALITY.THUMBNAIL}
														className="object-cover"
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
