"use client";

import useEmblaCarousel, {
	type UseEmblaCarouselType,
} from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { useEffectEvent } from "react";

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
	carouselId: string;
	scrollSnaps: number[];
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
	id,
	...props
}: React.ComponentProps<"div"> & CarouselProps) {
	const generatedId = React.useId();
	const carouselId = id ?? generatedId;

	const [carouselRef, api] = useEmblaCarousel(
		{
			...opts,
			axis: orientation === "horizontal" ? "x" : "y",
		},
		plugins
	);
	const [canScrollPrev, setCanScrollPrev] = React.useState(false);
	const [canScrollNext, setCanScrollNext] = React.useState(false);
	const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);
	const [selectedIndex, setSelectedIndex] = React.useState(0);

	const scrollPrev = () => {
		api?.scrollPrev();
	};

	const scrollNext = () => {
		api?.scrollNext();
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		switch (event.key) {
			case "ArrowLeft":
				event.preventDefault();
				scrollPrev();
				break;
			case "ArrowRight":
				event.preventDefault();
				scrollNext();
				break;
			case "Home":
				event.preventDefault();
				api?.scrollTo(0);
				break;
			case "End":
				event.preventDefault();
				if (scrollSnaps.length > 0) {
					api?.scrollTo(scrollSnaps.length - 1);
				}
				break;
		}
	};

	// Effect Event pour gérer onSelect sans re-registration
	const onSelect = useEffectEvent((carouselApi: CarouselApi) => {
		if (!carouselApi) return;
		setCanScrollPrev(carouselApi.canScrollPrev());
		setCanScrollNext(carouselApi.canScrollNext());
		setSelectedIndex(carouselApi.selectedScrollSnap());
	});

	// Effect Event pour gérer reInit sans re-registration
	const onReInit = useEffectEvent((carouselApi: CarouselApi) => {
		if (!carouselApi) return;
		onSelect(carouselApi);
		setScrollSnaps(carouselApi.scrollSnapList());
	});

	React.useEffect(() => {
		if (!api || !setApi) return;
		setApi(api);
	}, [api, setApi]);

	React.useEffect(() => {
		if (!api) return;
		onSelect(api);
		setScrollSnaps(api.scrollSnapList());
		api.on("reInit", () => onReInit(api));
		api.on("select", () => onSelect(api));

		return () => {
			api?.off("select", () => onSelect(api));
			api?.off("reInit", () => onReInit(api));
		};
	}, [api, onSelect, onReInit]);

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
				carouselId,
				scrollSnaps,
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
				{/* Always-visible live region for slide change announcements (works even when CarouselDots is hidden) */}
				{scrollSnaps.length > 1 && (
					<div aria-live="polite" aria-atomic="true" className="sr-only">
						Diapositive {selectedIndex + 1} sur {scrollSnaps.length}
					</div>
				)}
				{children}
			</div>
		</CarouselContext.Provider>
	);
}

interface CarouselContentProps extends React.ComponentProps<"div"> {
	showFade?: boolean;
}

function CarouselContent({ className, showFade = false, ...props }: CarouselContentProps) {
	const { carouselRef, orientation, canScrollPrev, canScrollNext, carouselId } = useCarousel();

	return (
		<div className="relative">
			<div
				ref={carouselRef}
				id={`${carouselId}-content`}
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

			{/* Fade edges - responsive: 24px mobile, 40px desktop */}
			{showFade && orientation === "horizontal" && canScrollPrev && (
				<div
					aria-hidden
					className="pointer-events-none absolute left-0 top-0 h-full w-6 sm:w-10 z-10"
					style={{
						background: "linear-gradient(to right, var(--background) 0%, transparent 100%)"
					}}
				/>
			)}
			{showFade && orientation === "horizontal" && canScrollNext && (
				<div
					aria-hidden
					className="pointer-events-none absolute right-0 top-0 h-full w-6 sm:w-10 z-10"
					style={{
						background: "linear-gradient(to left, var(--background) 0%, transparent 100%)"
					}}
				/>
			)}
			{showFade && orientation === "vertical" && canScrollPrev && (
				<div
					aria-hidden
					className="pointer-events-none absolute top-0 left-0 w-full h-6 sm:h-10 z-10"
					style={{
						background: "linear-gradient(to bottom, var(--background) 0%, transparent 100%)"
					}}
				/>
			)}
			{showFade && orientation === "vertical" && canScrollNext && (
				<div
					aria-hidden
					className="pointer-events-none absolute bottom-0 left-0 w-full h-6 sm:h-10 z-10"
					style={{
						background: "linear-gradient(to top, var(--background) 0%, transparent 100%)"
					}}
				/>
			)}
		</div>
	);
}

interface CarouselItemProps extends React.ComponentProps<"div"> {
	/** Slide index for accessibility (hides non-visible slides from screen readers) */
	index?: number;
}

function CarouselItem({ className, index, ...props }: CarouselItemProps) {
	const { orientation, api, scrollSnaps } = useCarousel();
	const [isVisible, setIsVisible] = React.useState(true);

	// Effect Event pour gérer la visibilité sans re-registration
	const updateVisibility = useEffectEvent(() => {
		if (api && index !== undefined) {
			setIsVisible(api.slidesInView().includes(index));
		}
	});

	// Only subscribe to visibility changes if index is provided
	React.useEffect(() => {
		if (index === undefined || !api) return;

		updateVisibility();
		api.on("select", updateVisibility);
		api.on("reInit", updateVisibility);

		return () => {
			api.off("select", updateVisibility);
			api.off("reInit", updateVisibility);
		};
	}, [api, index, updateVisibility]);

	return (
		<div
			role="group"
			aria-roledescription="slide"
			aria-label={index !== undefined && scrollSnaps.length > 0
				? `Diapositive ${index + 1} sur ${scrollSnaps.length}`
				: undefined
			}
			aria-current={index !== undefined && isVisible ? true : undefined}
			// inert replaces aria-hidden: hides from AT and prevents focus on descendants
			{...(index !== undefined && !isVisible ? { inert: true } : {})}
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
	const { orientation, scrollPrev, canScrollPrev, scrollSnaps } = useCarousel();

	// Hide if only 1 element (consistent with CarouselDots)
	if (scrollSnaps.length <= 1) return null;

	return (
		<Button
			data-slot="carousel-previous"
			variant={variant}
			size={size}
			className={cn(
				// Positioning
				"absolute z-20",
				orientation === "horizontal"
					? "top-1/2 -left-12 -translate-y-1/2"
					: "-top-12 left-1/2 -translate-x-1/2 rotate-90",
				// Touch targets 48px (WCAG 2.5.5)
				"size-12",
				// Shape and primary background
				"rounded-full bg-primary",
				// Shadows
				"shadow-lg hover:shadow-xl",
				// Colors
				"text-primary-foreground",
				"hover:bg-primary/90 hover:scale-105",
				// Focus visible (keyboard accessibility)
				"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				// Disabled states (opacity-60 pour contraste WCAG AA)
				"disabled:opacity-60 disabled:pointer-events-none disabled:cursor-not-allowed",
				// Smooth transitions
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
	const { orientation, scrollNext, canScrollNext, scrollSnaps } = useCarousel();

	// Hide if only 1 element (consistent with CarouselDots)
	if (scrollSnaps.length <= 1) return null;

	return (
		<Button
			data-slot="carousel-next"
			variant={variant}
			size={size}
			className={cn(
				// Positioning
				"absolute z-20",
				orientation === "horizontal"
					? "top-1/2 -right-12 -translate-y-1/2"
					: "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
				// Touch targets 48px (WCAG 2.5.5)
				"size-12",
				// Shape and primary background
				"rounded-full bg-primary",
				// Shadows
				"shadow-lg hover:shadow-xl",
				// Colors
				"text-primary-foreground",
				"hover:bg-primary/90 hover:scale-105",
				// Focus visible (keyboard accessibility)
				"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				// Disabled states (opacity-60 pour contraste WCAG AA)
				"disabled:opacity-60 disabled:pointer-events-none disabled:cursor-not-allowed",
				// Smooth transitions
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
	const { api, carouselId, scrollSnaps } = useCarousel();
	const [selectedIndex, setSelectedIndex] = React.useState(0);

	// Effect Event pour gérer onSelect sans re-registration
	const onSelectDot = useEffectEvent(() => {
		if (api) {
			setSelectedIndex(api.selectedScrollSnap());
		}
	});

	React.useEffect(() => {
		if (!api) return;

		onSelectDot();
		api.on("select", onSelectDot);
		api.on("reInit", onSelectDot);

		return () => {
			api.off("select", onSelectDot);
			api.off("reInit", onSelectDot);
		};
	}, [api, onSelectDot]);

	if (scrollSnaps.length <= 1) return null;

	return (
		<div
			data-slot="carousel-dots"
			className={cn("flex flex-col items-center gap-1 pt-4", className)}
			{...props}
		>
			{/* Screen reader live announcement - must be outside tablist */}
			<div aria-live="polite" aria-atomic="true" className="sr-only">
				Diapositive {selectedIndex + 1} sur {scrollSnaps.length}
			</div>
			<div
				className="flex justify-center"
				role="tablist"
				aria-label="Navigation du carousel"
			>
				{scrollSnaps.map((_, index) => (
					<button
						key={index}
						type="button"
						role="tab"
						aria-selected={index === selectedIndex}
						aria-controls={`${carouselId}-content`}
						aria-label={`Aller à la diapositive ${index + 1}`}
						onClick={() => api?.scrollTo(index)}
						className={cn(
							// Touch target 44px (WCAG 2.5.5)
							"relative w-11 h-11 flex items-center justify-center",
							// Shape for visual feedback
							"rounded-full",
							// Visual feedback on clickable area
							"hover:bg-muted/20 active:bg-muted/30",
							// Animation with reduced motion respect
							"motion-safe:active:scale-95 motion-safe:transition-all motion-safe:duration-100",
							// Focus visible
							"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
						)}
					>
						<span
							className={cn(
								"rounded-full",
								// Animation with reduced motion respect (WCAG 2.3.3)
								"motion-safe:transition-all motion-safe:duration-150 ease-out",
								index === selectedIndex
									? "h-2.5 w-8 sm:h-3 sm:w-10 bg-primary shadow-md"
									: "h-2.5 w-2.5 sm:h-3 sm:w-3 bg-muted-foreground/70 hover:bg-muted-foreground/90"
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
