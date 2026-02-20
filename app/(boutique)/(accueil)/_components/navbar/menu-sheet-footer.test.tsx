import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/link
vi.mock("next/link", () => ({
	default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
		<a href={href} {...props}>{children}</a>
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
		render(<MenuSheetFooter isAdmin={false} />);

		const instagramLink = screen.getByLabelText(/Instagram/);
		expect(instagramLink.getAttribute("target")).toBe("_blank");
		expect(instagramLink.getAttribute("rel")).toBe("noopener noreferrer");

		const tiktokLink = screen.getByLabelText(/TikTok/);
		expect(tiktokLink.getAttribute("target")).toBe("_blank");
		expect(tiktokLink.getAttribute("rel")).toBe("noopener noreferrer");
	});

	it("does not render admin link when isAdmin is false", () => {
		render(<MenuSheetFooter isAdmin={false} />);

		expect(screen.queryByLabelText(/administrateur/)).toBeNull();
	});

	it("renders admin link when isAdmin is true", () => {
		render(<MenuSheetFooter isAdmin />);

		const adminLink = screen.getByLabelText("Tableau de bord administrateur");
		expect(adminLink).toBeDefined();
		expect(adminLink.getAttribute("href")).toBe("/admin");
	});

	it("renders copyright with current year", () => {
		render(<MenuSheetFooter isAdmin={false} />);

		const year = new Date().getFullYear().toString();
		expect(screen.getByText(new RegExp(year))).toBeDefined();
	});

	it("renders in a footer element", () => {
		render(<MenuSheetFooter isAdmin={false} />);

		const footer = document.querySelector("footer");
		expect(footer).toBeDefined();
	});
});
