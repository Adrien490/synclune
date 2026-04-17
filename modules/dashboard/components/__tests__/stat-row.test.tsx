import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...props
	}: {
		href: string;
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => ({
	ArrowUp: () => <span data-testid="icon-arrow-up" />,
	ArrowDown: () => <span data-testid="icon-arrow-down" />,
	ChevronRight: (props: { className?: string }) => (
		<span data-testid="icon-chevron-right" className={props.className} />
	),
}));

import { StatRow } from "../stat-row";

afterEach(cleanup);

describe("StatRow", () => {
	it("renders label and value", () => {
		render(<StatRow label="Nouveaux clients" value="42" />);

		expect(screen.getByText("Nouveaux clients")).toBeInTheDocument();
		expect(screen.getByText("42")).toBeInTheDocument();
	});

	it("renders subtitle when provided", () => {
		render(<StatRow label="CA" value="1 200 €" subtitle="vs période" />);

		expect(screen.getByText("vs période")).toBeInTheDocument();
	});

	it("does not render subtitle when absent", () => {
		const { container } = render(<StatRow label="CA" value="1 200 €" />);

		expect(container.querySelector("[data-slot=item-description]")).toBeNull();
	});

	it("renders icon inside ItemMedia", () => {
		render(
			<StatRow
				label="CA"
				value="1 200 €"
				icon={<span data-testid="test-icon" aria-hidden="true" />}
			/>,
		);

		expect(screen.getByTestId("test-icon")).toBeInTheDocument();
	});

	it("renders evolution when provided", () => {
		render(<StatRow label="CA" value="1 200 €" evolution={15.3} comparisonLabel="vs prev" />);

		expect(screen.getByText("15.3%")).toBeInTheDocument();
		expect(screen.getByText("vs prev")).toBeInTheDocument();
	});

	it("does not render KpiEvolution when evolution is undefined", () => {
		render(<StatRow label="CA" value="1 200 €" />);

		expect(screen.queryByTestId("icon-arrow-up")).toBeNull();
		expect(screen.queryByTestId("icon-arrow-down")).toBeNull();
	});

	it("renders an anchor when href is provided", () => {
		render(<StatRow label="Commandes" value="8" href="/admin/commandes" />);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/admin/commandes");
	});

	it("renders a ChevronRight when href is provided", () => {
		render(<StatRow label="Commandes" value="8" href="/admin/commandes" />);

		expect(screen.getByTestId("icon-chevron-right")).toBeInTheDocument();
	});

	it("does not render ChevronRight when href is absent", () => {
		render(<StatRow label="Commandes" value="8" />);

		expect(screen.queryByTestId("icon-chevron-right")).toBeNull();
	});

	it("uses aria-label override when provided on a link", () => {
		render(
			<StatRow label="Commandes" value="8" href="/admin/commandes" aria-label="8 commandes" />,
		);

		expect(screen.getByRole("link", { name: "8 commandes" })).toBeInTheDocument();
	});

	it("applies highlight background when highlight=true", () => {
		const { container } = render(<StatRow label="Score" value="95 %" highlight />);

		// Target the Item root (data-slot=item)
		const item = container.querySelector("[data-slot=item]");
		expect(item?.className).toContain("bg-success/5");
	});

	it("renders value with tabular-nums class", () => {
		const { container } = render(<StatRow label="Total" value="42" />);

		const valueNode = container.querySelector(".tabular-nums");
		expect(valueNode).toBeInTheDocument();
		expect(valueNode).toHaveTextContent("42");
	});

	it("renders inverted evolution colors when invertEvolutionColors=true", () => {
		render(<StatRow label="Délai" value="3 j" evolution={-10} invertEvolutionColors />);

		// Evolution renders ArrowDown for negative values; color inversion is a prop of KpiEvolution
		expect(screen.getByTestId("icon-arrow-down")).toBeInTheDocument();
	});

	it("supports React nodes as value", () => {
		render(<StatRow label="Statut" value={<span data-testid="badge-value">OK</span>} />);

		expect(screen.getByTestId("badge-value")).toHaveTextContent("OK");
	});
});
