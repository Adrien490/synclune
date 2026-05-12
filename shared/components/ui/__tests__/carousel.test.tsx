import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const triggerHaptic = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: (...args: unknown[]) => triggerHaptic(...args),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat(Infinity)
			.filter((value) => typeof value === "string" && value.length > 0)
			.join(" "),
}));

vi.mock("lucide-react", () => ({
	ChevronLeft: () => <svg data-testid="icon-chevron-left" />,
	ChevronRight: () => <svg data-testid="icon-chevron-right" />,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		...rest
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<button type="button" onClick={onClick} {...rest}>
			{children}
		</button>
	),
}));

// Embla mock: minimal API surface used by Carousel
type EmblaListener = () => void;

interface FakeEmblaApi {
	scrollPrev: ReturnType<typeof vi.fn>;
	scrollNext: ReturnType<typeof vi.fn>;
	scrollTo: ReturnType<typeof vi.fn>;
	canScrollPrev: () => boolean;
	canScrollNext: () => boolean;
	selectedScrollSnap: () => number;
	scrollSnapList: () => number[];
	slidesInView: () => number[];
	on: (event: string, fn: EmblaListener) => void;
	off: (event: string, fn: EmblaListener) => void;
}

const fakeApi: FakeEmblaApi = {
	scrollPrev: vi.fn(),
	scrollNext: vi.fn(),
	scrollTo: vi.fn(),
	canScrollPrev: () => true,
	canScrollNext: () => true,
	selectedScrollSnap: () => 0,
	scrollSnapList: () => [0, 0.5, 1],
	slidesInView: () => [0],
	on: vi.fn(),
	off: vi.fn(),
};

vi.mock("embla-carousel-react", () => ({
	default: () => [vi.fn(), fakeApi] as const,
}));

afterEach(() => {
	cleanup();
});

beforeEach(() => {
	triggerHaptic.mockClear();
	fakeApi.scrollTo.mockClear();
	fakeApi.scrollPrev.mockClear();
	fakeApi.scrollNext.mockClear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CarouselDots", () => {
	it("triggers selection haptic and scrollTo when clicking a dot", async () => {
		const { Carousel, CarouselContent, CarouselItem, CarouselDots } = await import("../carousel");

		render(
			<Carousel>
				<CarouselContent>
					<CarouselItem index={0}>Slide 1</CarouselItem>
					<CarouselItem index={1}>Slide 2</CarouselItem>
					<CarouselItem index={2}>Slide 3</CarouselItem>
				</CarouselContent>
				<CarouselDots />
			</Carousel>,
		);

		const dots = screen.getAllByRole("button", { name: /Aller à la diapositive/i });
		expect(dots).toHaveLength(3);

		fireEvent.click(dots[1]!);

		expect(triggerHaptic).toHaveBeenCalledWith("selection");
		expect(fakeApi.scrollTo).toHaveBeenCalledWith(1);
		// Haptic fired before scrollTo (call order)
		const hapticOrder = triggerHaptic.mock.invocationCallOrder[0]!;
		const scrollToOrder = fakeApi.scrollTo.mock.invocationCallOrder[0]!;
		expect(hapticOrder).toBeLessThan(scrollToOrder);
	});
});
