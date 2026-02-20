import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/image
vi.mock("next/image", () => ({
	default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} {...props} />
	),
}));

import { CollectionMiniGrid } from "./collection-mini-grid";

afterEach(cleanup);

const makeImages = (count: number) =>
	Array.from({ length: count }, (_, i) => ({
		url: `/img-${i}.jpg`,
		blurDataUrl: i === 0 ? "data:image/jpeg;base64,abc" : null,
		alt: `Image ${i}`,
	}));

describe("CollectionMiniGrid", () => {
	describe("1 image layout", () => {
		it("renders a single full-size image", () => {
			render(<CollectionMiniGrid images={makeImages(1)} collectionName="Mariage" />);

			const images = screen.getAllByRole("img", { hidden: true });
			// Container role="img" + 1 actual img
			expect(images).toHaveLength(1);
		});

		it("uses role='img' with descriptive aria-label", () => {
			const { container } = render(
				<CollectionMiniGrid images={makeImages(1)} collectionName="Mariage" />
			);

			const imgContainer = container.querySelector("[role='img']");
			expect(imgContainer).toBeDefined();
			expect(imgContainer?.getAttribute("aria-label")).toBe(
				"1 photo de la collection Mariage"
			);
		});

		it("renders blur placeholder when blurDataUrl is provided", () => {
			const { container } = render(
				<CollectionMiniGrid images={makeImages(1)} collectionName="Test" />
			);

			const img = container.querySelector("img");
			expect(img?.getAttribute("placeholder")).toBe("blur");
		});
	});

	describe("2 images layout", () => {
		it("renders two images in a 2-column grid", () => {
			const { container } = render(
				<CollectionMiniGrid images={makeImages(2)} collectionName="Bohème" />
			);

			const imgs = container.querySelectorAll("img");
			expect(imgs).toHaveLength(2);
		});

		it("uses plural 'photos' in aria-label", () => {
			const { container } = render(
				<CollectionMiniGrid images={makeImages(2)} collectionName="Bohème" />
			);

			const imgContainer = container.querySelector("[role='img']");
			expect(imgContainer?.getAttribute("aria-label")).toBe(
				"2 photos de la collection Bohème"
			);
		});
	});

	describe("3-4 images layout (2x2 grid)", () => {
		it("renders 3 images in a 2x2 grid", () => {
			const { container } = render(
				<CollectionMiniGrid images={makeImages(3)} collectionName="Minimale" />
			);

			const imgs = container.querySelectorAll("img");
			expect(imgs).toHaveLength(3);

			const imgContainer = container.querySelector("[role='img']");
			expect(imgContainer?.getAttribute("aria-label")).toBe(
				"3 photos de la collection Minimale"
			);
		});

		it("renders max 4 images even when more are provided", () => {
			const { container } = render(
				<CollectionMiniGrid images={makeImages(5)} collectionName="Test" />
			);

			const imgs = container.querySelectorAll("img");
			expect(imgs).toHaveLength(4);
		});

		it("marks all images as aria-hidden", () => {
			const { container } = render(
				<CollectionMiniGrid images={makeImages(3)} collectionName="Test" />
			);

			const imgs = container.querySelectorAll("img");
			for (const img of imgs) {
				expect(img.getAttribute("aria-hidden")).toBe("true");
			}
		});
	});
});
