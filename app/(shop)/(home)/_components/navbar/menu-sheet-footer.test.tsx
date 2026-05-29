import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/link — preserves prefetch as data-prefetch attr (DOM-warning-safe)
vi.mock("next/link", () => ({
	default: ({
		href,
		prefetch,
		children,
		...props
	}: {
		href: string;
		prefetch?: boolean | null;
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<a
			href={href}
			data-prefetch={prefetch === null ? "null" : prefetch === false ? "false" : "auto"}
			{...props}
		>
			{children}
		</a>
	),
}));

// Mock SheetClose to render children directly
vi.mock("@/shared/components/ui/sheet", () => ({
	SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock icons
vi.mock("@/shared/components/icons/instagram-icon", () => ({
	InstagramIcon: () => <span data-testid="instagram-icon" />,
}));

vi.mock("@/shared/components/icons/tiktok-icon", () => ({
	TikTokIcon: () => <span data-testid="tiktok-icon" />,
}));

import { MenuSheetFooter } from "./menu-sheet-footer";

afterEach(cleanup);

describe("MenuSheetFooter", () => {
	it("renders social links with correct accessibility attributes", () => {
		render(<MenuSheetFooter />);

		const instagramLink = screen.getByLabelText(/Instagram/);
		expect(instagramLink.getAttribute("target")).toBe("_blank");
		expect(instagramLink.getAttribute("rel")).toBe("noopener noreferrer");

		const tiktokLink = screen.getByLabelText(/TikTok/);
		expect(tiktokLink.getAttribute("target")).toBe("_blank");
		expect(tiktokLink.getAttribute("rel")).toBe("noopener noreferrer");
	});

	// Admin link lives in MenuSheetNav, never in the footer.
	it("does not render an admin link", () => {
		render(<MenuSheetFooter />);

		expect(screen.queryByLabelText(/administrateur/)).toBeNull();
	});

	it("renders copyright with current year", () => {
		render(<MenuSheetFooter />);

		const year = new Date().getFullYear().toString();
		expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
	});

	it("renders in a footer element", () => {
		render(<MenuSheetFooter />);

		const footer = document.querySelector("footer");
		expect(footer).toBeInTheDocument();
	});
});
