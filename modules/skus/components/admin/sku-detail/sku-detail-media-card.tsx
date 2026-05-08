"use client";

import { ImageOff, ImagePlus, Images } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { lazy, Suspense, useState } from "react";
import { useReducedMotion } from "motion/react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useLightbox } from "@/shared/hooks/use-lightbox";
import { buildLightboxSlides } from "@/modules/media/services/lightbox-builder.service";
import type { ProductMedia } from "@/modules/media/types/product-media.types";
import type { SkuDetailReturn } from "@/modules/skus/data/get-sku";

const MediaLightbox = lazy(() => import("@/modules/media/components/media-lightbox"));

type SkuImage = SkuDetailReturn["images"][number];

interface SkuDetailMediaCardProps {
	sku: SkuDetailReturn;
}

function sortGalleryImages(images: SkuImage[]): SkuImage[] {
	return [...images].sort((a, b) => {
		if (a.isPrimary && !b.isPrimary) return -1;
		if (!a.isPrimary && b.isPrimary) return 1;
		return 0;
	});
}

function toProductMedia(image: SkuImage, fallbackAlt: string): ProductMedia {
	return {
		id: image.id,
		url: image.url,
		thumbnailUrl: image.thumbnailUrl,
		alt: image.altText ?? fallbackAlt,
		blurDataUrl: image.blurDataUrl ?? undefined,
		mediaType: image.mediaType === "VIDEO" ? "VIDEO" : "IMAGE",
	};
}

export function SkuDetailMediaCard({ sku }: SkuDetailMediaCardProps) {
	const haptic = useHaptic();
	const lightbox = useLightbox();
	const prefersReducedMotion = useReducedMotion();
	const [activeIndex, setActiveIndex] = useState(0);

	const images = sortGalleryImages(sku.images);
	const [primary, ...rest] = images;
	const fallbackAlt = `${sku.sku}${sku.product.title ? ` - ${sku.product.title}` : ""}`;

	const slides = buildLightboxSlides(
		images.map((image) => toProductMedia(image, fallbackAlt)),
		prefersReducedMotion ?? false,
	);

	const openAt = (index: number) => {
		haptic("light");
		setActiveIndex(index);
		lightbox.open();
	};

	const editHref = `/admin/catalogue/produits/${sku.product.slug}/variantes/${sku.id}/modifier`;

	return (
		<Card style={{ viewTransitionName: "sku-media" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Images className="size-5" aria-hidden="true" />
					Médias
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{primary ? (
					<>
						<button
							type="button"
							onClick={() => openAt(0)}
							aria-label={`Agrandir l'image principale${primary.altText ? ` : ${primary.altText}` : ""}`}
							className="focus-visible:ring-ring relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg border transition-transform duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.99]"
						>
							<Image
								src={primary.url}
								alt={primary.altText ?? fallbackAlt}
								fill
								sizes="(max-width: 768px) 100vw, (max-width: 1024px) 66vw, 600px"
								className="object-cover"
								priority
								{...(primary.blurDataUrl
									? { placeholder: "blur" as const, blurDataURL: primary.blurDataUrl }
									: {})}
							/>
						</button>
						{rest.length > 0 ? (
							<ul
								className="grid grid-cols-4 gap-2 sm:grid-cols-6"
								aria-label={`${rest.length} image${rest.length > 1 ? "s" : ""} secondaire${rest.length > 1 ? "s" : ""}`}
							>
								{rest.map((image, restIndex) => (
									<li key={image.id} className="relative">
										<button
											type="button"
											onClick={() => openAt(restIndex + 1)}
											aria-label={`Agrandir l'image ${restIndex + 2}${image.altText ? ` : ${image.altText}` : ""}`}
											className="focus-visible:ring-ring relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-md border transition-transform duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95"
										>
											<Image
												src={image.thumbnailUrl ?? image.url}
												alt={image.altText ?? ""}
												fill
												sizes="120px"
												className="object-cover"
												{...(image.blurDataUrl
													? { placeholder: "blur" as const, blurDataURL: image.blurDataUrl }
													: {})}
											/>
										</button>
									</li>
								))}
							</ul>
						) : null}
						{lightbox.isOpen ? (
							<Suspense fallback={null}>
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
						<ImageOff className="size-8" aria-hidden="true" />
						<p className="text-sm">Aucun média</p>
						<Button
							asChild
							size="sm"
							variant="outline"
							className="transition-transform duration-150 active:scale-[0.98]"
						>
							<Link href={editHref} onClick={() => haptic("light")}>
								<ImagePlus className="size-4" aria-hidden="true" />
								Ajouter des médias
							</Link>
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
