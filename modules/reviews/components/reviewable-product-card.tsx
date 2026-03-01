"use client";

import { ExternalLink, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
	ResponsiveDialogTrigger,
} from "@/shared/components/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";

import type { ReviewableProduct } from "../types/review.types";
import { CreateReviewForm } from "./create-review-form";

interface ReviewableProductCardProps {
	product: ReviewableProduct;
	className?: string;
}

/**
 * Carte d'un produit à évaluer
 * Affiche le produit avec un CTA pour laisser un avis
 */
export function ReviewableProductCard({ product, className }: ReviewableProductCardProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const formatDate = (date: Date | null) => {
		if (!date) return "Non disponible";
		return new Intl.DateTimeFormat("fr-FR", {
			day: "numeric",
			month: "long",
			year: "numeric",
		}).format(new Date(date));
	};

	// Génération ID unique pour aria-labelledby
	const titleId = `reviewable-product-${product.productId}`;

	return (
		<article
			aria-labelledby={titleId}
			className={cn("border-border/60 overflow-hidden rounded-lg border", className)}
		>
			<div className="flex flex-col sm:flex-row">
				{/* Image produit */}
				<div className="relative aspect-[3/2] w-full shrink-0 sm:aspect-auto sm:h-auto sm:w-32">
					{product.productImage ? (
						<Image
							src={product.productImage.url}
							alt={product.productImage.altText ?? product.productTitle}
							fill
							className="object-cover"
							sizes="(max-width: 640px) 100vw, 128px"
							placeholder={product.productImage.blurDataUrl ? "blur" : "empty"}
							blurDataURL={product.productImage.blurDataUrl ?? undefined}
						/>
					) : (
						<div className="bg-muted flex h-full w-full items-center justify-center">
							<Star className="text-muted-foreground size-8" aria-hidden="true" />
						</div>
					)}
				</div>

				{/* Contenu */}
				<div className="flex-1 space-y-3 p-4">
					{/* Titre produit */}
					<div>
						<Link
							id={titleId}
							href={`/creations/${product.productSlug}`}
							className="hover:text-primary line-clamp-1 flex items-center gap-1 font-medium transition-colors"
						>
							{product.productTitle}
							<ExternalLink className="size-3 shrink-0" aria-hidden="true" />
						</Link>
						<p className="text-muted-foreground mt-1 text-xs">
							Livré le {formatDate(product.deliveredAt)}
						</p>
					</div>

					{/* CTA */}
					<ResponsiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
						<ResponsiveDialogTrigger asChild>
							<Button size="sm" className="min-h-11 w-full sm:w-auto">
								<Star className="mr-1 size-4" aria-hidden="true" />
								Laisser un avis
							</Button>
						</ResponsiveDialogTrigger>
						<ResponsiveDialogContent className="max-w-lg">
							<ResponsiveDialogHeader>
								<ResponsiveDialogTitle>Donner mon avis</ResponsiveDialogTitle>
								<ResponsiveDialogDescription>
									Partagez votre expérience avec {product.productTitle}
								</ResponsiveDialogDescription>
							</ResponsiveDialogHeader>
							<CreateReviewForm
								productId={product.productId}
								orderItemId={product.orderItemId}
								productTitle={product.productTitle}
								onSuccess={() => setIsDialogOpen(false)}
							/>
						</ResponsiveDialogContent>
					</ResponsiveDialog>
				</div>
			</div>
		</article>
	);
}
