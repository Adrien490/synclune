import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion, mockHoverCapable } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
	mockHoverCapable: { value: true },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => ({
	useReducedMotion: () => mockReducedMotion.value,
}));

// Capacité hover (hover: hover) and (pointer: fine) — true par défaut (desktop souris).
// Le stub matchMedia global de test/setup.ts renvoie false pour tout, ce qui
// rendrait le composant statique et casserait les tests d'interaction.
vi.mock("@/shared/hooks/use-media-query", () => ({
	useMediaQuery: () => mockHoverCapable.value,
}));

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		blurDataURL,
		...props
	}: {
		src: string;
		alt: string;
		blurDataURL?: string;
		[key: string]: unknown;
		// eslint-disable-next-line @next/next/no-img-element
	}) => <img src={src} alt={alt} data-blur-data-url={blurDataURL} {...props} />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ⚠️ `image-config.constants` n'est PAS mocké, et ne doit pas le redevenir.
// Il l'était, avec `GALLERY_MAIN_SIZES: "(max-width: 768px) 100vw, 50vw"` et
// `MAIN_IMAGE_QUALITY: 80` — deux valeurs qui n'existent nulle part dans le dépôt
// (le vrai `sizes` a trois paliers et plafonne à `min(55vw, 640px)`). Le test
// n'exerçait donc jamais le `sizes` réellement servi, et un changement de la SSOT
// serait passé sans un rouge. Défaut jumeau de celui relevé sur `slide.test.tsx`,
// qui mockait `GALLERY_ZOOM_LEVEL: 2` à sa propre valeur.
// Le module est du constant pur : rien à isoler. Corollaire agréable — plus besoin
// d'ajouter chaque nouvel import du composant à un mock qui l'ignorait en silence.

// ============================================================================
// RAF / getBoundingClientRect HARNESS
// ============================================================================

let pendingFrameCallback: FrameRequestCallback | null = null;
let rafCancelCount = 0;
let lastRafId = 0;

function flushRAF() {
	const cb = pendingFrameCallback;
	pendingFrameCallback = null;
	cb?.(performance.now());
}

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import {
	GALLERY_MAIN_SIZES,
	MAIN_IMAGE_QUALITY,
} from "@/modules/media/constants/image-config.constants";
import { GalleryHoverZoom } from "../hover-zoom";

// ============================================================================
// GalleryHoverZoom
// ============================================================================

describe("GalleryHoverZoom", () => {
	beforeEach(() => {
		mockReducedMotion.value = false;
		mockHoverCapable.value = true;
		pendingFrameCallback = null;
		rafCancelCount = 0;
		lastRafId = 0;

		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			pendingFrameCallback = cb;
			return ++lastRafId;
		});
		vi.stubGlobal("cancelAnimationFrame", () => {
			rafCancelCount += 1;
			pendingFrameCallback = null;
		});

		// Container 400x400 ancré en (0,0) — mouse events à (100, 200) = 25% x, 50% y
		Element.prototype.getBoundingClientRect = vi.fn(
			() =>
				({
					left: 0,
					top: 0,
					right: 400,
					bottom: 400,
					width: 400,
					height: 400,
					x: 0,
					y: 0,
					toJSON: () => ({}),
				}) as DOMRect,
		);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	// ============================================================================
	// Rendering
	// ============================================================================

	describe("rendering", () => {
		it("renders image with alt text", () => {
			render(<GalleryHoverZoom src="/test.jpg" alt="Test image" />);
			expect(screen.getByAltText("Test image")).toBeInTheDocument();
		});

		it("disabled mode renders without zoom container classes", () => {
			const { container } = render(
				<GalleryHoverZoom src="/test.jpg" alt="No zoom" enabled={false} />,
			);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.className).not.toContain("overflow-hidden");
			expect(wrapper.className).not.toContain("cursor-zoom-in");
		});

		it("reduced motion disables the zoom container entirely (static render)", () => {
			mockReducedMotion.value = true;
			const { container } = render(
				<GalleryHoverZoom src="/test.jpg" alt="Reduced zoom" enabled={true} />,
			);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.className).not.toContain("overflow-hidden");
			expect(wrapper.className).not.toContain("cursor-zoom-in");
		});

		// Sans pointeur fin (iPad : branche desktop choisie sur la LARGEUR), un tap
		// émule mouseenter sans jamais émettre mouseleave → scale sticky derrière la
		// lightbox. Le composant doit se désactiver lui-même.
		it("non-hover-capable device disables the zoom container entirely (static render)", () => {
			mockHoverCapable.value = false;
			const { container } = render(
				<GalleryHoverZoom src="/test.jpg" alt="Touch device" enabled={true} />,
			);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.className).not.toContain("overflow-hidden");
			expect(wrapper.className).not.toContain("cursor-zoom-in");
		});

		it("non-hover-capable device: emulated mouseenter applies no scale (no sticky zoom)", () => {
			mockHoverCapable.value = false;
			const { container } = render(<GalleryHoverZoom src="/test.jpg" alt="No sticky" />);
			const wrapper = container.firstChild as HTMLElement;
			const img = screen.getByAltText("No sticky") as HTMLImageElement;

			fireEvent.mouseEnter(wrapper);

			expect(img.style.transform).toBe("");
		});

		// Jumeau du cas ci-dessus, pour l'appareil que la media query NE VOIT PAS.
		// `(hover: hover) and (pointer: fine)` décrit le pointeur PRIMAIRE : un
		// portable Windows à écran tactile (primaire = trackpad) y répond `true`, donc
		// `mockHoverCapable` reste vrai et la branche interactive est bien rendue. Un
		// doigt y émulait alors `mouseenter` sans jamais émettre `mouseleave` — le
		// scale restait collé derrière la lightbox ouverte par le même geste.
		it("hover-capable device: a touch pointer still applies no scale (no sticky zoom)", () => {
			const { container } = render(<GalleryHoverZoom src="/test.jpg" alt="Hybrid" />);
			const wrapper = container.firstChild as HTMLElement;
			const img = screen.getByAltText("Hybrid") as HTMLImageElement;

			// `pointerenter` précède toujours le `mouseenter` de compatibilité.
			fireEvent.pointerEnter(wrapper, { pointerType: "touch" });
			fireEvent.mouseEnter(wrapper);

			expect(img.style.transform).toBe("scale(1)");
		});

		// …et le drapeau se corrige tout seul dès que la souris revient, sinon le zoom
		// resterait mort jusqu'au remontage sur une machine hybride.
		it("hover-capable device: a mouse pointer after a touch re-enables the zoom", () => {
			const { container } = render(<GalleryHoverZoom src="/test.jpg" alt="Back to mouse" />);
			const wrapper = container.firstChild as HTMLElement;
			const img = screen.getByAltText("Back to mouse") as HTMLImageElement;

			fireEvent.pointerEnter(wrapper, { pointerType: "touch" });
			fireEvent.mouseEnter(wrapper);
			fireEvent.mouseLeave(wrapper);

			fireEvent.pointerEnter(wrapper, { pointerType: "mouse" });
			fireEvent.mouseEnter(wrapper, { clientX: 100, clientY: 200 });

			expect(img.style.transform).toBe("scale(2)");
		});

		it("enabled mode has overflow-hidden class", () => {
			const { container } = render(
				<GalleryHoverZoom src="/test.jpg" alt="Zoom enabled" enabled={true} />,
			);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.className).toContain("overflow-hidden");
		});

		it("image has correct src and alt props", () => {
			render(<GalleryHoverZoom src="/product.jpg" alt="Product" />);
			const img = screen.getByAltText("Product") as HTMLImageElement;
			expect(img.src).toContain("/product.jpg");
			expect(img.alt).toBe("Product");
		});

		it("passes blurDataUrl as blurDataURL prop when provided", () => {
			const blur = "data:image/jpeg;base64,abc123";
			render(<GalleryHoverZoom src="/test.jpg" alt="Blur test" blurDataUrl={blur} />);
			const img = screen.getByAltText("Blur test");
			expect(img).toHaveAttribute("data-blur-data-url", blur);
		});

		it("enabled mode has cursor-zoom-in class (cohérent avec l'ouverture plein écran)", () => {
			const { container } = render(
				<GalleryHoverZoom src="/test.jpg" alt="Cursor test" enabled={true} />,
			);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.className).toContain("cursor-zoom-in");
		});

		// Le `sizes`/`quality` par défaut viennent de la SSOT `image-config.constants`,
		// désormais importée pour de vrai (cf. l'entête). Ces deux assertions sont ce
		// qui rend le dé-mockage utile : elles échouent si la SSOT change sous le
		// composant, là où la version mockée aurait continué à passer.
		it("sert le sizes de la SSOT, pas une valeur locale", () => {
			render(<GalleryHoverZoom src="/x.jpg" alt="sizes" />);

			expect(screen.getByAltText("sizes")).toHaveAttribute("sizes", GALLERY_MAIN_SIZES);
		});

		it("sert la qualité de la SSOT, pas un palier hors échelle", () => {
			render(<GalleryHoverZoom src="/x.jpg" alt="quality" />);

			expect(screen.getByAltText("quality")).toHaveAttribute("quality", String(MAIN_IMAGE_QUALITY));
		});

		it("applies transition-transform class when prefersReducedMotion=false", () => {
			mockReducedMotion.value = false;
			render(<GalleryHoverZoom src="/test.jpg" alt="Motion test" />);
			const img = screen.getByAltText("Motion test");
			expect(img.className).toContain("transition-transform");
		});

		it("omits transition-transform when prefersReducedMotion=true", () => {
			mockReducedMotion.value = true;
			render(<GalleryHoverZoom src="/test.jpg" alt="Reduced motion" />);
			const img = screen.getByAltText("Reduced motion");
			expect(img.className).not.toContain("transition-transform");
		});
	});

	// ============================================================================
	// Zoom interactions
	// ============================================================================

	describe("zoom interactions", () => {
		it("onMouseEnter applies scale(zoomLevel) on image transform (default 2)", () => {
			const { container } = render(<GalleryHoverZoom src="/x.jpg" alt="zoom2" />);
			const wrapper = container.firstChild as HTMLElement;
			const img = screen.getByAltText("zoom2") as HTMLImageElement;

			fireEvent.mouseEnter(wrapper);

			expect(img.style.transform).toContain("scale(2)");
		});

		it("zoomLevel=3 applies scale(3) on mouse enter", () => {
			const { container } = render(<GalleryHoverZoom src="/x.jpg" alt="zoom3" zoomLevel={3} />);
			const wrapper = container.firstChild as HTMLElement;
			const img = screen.getByAltText("zoom3") as HTMLImageElement;

			fireEvent.mouseEnter(wrapper);

			expect(img.style.transform).toContain("scale(3)");
		});

		it("mouseMove at (100, 200) sets transformOrigin to '25% 50%' after RAF flush", () => {
			const { container } = render(<GalleryHoverZoom src="/x.jpg" alt="origin" />);
			const wrapper = container.firstChild as HTMLElement;
			const img = screen.getByAltText("origin") as HTMLImageElement;

			fireEvent.mouseEnter(wrapper);
			fireEvent.mouseMove(wrapper, { clientX: 100, clientY: 200 });

			expect(pendingFrameCallback).not.toBeNull();
			flushRAF();

			expect(img.style.transformOrigin).toBe("25% 50%");
		});

		it("throttles consecutive mouseMove via RAF (one frame scheduled at a time)", () => {
			const { container } = render(<GalleryHoverZoom src="/x.jpg" alt="throttle" />);
			const wrapper = container.firstChild as HTMLElement;

			fireEvent.mouseEnter(wrapper);
			const idBefore = lastRafId;
			fireEvent.mouseMove(wrapper, { clientX: 50, clientY: 50 });
			const idAfterFirst = lastRafId;
			// 2nd move before flush — should be throttled (no new RAF id)
			fireEvent.mouseMove(wrapper, { clientX: 200, clientY: 300 });
			const idAfterSecond = lastRafId;

			expect(idAfterFirst).toBe(idBefore + 1);
			expect(idAfterSecond).toBe(idAfterFirst);
		});

		it("onMouseLeave resets transform to scale(1) and cancels pending RAF", () => {
			const { container } = render(<GalleryHoverZoom src="/x.jpg" alt="leave" />);
			const wrapper = container.firstChild as HTMLElement;
			const img = screen.getByAltText("leave") as HTMLImageElement;

			fireEvent.mouseEnter(wrapper);
			fireEvent.mouseMove(wrapper, { clientX: 100, clientY: 100 });
			expect(pendingFrameCallback).not.toBeNull();

			const cancelsBefore = rafCancelCount;
			fireEvent.mouseLeave(wrapper);

			expect(rafCancelCount).toBe(cancelsBefore + 1);
			expect(img.style.transform).toContain("scale(1)");
		});

		it("does not schedule RAF on mouseMove before mouseEnter (isZooming=false)", () => {
			const { container } = render(<GalleryHoverZoom src="/x.jpg" alt="no-zoom" />);
			const wrapper = container.firstChild as HTMLElement;

			fireEvent.mouseMove(wrapper, { clientX: 100, clientY: 100 });

			expect(pendingFrameCallback).toBeNull();
		});
	});

	// ============================================================================
	// Cleanup
	// ============================================================================

	describe("cleanup", () => {
		it("cancels pending RAF on unmount", () => {
			const { container, unmount } = render(<GalleryHoverZoom src="/x.jpg" alt="unmount" />);
			const wrapper = container.firstChild as HTMLElement;

			fireEvent.mouseEnter(wrapper);
			fireEvent.mouseMove(wrapper, { clientX: 100, clientY: 100 });
			expect(pendingFrameCallback).not.toBeNull();

			const cancelsBefore = rafCancelCount;
			unmount();

			expect(rafCancelCount).toBeGreaterThan(cancelsBefore);
		});
	});
});
