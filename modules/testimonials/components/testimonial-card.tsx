"use client"

import { useState } from "react"
import { Quote } from "lucide-react"
import Image from "next/image"

import MediaLightbox from "@/modules/media/components/media-lightbox"
import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/utils/cn"

import type { TestimonialDisplay } from "../types/testimonial.types"

interface TestimonialCardProps {
	testimonial: TestimonialDisplay
	className?: string
}

export function TestimonialCard({ testimonial, className }: TestimonialCardProps) {
	const [lightboxOpen, setLightboxOpen] = useState(false)

	return (
		<Card className={cn("relative overflow-hidden", className)}>
			<CardContent className="space-y-4">
				{/* Image hero - cliquable pour lightbox */}
				{testimonial.imageUrl && (
					<>
						<button
							type="button"
							onClick={() => setLightboxOpen(true)}
							className="relative aspect-[4/3] w-full overflow-hidden rounded-lg group cursor-zoom-in"
						>
							<Image
								src={testimonial.imageUrl}
								alt={`Bijou personnalisé de ${testimonial.authorName}`}
								fill
								className="object-cover transition-transform duration-300 group-hover:scale-105"
								sizes="(max-width: 1024px) 100vw, 380px"
							/>
						</button>
						<MediaLightbox
							open={lightboxOpen}
							close={() => setLightboxOpen(false)}
							slides={[{ src: testimonial.imageUrl }]}
							index={0}
						/>
					</>
				)}

				{/* Citation */}
				<div className="space-y-3">
					<Quote
						className="size-6 text-primary/20 fill-primary/10"
						aria-hidden="true"
					/>
					<blockquote className="text-sm text-muted-foreground leading-relaxed italic">
						"{testimonial.content}"
					</blockquote>
				</div>

				{/* Auteur */}
				<footer className="pt-2">
					<cite className="not-italic">
						<span className="block font-medium text-foreground">
							{testimonial.authorName}
						</span>
						<span className="text-sm text-muted-foreground">
							Commande personnalisée
						</span>
					</cite>
				</footer>
			</CardContent>
		</Card>
	)
}
