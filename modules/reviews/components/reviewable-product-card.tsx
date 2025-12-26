"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Star, ExternalLink } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { CardContent } from "@/shared/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/shared/components/ui/dialog"
import { cn } from "@/shared/utils/cn"

import type { ReviewableProduct } from "../types/review.types"
import { CreateReviewForm } from "./create-review-form"

interface ReviewableProductCardProps {
	product: ReviewableProduct
	className?: string
}

/**
 * Carte d'un produit à évaluer
 * Affiche le produit avec un CTA pour laisser un avis
 */
export function ReviewableProductCard({ product, className }: ReviewableProductCardProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false)

	const formatDate = (date: Date | null) => {
		if (!date) return "Non disponible"
		return new Intl.DateTimeFormat("fr-FR", {
			day: "numeric",
			month: "long",
			year: "numeric",
		}).format(new Date(date))
	}

	// Génération ID unique pour aria-labelledby
	const titleId = `reviewable-product-${product.productId}`

	return (
		<article
			aria-labelledby={titleId}
			className={cn("overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm", className)}
		>
			<CardContent className="p-0">
				<div className="flex flex-col sm:flex-row">
					{/* Image produit */}
					<div className="relative w-full sm:w-32 h-32 sm:h-auto shrink-0">
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
							<div className="w-full h-full bg-muted flex items-center justify-center">
								<Star className="size-8 text-muted-foreground" aria-hidden="true" />
							</div>
						)}
					</div>

					{/* Contenu */}
					<div className="flex-1 p-4 space-y-3">
						{/* Titre produit */}
						<div>
							<Link
								id={titleId}
								href={`/creations/${product.productSlug}`}
								className="font-medium hover:text-primary transition-colors line-clamp-1 flex items-center gap-1"
							>
								{product.productTitle}
								<ExternalLink className="size-3 shrink-0" aria-hidden="true" />
							</Link>
							<p className="text-xs text-muted-foreground mt-1">
								Livré le {formatDate(product.deliveredAt)}
							</p>
						</div>

						{/* CTA */}
						<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
							<DialogTrigger asChild>
								<Button size="sm" className="w-full sm:w-auto">
									<Star className="size-4 mr-1" aria-hidden="true" />
									Laisser un avis
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-lg">
								<DialogHeader>
									<DialogTitle>Donner mon avis</DialogTitle>
									<DialogDescription>
										Partagez votre expérience avec {product.productTitle}
									</DialogDescription>
								</DialogHeader>
								<CreateReviewForm
									productId={product.productId}
									orderItemId={product.orderItemId}
									productTitle={product.productTitle}
									onSuccess={() => setIsDialogOpen(false)}
								/>
							</DialogContent>
						</Dialog>
					</div>
				</div>
			</CardContent>
		</article>
	)
}
