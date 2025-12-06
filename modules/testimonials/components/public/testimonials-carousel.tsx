"use client"

import { useEffect, useState, useCallback } from "react"
import Autoplay from "embla-carousel-autoplay"
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselPrevious,
	CarouselNext,
	type CarouselApi,
} from "@/shared/components/ui/carousel"
import { cn } from "@/shared/utils/cn"
import { TestimonialCard } from "./testimonial-card"
import type { TestimonialDisplay } from "../../types/testimonial.types"

interface TestimonialsCarouselProps {
	testimonials: TestimonialDisplay[]
	className?: string
	/** Durée entre chaque slide en ms (défaut: 5000) */
	autoplayDelay?: number
	/** Désactiver l'autoplay */
	disableAutoplay?: boolean
}

export function TestimonialsCarousel({
	testimonials,
	className,
	autoplayDelay = 5000,
	disableAutoplay = false,
}: TestimonialsCarouselProps) {
	const [api, setApi] = useState<CarouselApi>()
	const [current, setCurrent] = useState(0)

	const onSelect = useCallback(() => {
		if (!api) return
		setCurrent(api.selectedScrollSnap())
	}, [api])

	useEffect(() => {
		if (!api) return
		onSelect()
		api.on("select", onSelect)
		return () => {
			api.off("select", onSelect)
		}
	}, [api, onSelect])

	if (testimonials.length === 0) {
		return null
	}

	const plugins = disableAutoplay
		? []
		: [
				Autoplay({
					delay: autoplayDelay,
					stopOnInteraction: true,
					stopOnMouseEnter: true,
				}),
		  ]

	return (
		<div className={cn("w-full", className)}>
			<Carousel
				setApi={setApi}
				opts={{
					align: "start",
					loop: testimonials.length > 3,
				}}
				plugins={plugins}
				className="w-full"
			>
				<CarouselContent className="-ml-4">
					{testimonials.map((testimonial) => (
						<CarouselItem
							key={testimonial.id}
							className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
						>
							<TestimonialCard testimonial={testimonial} />
						</CarouselItem>
					))}
				</CarouselContent>

				{testimonials.length > 3 && (
					<>
						<CarouselPrevious className="hidden lg:flex -left-4 lg:-left-12" />
						<CarouselNext className="hidden lg:flex -right-4 lg:-right-12" />
					</>
				)}
			</Carousel>

			{/* Dots pour mobile */}
			{testimonials.length > 1 && (
				<div className="flex justify-center gap-2 mt-6 lg:hidden">
					{testimonials.map((_, index) => (
						<button
							key={index}
							type="button"
							onClick={() => api?.scrollTo(index)}
							className={cn(
								"h-2 rounded-full transition-all duration-300",
								index === current
									? "w-8 bg-primary"
									: "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
							)}
							aria-label={`Aller au témoignage ${index + 1}`}
						/>
					))}
				</div>
			)}
		</div>
	)
}
