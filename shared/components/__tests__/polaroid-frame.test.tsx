import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("@/shared/styles/fonts", () => ({
	caveat: { className: "font-cursive" },
}));

// Import AFTER mocks
import { PolaroidFrame } from "../polaroid-frame";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("PolaroidFrame", () => {
	// --------------------------------------------------------------------------
	// Structure
	// --------------------------------------------------------------------------

	describe("structure", () => {
		it("renders a figure element with children", () => {
			const { container } = render(
				<PolaroidFrame>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src="/photo.jpg" alt="test" />
				</PolaroidFrame>,
			);

			const figure = container.querySelector("figure");
			expect(figure).toBeInTheDocument();
			expect(figure?.querySelector("img")).toBeInTheDocument();
		});

		it("includes default structural classes on the figure", () => {
			const { container } = render(<PolaroidFrame>content</PolaroidFrame>);

			const figure = container.querySelector("figure");
			expect(figure?.className).toContain("polaroid-paper");
			expect(figure?.className).toContain("polaroid-hover");
			expect(figure?.className).toContain("group/polaroid");
		});
	});

	// --------------------------------------------------------------------------
	// Interactive / tabIndex
	// --------------------------------------------------------------------------

	describe("interactive", () => {
		it("does not set tabIndex by default (decorative usage)", () => {
			const { container } = render(<PolaroidFrame>content</PolaroidFrame>);

			expect(container.querySelector("figure")).not.toHaveAttribute("tabindex");
		});

		it("sets tabIndex={0} when interactive=true", () => {
			const { container } = render(<PolaroidFrame interactive>content</PolaroidFrame>);

			expect(container.querySelector("figure")).toHaveAttribute("tabindex", "0");
		});

		it("forwards aria-label to the figure element", () => {
			const { container } = render(
				<PolaroidFrame interactive aria-label="Photo de l'atelier">
					content
				</PolaroidFrame>,
			);

			expect(container.querySelector("figure")).toHaveAttribute("aria-label", "Photo de l'atelier");
		});
	});

	// --------------------------------------------------------------------------
	// Tilt — pilote via --polaroid-rotate CSS variable
	// --------------------------------------------------------------------------

	describe("tilt", () => {
		it("sets --polaroid-rotate to -2deg for tilt=left", () => {
			const { container } = render(<PolaroidFrame tilt="left">content</PolaroidFrame>);

			const figure = container.querySelector("figure") as HTMLElement;
			expect(figure.style.getPropertyValue("--polaroid-rotate")).toBe("-2deg");
		});

		it("sets --polaroid-rotate to 2deg for tilt=right", () => {
			const { container } = render(<PolaroidFrame tilt="right">content</PolaroidFrame>);

			const figure = container.querySelector("figure") as HTMLElement;
			expect(figure.style.getPropertyValue("--polaroid-rotate")).toBe("2deg");
		});

		it("sets --polaroid-rotate to 0deg for default tilt=none", () => {
			const { container } = render(<PolaroidFrame>content</PolaroidFrame>);

			const figure = container.querySelector("figure") as HTMLElement;
			expect(figure.style.getPropertyValue("--polaroid-rotate")).toBe("0deg");
		});

		it("sets --polaroid-rotate from tiltDegree when provided", () => {
			const { container } = render(<PolaroidFrame tiltDegree={-5}>content</PolaroidFrame>);

			const figure = container.querySelector("figure") as HTMLElement;
			expect(figure.style.getPropertyValue("--polaroid-rotate")).toBe("-5deg");
		});

		it("tiltDegree overrides tilt prop", () => {
			const { container } = render(
				<PolaroidFrame tilt="left" tiltDegree={7}>
					content
				</PolaroidFrame>,
			);

			const figure = container.querySelector("figure") as HTMLElement;
			expect(figure.style.getPropertyValue("--polaroid-rotate")).toBe("7deg");
		});

		it("does not apply inline transform on the figure (hover composition safe)", () => {
			const { container } = render(<PolaroidFrame tiltDegree={3}>content</PolaroidFrame>);

			const figure = container.querySelector("figure") as HTMLElement;
			// Rotation must come from --polaroid-rotate (CSS .polaroid-hover applies it),
			// NOT from inline transform — otherwise the hover lift translateY+scale is broken.
			expect(figure.style.transform).toBe("");
		});
	});

	// --------------------------------------------------------------------------
	// Caption
	// --------------------------------------------------------------------------

	describe("caption", () => {
		it("does not render figcaption when caption is not provided", () => {
			const { container } = render(<PolaroidFrame>content</PolaroidFrame>);

			expect(container.querySelector("figcaption")).toBeNull();
		});

		it("renders figcaption with the caption text", () => {
			render(<PolaroidFrame caption="Mon atelier">content</PolaroidFrame>);

			const figcaption = screen.getByText("Mon atelier");
			expect(figcaption.tagName).toBe("FIGCAPTION");
		});

		it("applies caveat font class to the figcaption", () => {
			render(<PolaroidFrame caption="Belle photo">content</PolaroidFrame>);

			expect(screen.getByText("Belle photo")).toHaveClass("font-cursive");
		});

		it("does not apply synthetic italic on cursive font", () => {
			render(<PolaroidFrame caption="Sans italic">content</PolaroidFrame>);

			expect(screen.getByText("Sans italic").className).not.toContain("italic");
		});

		it("applies custom captionColor as inline style", () => {
			render(
				<PolaroidFrame caption="Texte coloré" captionColor="#ff6b9d">
					content
				</PolaroidFrame>,
			);

			const figcaption = screen.getByText("Texte coloré");
			expect(figcaption.style.color).toBe("rgb(255, 107, 157)");
		});

		it("applies captionRotate as inline transform", () => {
			render(
				<PolaroidFrame caption="Légèrement incliné" captionRotate={-3}>
					content
				</PolaroidFrame>,
			);

			const figcaption = screen.getByText("Légèrement incliné");
			expect(figcaption.style.transform).toBe("rotate(-3deg)");
		});

		it("does not add transform style when captionRotate is not provided", () => {
			render(<PolaroidFrame caption="Sans rotation">content</PolaroidFrame>);

			const figcaption = screen.getByText("Sans rotation");
			expect(figcaption.style.transform).toBe("");
		});
	});

	// --------------------------------------------------------------------------
	// Washi tape
	// --------------------------------------------------------------------------

	describe("washi tape", () => {
		it("renders no washi tape by default", () => {
			const { container } = render(<PolaroidFrame>content</PolaroidFrame>);

			const washiDivs = container.querySelectorAll("[aria-hidden='true']");
			const hasWashi = Array.from(washiDivs).some((el) =>
				(el as HTMLElement).style.clipPath.includes("polygon"),
			);
			expect(hasWashi).toBe(false);
		});

		it("renders one washi strip for washiTape=true with washiPosition=top-left", () => {
			const { container } = render(
				<PolaroidFrame washiTape washiPosition="top-left">
					content
				</PolaroidFrame>,
			);

			const strips = Array.from(container.querySelectorAll("[aria-hidden='true']")).filter((el) =>
				(el as HTMLElement).style.clipPath.includes("polygon"),
			);
			expect(strips).toHaveLength(1);
			expect((strips[0] as HTMLElement).className).toContain("-rotate-12");
		});

		it("renders one washi strip for washiTape=true with washiPosition=top-right", () => {
			const { container } = render(
				<PolaroidFrame washiTape washiPosition="top-right">
					content
				</PolaroidFrame>,
			);

			const strips = Array.from(container.querySelectorAll("[aria-hidden='true']")).filter((el) =>
				(el as HTMLElement).style.clipPath.includes("polygon"),
			);
			expect(strips).toHaveLength(1);
			expect((strips[0] as HTMLElement).className).toContain("rotate-12");
		});

		it("renders two washi strips for washiTape=true with washiPosition=both", () => {
			const { container } = render(
				<PolaroidFrame washiTape washiPosition="both">
					content
				</PolaroidFrame>,
			);

			const strips = Array.from(container.querySelectorAll("[aria-hidden='true']")).filter((el) =>
				(el as HTMLElement).style.clipPath.includes("polygon"),
			);
			expect(strips).toHaveLength(2);
		});

		it("applies secondary washi color to the top-right strip when explicit", () => {
			const { container } = render(
				<PolaroidFrame washiTape washiPosition="both" washiColor="mint" washiColorSecondary="peach">
					content
				</PolaroidFrame>,
			);

			const strips = Array.from(container.querySelectorAll("[aria-hidden='true']")).filter((el) =>
				(el as HTMLElement).style.clipPath.includes("polygon"),
			);
			const leftStrip = strips.find((el) =>
				(el as HTMLElement).className.includes("-left-3"),
			) as HTMLElement;
			const rightStrip = strips.find((el) =>
				(el as HTMLElement).className.includes("-right-3"),
			) as HTMLElement;

			expect(leftStrip.className).toContain("from-green-200");
			expect(rightStrip.className).toContain("from-orange-200");
		});

		it("defaults secondary washi to lavender when primary is pink", () => {
			const { container } = render(
				<PolaroidFrame washiTape washiPosition="both" washiColor="pink">
					content
				</PolaroidFrame>,
			);

			const strips = Array.from(container.querySelectorAll("[aria-hidden='true']")).filter((el) =>
				(el as HTMLElement).style.clipPath.includes("polygon"),
			);
			const rightStrip = strips.find((el) =>
				(el as HTMLElement).className.includes("-right-3"),
			) as HTMLElement;

			expect(rightStrip.className).toContain("from-purple-200");
		});

		it("defaults secondary washi to peach when primary is mint (complement table)", () => {
			const { container } = render(
				<PolaroidFrame washiTape washiPosition="both" washiColor="mint">
					content
				</PolaroidFrame>,
			);

			const strips = Array.from(container.querySelectorAll("[aria-hidden='true']")).filter((el) =>
				(el as HTMLElement).style.clipPath.includes("polygon"),
			);
			const rightStrip = strips.find((el) =>
				(el as HTMLElement).className.includes("-right-3"),
			) as HTMLElement;

			expect(rightStrip.className).toContain("from-orange-200");
		});
	});

	// --------------------------------------------------------------------------
	// Aspect ratio
	// --------------------------------------------------------------------------

	describe("aspect ratio", () => {
		it("applies polaroid aspect by default (1/1.05 authentic)", () => {
			const { container } = render(<PolaroidFrame>content</PolaroidFrame>);

			const photoContainer = container.querySelector("[class*='aspect-']") as HTMLElement;
			expect(photoContainer.className).toContain("aspect-[1/1.05]");
		});

		it("applies aspect-square when aspectRatio=square", () => {
			const { container } = render(<PolaroidFrame aspectRatio="square">content</PolaroidFrame>);

			const photoContainer = container.querySelector("[class*='aspect-']") as HTMLElement;
			expect(photoContainer.className).toContain("aspect-square");
		});

		it("applies aspect-4/3 when aspectRatio=landscape", () => {
			const { container } = render(<PolaroidFrame aspectRatio="landscape">content</PolaroidFrame>);

			const photoContainer = container.querySelector("[class*='aspect-']") as HTMLElement;
			expect(photoContainer.className).toContain("aspect-4/3");
		});

		it("applies aspect-3/4 when aspectRatio=portrait", () => {
			const { container } = render(<PolaroidFrame aspectRatio="portrait">content</PolaroidFrame>);

			const photoContainer = container.querySelector("[class*='aspect-']") as HTMLElement;
			expect(photoContainer.className).toContain("aspect-3/4");
		});
	});

	// --------------------------------------------------------------------------
	// Vintage filter
	// --------------------------------------------------------------------------

	describe("vintage filter", () => {
		it("does not apply vintage classes by default", () => {
			const { container } = render(<PolaroidFrame>content</PolaroidFrame>);

			const photoContainer = container.querySelector("[class*='aspect-']") as HTMLElement;
			expect(photoContainer.className).not.toContain("sepia");
		});

		it("applies sepia and contrast classes when vintage=true", () => {
			const { container } = render(<PolaroidFrame vintage>content</PolaroidFrame>);

			const photoContainer = container.querySelector("[class*='aspect-']") as HTMLElement;
			expect(photoContainer.className).toContain("sepia-[0.08]");
			expect(photoContainer.className).toContain("contrast-[1.02]");
			expect(photoContainer.className).toContain("saturate-[1.1]");
		});
	});

	// --------------------------------------------------------------------------
	// Custom className and style
	// --------------------------------------------------------------------------

	describe("custom className and style", () => {
		it("forwards custom className to the figure element", () => {
			const { container } = render(
				<PolaroidFrame className="my-custom-class">content</PolaroidFrame>,
			);

			expect(container.querySelector("figure")?.className).toContain("my-custom-class");
		});

		it("merges custom style with the figure inline styles", () => {
			const { container } = render(<PolaroidFrame style={{ opacity: 0.8 }}>content</PolaroidFrame>);

			const figure = container.querySelector("figure") as HTMLElement;
			expect(figure.style.opacity).toBe("0.8");
			expect(figure.style.boxShadow).not.toBe("");
		});
	});
});
