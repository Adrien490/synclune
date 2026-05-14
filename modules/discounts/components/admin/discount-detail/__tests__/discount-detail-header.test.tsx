import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockOpenDialog, mockOpenAlertDialog, mockDuplicate, mockHaptic } = vi.hoisted(() => ({
	mockOpenDialog: vi.fn(),
	mockOpenAlertDialog: vi.fn(),
	mockDuplicate: vi.fn(),
	mockHaptic: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		onClick,
	}: {
		children: React.ReactNode;
		href: string;
		onClick?: () => void;
	}) => (
		<a href={href} onClick={onClick}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

vi.mock("@/shared/utils/with-view-transition", () => ({
	withViewTransition: (fn: () => void) => fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpenDialog }),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockOpenAlertDialog }),
}));

vi.mock("@/modules/discounts/hooks/use-duplicate-discount", () => ({
	useDuplicateDiscount: () => ({ duplicate: mockDuplicate, isPending: false }),
}));

vi.mock("@/modules/discounts/components/admin/delete-discount-alert-dialog", () => ({
	DELETE_DISCOUNT_DIALOG_ID: "delete-discount",
}));
vi.mock("@/modules/discounts/components/admin/toggle-discount-status-alert-dialog", () => ({
	TOGGLE_DISCOUNT_STATUS_DIALOG_ID: "toggle-discount-status",
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		asChild,
		className,
		...rest
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		asChild?: boolean;
		className?: string;
		[key: string]: unknown;
	}) => {
		if (asChild) return <>{children}</>;
		return (
			<button aria-label={ariaLabel} className={className} {...rest}>
				{children}
			</button>
		);
	},
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant: string }) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/responsive-action-menu", async () => {
	const { buildResponsiveActionMenuMock } =
		await import("@/shared/components/responsive-action-menu/test-mock");
	return buildResponsiveActionMenuMock();
});

vi.mock("lucide-react", () => ({
	Ellipsis: () => <svg data-testid="icon-ellipsis" />,
	Pencil: () => <svg data-testid="icon-pencil" />,
	Copy: () => <svg data-testid="icon-copy" />,
	Trash2: () => <svg data-testid="icon-trash" />,
	Power: () => <svg data-testid="icon-power" />,
	PowerOff: () => <svg data-testid="icon-power-off" />,
}));

import { DiscountDetailHeader } from "../discount-detail-header";

const discount = {
	id: "d-1",
	code: "PROMO10",
	type: "PERCENTAGE" as const,
	value: 10,
	minOrderAmount: null,
	maxUsageCount: null,
	maxUsagePerUser: null,
	usageCount: 0,
	isActive: true,
	startsAt: new Date("2026-01-01"),
	endsAt: null,
	createdAt: new Date("2026-05-01"),
	updatedAt: new Date("2026-05-13"),
	_count: { usages: 0 },
};

describe("DiscountDetailHeader", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-05-14T12:00:00Z"));
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
		cleanup();
	});

	it("affiche le code du discount comme heading", () => {
		render(<DiscountDetailHeader discount={discount as any} />);
		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent("PROMO10");
	});

	it("lien Modifier pointe vers /modifier", () => {
		render(<DiscountDetailHeader discount={discount as any} />);
		const link = screen.getByRole("link", { name: /Modifier/ });
		expect(link).toHaveAttribute("href", "/admin/marketing/discounts/d-1/modifier");
	});

	it("appelle haptic('light') au clic sur Modifier", () => {
		render(<DiscountDetailHeader discount={discount as any} />);
		const link = screen.getByRole("link", { name: /Modifier/ });
		link.click();
		expect(mockHaptic).toHaveBeenCalledWith("light");
	});

	it("expose un bouton 'Plus d'actions'", () => {
		render(<DiscountDetailHeader discount={discount as any} />);
		expect(screen.getByRole("button", { name: "Plus d'actions" })).toBeInTheDocument();
	});

	it("affiche le badge de statut", () => {
		render(<DiscountDetailHeader discount={discount as any} />);
		const badges = screen.getAllByTestId("badge");
		expect(badges.length).toBeGreaterThan(0);
		expect(badges[0]).toHaveTextContent("Actif");
	});
});
