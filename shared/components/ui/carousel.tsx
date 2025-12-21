"use client";

import useEmblaCarousel, {
	type UseEmblaCarouselType,
} from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
	opts?: CarouselOptions;
	plugins?: CarouselPlugin;
	orientation?: "horizontal" | "vertical";
	setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
	carouselRef: ReturnType<typeof useEmblaCarousel>[0];
	api: ReturnType<typeof useEmblaCarousel>[1];
	scrollPrev: () => void;
	scrollNext: () => void;
	canScrollPrev: boolean;
	canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
	const context = React.useContext(CarouselContext);

	if (!context) {
		throw new Error("useCarousel must be used within a <Carousel />");
	}

	return context;
}

function Carousel({
	orientation = "horizontal",
	opts,
	setApi,
	plugins,
	className,
	children,
	...props
}: React.ComponentProps<"div"> & CarouselProps) {
	const [carouselRef, api] = useEmblaCarousel(
		{
			...opts,
			axis: orientation === "horizontal" ? "x" : "y",
		},
		plugins
	);
	const [canScrollPrev, setCanScrollPrev] = React.useState(false);
	const [canScrollNext, setCanScrollNext] = React.useState(false);

	const onSelect = (api: CarouselApi) => {
		if (!api) return;
		setCanScrollPrev(api.canScrollPrev());
		setCanScrollNext(api.canScrollNext());
	};

	const scrollPrev = () => {
		api?.scrollPrev();
	};

	const scrollNext = () => {
		api?.scrollNext();
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			scrollPrev();
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			scrollNext();
		}
	};

	React.useEffect(() => {
		if (!api || !setApi) return;
		setApi(api);
	}, [api, setApi]);

	React.useEffect(() => {
		if (!api) return;
		onSelect(api);
		api.on("reInit", onSelect);
		api.on("select", onSelect);

		return () => {
			api?.off("select", onSelect);
		};
	}, [api, onSelect]);

	return (
		<CarouselContext.Provider
			value={{
				carouselRef,
				api: api,
				opts,
				orientation:
					orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
				scrollPrev,
				scrollNext,
				canScrollPrev,
				canScrollNext,
			}}
		>
			<div
				onKeyDownCapture={handleKeyDown}
				className={cn("relative", className)}
				role="region"
				aria-roledescription="carousel"
				data-slot="carousel"
				{...props}
			>
				{children}
			</div>
		</CarouselContext.Provider>
	);
}

interface CarouselContentProps extends React.ComponentProps<"div"> {
	showFade?: boolean;
}

function CarouselContent({ className, showFade = false, ...props }: CarouselContentProps) {
	const { carouselRef, orientation, canScrollPrev, canScrollNext } = useCarousel();

	return (
		<div className="relative">
			<div
				ref={carouselRef}
				className="overflow-hidden"
				data-slot="carousel-content"
			>
				<div
					className={cn(
						"flex",
						orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
						className
					)}
					{...props}
				/>
			</div>

			{/* Fade edges */}
			{showFade && orientation === "horizontal" && canScrollPrev && (
				<div
					aria-hidden
					className="pointer-events-none absolute left-0 top-0 h-full w-10 z-10"
					style={{
						background: "linear-gradient(to right, var(--background) 0%, transparent 100%)"
					}}
				/>
			)}
			{showFade && orientation === "horizontal" && canScrollNext && (
				<div
					aria-hidden
					className="pointer-events-none absolute right-0 top-0 h-full w-10 z-10"
					style={{
						background: "linear-gradient(to left, var(--background) 0%, transparent 100%)"
					}}
				/>
			)}
			{showFade && orientation === "vertical" && canScrollPrev && (
				<div
					aria-hidden
					className="pointer-events-none absolute top-0 left-0 w-full h-10 z-10"
					style={{
						background: "linear-gradient(to bottom, var(--background) 0%, transparent 100%)"
					}}
				/>
			)}
			{showFade && orientation === "vertical" && canScrollNext && (
				<div
					aria-hidden
					className="pointer-events-none absolute bottom-0 left-0 w-full h-10 z-10"
					style={{
						background: "linear-gradient(to top, var(--background) 0%, transparent 100%)"
					}}
				/>
			)}
		</div>
	);
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
	const { orientation } = useCarousel();

	return (
		<div
			role="group"
			aria-roledescription="slide"
			data-slot="carousel-item"
			className={cn(
				"min-w-0 shrink-0 grow-0 basis-full",
				orientation === "horizontal" ? "pl-4" : "pt-4",
				className
			)}
			{...props}
		/>
	);
}

function CarouselPrevious({
	className,
	variant = "ghost",
	size = "icon",
	...props
}: React.ComponentProps<typeof Button>) {
	const { orientation, scrollPrev, canScrollPrev } = useCarousel();

	return (
		<Button
			data-slot="carousel-previous"
			variant={variant}
			size={size}
			className={cn(
				// Positionnement
				"absolute z-20",
				orientation === "horizontal"
					? "top-1/2 -left-12 -translate-y-1/2"
					: "-top-12 left-1/2 -translate-x-1/2 rotate-90",
				// Touch targets responsives (WCAG 2.5.5)
				"size-12 md:size-10",
				// Forme et fond primary
				"rounded-full bg-primary",
				// Ombres
				"shadow-lg hover:shadow-xl",
				// Couleurs
				"text-primary-foreground",
				"hover:bg-primary/90 hover:scale-105",
				// États disabled
				"disabled:opacity-40 disabled:pointer-events-none",
				// Transitions fluides
				"transition-all duration-300",
				className
			)}
			disabled={!canScrollPrev}
			onClick={scrollPrev}
			{...props}
		>
			<ChevronLeft className="size-5" />
			<span className="sr-only">Diapositive précédente</span>
		</Button>
	);
}

function CarouselNext({
	className,
	variant = "ghost",
	size = "icon",
	...props
}: React.ComponentProps<typeof Button>) {
	const { orientation, scrollNext, canScrollNext } = useCarousel();

	return (
		<Button
			data-slot="carousel-next"
			variant={variant}
			size={size}
			className={cn(
				// Positionnement
				"absolute z-20",
				orientation === "horizontal"
					? "top-1/2 -right-12 -translate-y-1/2"
					: "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
				// Touch targets responsives (WCAG 2.5.5)
				"size-12 md:size-10",
				// Forme et fond primary
				"rounded-full bg-primary",
				// Ombres
				"shadow-lg hover:shadow-xl",
				// Couleurs
				"text-primary-foreground",
				"hover:bg-primary/90 hover:scale-105",
				// États disabled
				"disabled:opacity-40 disabled:pointer-events-none",
				// Transitions fluides
				"transition-all duration-300",
				className
			)}
			disabled={!canScrollNext}
			onClick={scrollNext}
			{...props}
		>
			<ChevronRight className="size-5" />
			<span className="sr-only">Diapositive suivante</span>
		</Button>
	);
}

function CarouselDots({
	className,
	...props
}: React.ComponentProps<"div">) {
	const { api } = useCarousel();
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);

	React.useEffect(() => {
		if (!api) return;

		setScrollSnaps(api.scrollSnapList());

		const onSelect = () => {
			setSelectedIndex(api.selectedScrollSnap());
		};

		api.on("select", onSelect);
		api.on("reInit", () => {
			setScrollSnaps(api.scrollSnapList());
			onSelect();
		});

		return () => {
			api.off("select", onSelect);
		};
	}, [api]);

	if (scrollSnaps.length <= 1) return null;

	return (
		<div
			data-slot="carousel-dots"
			className={cn("flex flex-col items-center gap-1 pt-4", className)}
			role="tablist"
			aria-label="Navigation du carousel"
			{...props}
		>
			<div className="flex justify-center">
				{scrollSnaps.map((_, index) => (
					<button
						key={index}
						type="button"
						role="tab"
						aria-selected={index === selectedIndex}
						aria-label={`Aller à la diapositive ${index + 1}`}
						onClick={() => api?.scrollTo(index)}
						className={cn(
							"relative w-11 h-11 flex items-center justify-center",
							"active:scale-95 transition-transform duration-100",
							"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-full"
						)}
					>
						<span
							className={cn(
								"rounded-full transition-all duration-150 ease-out",
								index === selectedIndex
									? "h-2 w-8 sm:h-2.5 sm:w-10 bg-primary shadow-md"
									: "h-2 w-2 sm:h-2.5 sm:w-2.5 bg-muted-foreground/50 hover:bg-muted-foreground/70"
							)}
						/>
					</button>
				))}
			</div>
			<span className="text-xs text-muted-foreground/70">
				{selectedIndex + 1} sur {scrollSnaps.length}
			</span>
		</div>
	);
}

export {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
	CarouselDots,
	type CarouselApi,
	useCarousel,
};
