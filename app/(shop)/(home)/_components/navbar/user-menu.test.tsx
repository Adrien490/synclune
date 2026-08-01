import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => {
	const fontMock = () => ({
		className: "mock-font",
		variable: "--mock-font",
		style: { fontFamily: "mock" },
	});
	return { Figtree: fontMock, Fraunces: fontMock, Sacramento: fontMock };
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

describe("UserMenu (desktop navbar) — réservé à l'admin", () => {
	afterEach(cleanup);

	/**
	 * Garde du retrait de l'espace client (2026-07-31).
	 *
	 * Le composant rendait un lien « Se connecter » à tout visiteur non connecté.
	 * Sans compte client, cette page est un cul-de-sac : pas d'inscription, pas de
	 * commandes. Le seul suivi de commande passe par le lien tokenisé de l'email de
	 * confirmation.
	 */
	it("ne rend rien pour un visiteur non connecté", () => {
		const { container } = render(<UserMenu />);

		expect(container).toBeEmptyDOMElement();
		expect(screen.queryByRole("link", { name: /se connecter/i })).toBeNull();
	});

	/**
	 * Une session non-admin ne peut plus exister par un chemin applicatif
	 * (`disableSignUp` + pas d'OAuth), mais une ligne héritée le permet encore. Elle
	 * n'a aucune destination dans ce menu → on ne le monte pas.
	 */
	it("ne rend rien pour une session non-admin", () => {
		const { container } = render(<UserMenu isAdmin={false} userName="Alice" />);

		expect(container).toBeEmptyDOMElement();
	});

	it("expose un déclencheur libellé « Menu administration » pour l'admin", () => {
		render(<UserMenu isAdmin />);

		expect(screen.getByTestId("dropdown-trigger")).toHaveAttribute(
			"aria-label",
			"Menu administration",
		);
	});

	it("affiche le nom et l'email quand ils sont fournis", () => {
		render(<UserMenu isAdmin userName="Alice" userEmail="alice@example.com" />);

		expect(screen.getByText("Alice")).toBeInTheDocument();
		expect(screen.getByText("alice@example.com")).toBeInTheDocument();
	});

	it("mène au tableau de bord admin", () => {
		render(<UserMenu isAdmin />);

		expect(screen.getByRole("link", { name: /tableau de bord admin/i })).toHaveAttribute(
			"href",
			"/admin",
		);
	});

	/**
	 * Les trois entrées client (« Mes commandes », « Mes favoris », « Paramètres »)
	 * ont disparu avec leurs routes. Les favoris restent joignables par leur icône
	 * dédiée dans la navbar, qui ne dépend d'aucune session.
	 */
	it("n'expose plus aucune entrée d'espace client", () => {
		render(<UserMenu isAdmin />);

		expect(screen.queryByRole("link", { name: /mes commandes/i })).toBeNull();
		expect(screen.queryByRole("link", { name: /paramètres/i })).toBeNull();
	});

	it("ouvre le dialogue de déconnexion au choix de l'entrée", () => {
		render(<UserMenu isAdmin />);

		const logoutItem = screen
			.getAllByTestId("dropdown-item")
			.find((el) => /se déconnecter/i.test(String(el.textContent)));
		expect(logoutItem).toBeDefined();
		if (!logoutItem) throw new Error("logout item missing");

		fireEvent.click(logoutItem);

		expect(screen.getByTestId("logout-dialog-open")).toBeInTheDocument();
	});
});
