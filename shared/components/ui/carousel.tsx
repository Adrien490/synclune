"use client";

import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import * as React from "react";
import { useEffectEvent } from "react";

import { Button } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
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
	const context = React.use(CarouselContext);

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
		plugins,
	);
	const [canScrollPrev, setCanScrollPrev] = React.useState(false);
	const [canScrollNext, setCanScrollNext] = React.useState(false);
	const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);
	const [selectedIndex, setSelectedIndex] = React.useState(0);

	const scrollPrev = () => {
		triggerHaptic("selection");
		api?.scrollPrev();
	};

	const scrollNext = () => {
		triggerHaptic("selection");
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

	// Embla émet `select` pour TOUT changement de slide : geste, clic sur flèche,
	// clic sur pastille, navigation clavier, plugin `Autoplay`, et `reInit`
	// (redimensionnement / rotation d'écran). Vibrer sur cet événement, c'est vibrer
	// sur des changements que l'utilisateur n'a pas provoqués au doigt — et doubler
	// l'haptique déjà émise par `scrollPrev`/`scrollNext`/`CarouselDots`.
	// On ne vibre donc QUE sur un select consécutif à un drag (même modèle que
	// `modules/media/components/gallery/gallery.tsx`).
	const isDraggingRef = React.useRef(false);

	// Effect Event pour gérer onSelect sans re-registration
	const onSelect = useEffectEvent((carouselApi: CarouselApi) => {
		if (!carouselApi) return;
		setCanScrollPrev(carouselApi.canScrollPrev());
		setCanScrollNext(carouselApi.canScrollNext());
		setSelectedIndex(carouselApi.selectedScrollSnap());
		if (isDraggingRef.current) {
			triggerHaptic("selection");
			isDraggingRef.current = false;
		}
	});

	const onPointerDown = useEffectEvent(() => {
		isDraggingRef.current = true;
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
		// eslint-disable-next-line react-hooks/set-state-in-effect
		onSelect(api);
		setScrollSnaps(api.scrollSnapList());

		// Handlers nommés obligatoires : Embla démonte par égalité de référence,
		// une arrow inline au `off` ne retirait rien (listeners fuités à chaque
		// changement d'`api`).
		const handleSelect = () => onSelect(api);
		const handleReInit = () => onReInit(api);
		const handlePointerDown = () => onPointerDown();
		api.on("reInit", handleReInit);
		api.on("select", handleSelect);
		api.on("pointerDown", handlePointerDown);

		return () => {
			api.off("select", handleSelect);
			api.off("reInit", handleReInit);
			api.off("pointerDown", handlePointerDown);
		};
	}, [api]);

	return (
		<CarouselContext.Provider
			value={{
				carouselRef,
				api: api,
				opts,
				orientation: orientation,
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
				// Les slides atteignent le bord gauche de l'écran sur mobile, où vit le
				// geste d'ouverture du menu (`useEdgeSwipe`). Sans opt-out, un drag vers
				// la droite faisait défiler le carousel ET ouvrait le menu.
				data-no-edge-swipe
			>
				<div
					className={cn(
						"flex",
						orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
						className,
					)}
					{...props}
				/>
			</div>

			{/* Fade edges - responsive: 24px mobile, 40px desktop */}
			{showFade && orientation === "horizontal" && canScrollPrev && (
				<div
					aria-hidden
					className="pointer-events-none absolute top-0 left-0 z-10 h-full w-6 sm:w-10"
					style={{
						background: "linear-gradient(to right, var(--background) 0%, transparent 100%)",
					}}
				/>
			)}
			{showFade && orientation === "horizontal" && canScrollNext && (
				<div
					aria-hidden
					className="pointer-events-none absolute top-0 right-0 z-10 h-full w-6 sm:w-10"
					style={{
						background: "linear-gradient(to left, var(--background) 0%, transparent 100%)",
					}}
				/>
			)}
			{showFade && orientation === "vertical" && canScrollPrev && (
				<div
					aria-hidden
					className="pointer-events-none absolute top-0 left-0 z-10 h-6 w-full sm:h-10"
					style={{
						background: "linear-gradient(to bottom, var(--background) 0%, transparent 100%)",
					}}
				/>
			)}
			{showFade && orientation === "vertical" && canScrollNext && (
				<div
					aria-hidden
					className="pointer-events-none absolute bottom-0 left-0 z-10 h-6 w-full sm:h-10"
					style={{
						background: "linear-gradient(to top, var(--background) 0%, transparent 100%)",
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

		// eslint-disable-next-line react-hooks/set-state-in-effect
		updateVisibility();
		api.on("select", updateVisibility);
		api.on("reInit", updateVisibility);

		return () => {
			api.off("select", updateVisibility);
			api.off("reInit", updateVisibility);
		};
	}, [api, index]);

	return (
		<div
			role="group"
			aria-roledescription="slide"
			aria-label={
				index !== undefined && scrollSnaps.length > 0
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
				className,
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
				"bg-primary rounded-full",
				// Shadows
				"shadow-lg hover:shadow-xl",
				// Colors
				"text-primary-foreground",
				"hover:bg-primary/90 motion-safe:hover:scale-105",
				// Focus visible (keyboard accessibility)
				"focus-ring",
				// Disabled states (opacity-60 pour contraste WCAG AA)
				"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
				// Smooth transitions
				"motion-safe:transition-[transform,box-shadow,background-color] motion-safe:duration-[var(--duration-slow)]",
				className,
			)}
			disabled={!canScrollPrev}
			onClick={scrollPrev}
			{...props}
		>
			<CaretLeftIcon className="size-5" />
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
				"bg-primary rounded-full",
				// Shadows
				"shadow-lg hover:shadow-xl",
				// Colors
				"text-primary-foreground",
				"hover:bg-primary/90 motion-safe:hover:scale-105",
				// Focus visible (keyboard accessibility)
				"focus-ring",
				// Disabled states (opacity-60 pour contraste WCAG AA)
				"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
				// Smooth transitions
				"motion-safe:transition-[transform,box-shadow,background-color] motion-safe:duration-[var(--duration-slow)]",
				className,
			)}
			disabled={!canScrollNext}
			onClick={scrollNext}
			{...props}
		>
			<CaretRightIcon className="size-5" />
			<span className="sr-only">Diapositive suivante</span>
		</Button>
	);
}

function CarouselDots({ className, ...props }: React.ComponentProps<"div">) {
	const { api, scrollSnaps } = useCarousel();
	const [selectedIndex, setSelectedIndex] = React.useState(0);

	// Effect Event pour gérer onSelect sans re-registration
	const onSelectDot = useEffectEvent(() => {
		if (api) {
			setSelectedIndex(api.selectedScrollSnap());
		}
	});

	React.useEffect(() => {
		if (!api) return;

		// eslint-disable-next-line react-hooks/set-state-in-effect
		onSelectDot();
		api.on("select", onSelectDot);
		api.on("reInit", onSelectDot);

		return () => {
			api.off("select", onSelectDot);
			api.off("reInit", onSelectDot);
		};
	}, [api]);

	if (scrollSnaps.length <= 1) return null;

	const total = scrollSnaps.length;
	const DOT_SIZE = 44; // w-11 = 44px touch target
	const MAX_VISIBLE = 5;
	const needsOverflow = total > MAX_VISIBLE;

	// Center the active dot in the visible window
	let translateX = 0;
	if (needsOverflow) {
		const centerOffset = Math.floor(MAX_VISIBLE / 2);
		translateX =
			Math.min(Math.max(selectedIndex - centerOffset, 0), total - MAX_VISIBLE) * DOT_SIZE;
	}

	return (
		<div
			data-slot="carousel-dots"
			className={cn("flex items-center justify-center pt-4", className)}
			{...props}
		>
			<div
				className={cn(needsOverflow && "overflow-hidden")}
				style={needsOverflow ? { width: MAX_VISIBLE * DOT_SIZE } : undefined}
			>
				<div
					className={cn(
						"flex justify-center",
						"ease-out motion-safe:transition-transform motion-safe:duration-200",
					)}
					role="group"
					aria-label="Navigation du carousel"
					style={needsOverflow ? { transform: `translateX(-${translateX}px)` } : undefined}
				>
					{scrollSnaps.map((_, index) => {
						const distance = Math.abs(index - selectedIndex);

						return (
							<button
								key={`dot-${index}`}
								type="button"
								aria-pressed={index === selectedIndex}
								aria-label={`Aller à la diapositive ${index + 1}`}
								onClick={() => {
									triggerHaptic("selection");
									api?.scrollTo(index);
								}}
								className={cn(
									// Touch target 44px (WCAG 2.5.5)
									"relative flex size-11 shrink-0 items-center justify-center",
									// Shape for visual feedback
									"rounded-full",
									// Visual feedback on clickable area
									"hover:bg-muted/20 active:bg-muted/30",
									// Animation with reduced motion respect
									"motion-safe:transition-all motion-safe:duration-100 motion-safe:active:scale-95",
									// Focus visible
									"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
								)}
							>
								<span
									className={cn(
										"size-2.5 rounded-full sm:size-3",
										"ease-out motion-safe:transition-[transform,opacity,background-color] motion-safe:duration-200",
										index === selectedIndex
											? "bg-primary ring-primary/30 scale-100 ring-2"
											: distance === 1
												? "bg-muted-foreground/60 scale-[0.85]"
												: "bg-muted-foreground/40 scale-[0.6]",
									)}
								/>
							</button>
						);
					})}
				</div>
			</div>
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
};
