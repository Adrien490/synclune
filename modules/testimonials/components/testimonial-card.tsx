import { Quote } from "lucide-react"
import Image from "next/image"

import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/utils/cn"

import type { TestimonialDisplay } from "../types/testimonial.types"

interface TestimonialCardProps {
	testimonial: TestimonialDisplay
	className?: string
}

export function TestimonialCard({ testimonial, className }: TestimonialCardProps) {
	return (
		<Card className={cn("relative overflow-hidden", className)}>
			<CardContent className="space-y-4">
				{/* Quote icon */}
				<Quote
					className="size-8 text-primary/20 fill-primary/10"
					aria-hidden="true"
				/>

				{/* Testimonial content */}
				<blockquote className="text-foreground/90 leading-relaxed italic">
					"{testimonial.content}"
				</blockquote>

				{/* Author */}
				<footer className="flex items-center gap-3 pt-2">
					{testimonial.imageUrl && (
						<div className="relative size-12 overflow-hidden rounded-full ring-2 ring-primary/10">
							<Image
								src={testimonial.imageUrl}
								alt={`Bijou de ${testimonial.authorName}`}
								fill
								className="object-cover"
								sizes="48px"
							/>
						</div>
					)}
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
