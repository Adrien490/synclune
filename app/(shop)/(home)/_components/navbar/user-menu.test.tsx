import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => {
	const fontMock = () => ({
		className: "mock-font",
		variable: "--mock-font",
		style: { fontFamily: "mock" },
	});
	return { Figtree: fontMock, Fraunces: fontMock, Caveat: fontMock };
});

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

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dropdown-root">{children}</div>
	),
	DropdownMenuTrigger: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<button type="button" data-testid="dropdown-trigger" {...props}>
			{children}
		</button>
	),
	DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dropdown-content">{children}</div>
	),
	DropdownMenuItem: ({
		children,
		onSelect,
	}: {
		children: React.ReactNode;
		onSelect?: () => void;
	}) => (
		<button type="button" data-testid="dropdown-item" onClick={onSelect}>
			{children}
		</button>
	),
	DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dropdown-label">{children}</div>
	),
	DropdownMenuSeparator: () => <div data-testid="dropdown-sep" />,
}));

vi.mock("@/modules/auth/components/logout-alert-dialog", () => ({
	LogoutAlertDialog: ({ open }: { open?: boolean }) =>
		open ? <div data-testid="logout-dialog-open" /> : null,
}));

import { UserMenu } from "./user-menu";

describe("UserMenu (desktop navbar)", () => {
	afterEach(cleanup);

	it("renders simple sign-in link when not logged in", () => {
		render(<UserMenu isLoggedIn={false} />);
		const link = screen.getByRole("link", { name: /se connecter/i });
		expect(link).toHaveAttribute("href", "/connexion");
		expect(screen.queryByTestId("dropdown-root")).not.toBeInTheDocument();
	});

	it("renders dropdown trigger with aria-label when logged in", () => {
		render(<UserMenu isLoggedIn={true} />);
		const trigger = screen.getByTestId("dropdown-trigger");
		expect(trigger).toHaveAttribute("aria-label", "Mon compte");
	});

	it("renders user name and email in label when provided", () => {
		render(<UserMenu isLoggedIn={true} userName="Alice" userEmail="alice@example.com" />);
		expect(screen.getByText("Alice")).toBeInTheDocument();
		expect(screen.getByText("alice@example.com")).toBeInTheDocument();
	});

	it("hides admin dashboard item when user is not admin", () => {
		render(<UserMenu isLoggedIn={true} />);
		expect(screen.queryByText(/tableau de bord admin/i)).not.toBeInTheDocument();
	});

	it("shows admin dashboard link when user is admin", () => {
		render(<UserMenu isLoggedIn={true} isAdmin />);
		const adminLink = screen.getByRole("link", { name: /tableau de bord admin/i });
		expect(adminLink).toHaveAttribute("href", "/admin");
	});

	it("renders core account links", () => {
		render(<UserMenu isLoggedIn={true} />);
		expect(screen.getByRole("link", { name: /mes commandes/i })).toHaveAttribute(
			"href",
			"/commandes",
		);
		expect(screen.getByRole("link", { name: /mes favoris/i })).toHaveAttribute("href", "/favoris");
		expect(screen.getByRole("link", { name: /paramètres/i })).toHaveAttribute(
			"href",
			"/parametres",
		);
	});

	it("opens logout dialog when logout item is selected", () => {
		render(<UserMenu isLoggedIn={true} />);
		const logoutItem = screen
			.getAllByTestId("dropdown-item")
			.find((el) => /se déconnecter/i.test(String(el.textContent)));
		expect(logoutItem).toBeDefined();
		if (!logoutItem) throw new Error("logout item missing");
		fireEvent.click(logoutItem);
		expect(screen.getByTestId("logout-dialog-open")).toBeInTheDocument();
	});
});
