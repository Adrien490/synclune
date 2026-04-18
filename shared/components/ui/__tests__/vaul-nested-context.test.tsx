import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useIsInsideVaul, VaulNestedProvider } from "../vaul-nested-context";

afterEach(cleanup);

function Probe({ id }: { id: string }) {
	const inside = useIsInsideVaul();
	return <span data-testid={id}>{inside ? "nested" : "root"}</span>;
}

describe("VaulNestedContext", () => {
	it("returns false when rendered outside any provider", () => {
		render(<Probe id="probe" />);
		expect(screen.getByTestId("probe")).toHaveTextContent("root");
	});

	it("returns true when wrapped by VaulNestedProvider", () => {
		render(
			<VaulNestedProvider>
				<Probe id="probe" />
			</VaulNestedProvider>,
		);
		expect(screen.getByTestId("probe")).toHaveTextContent("nested");
	});

	it("propagates through multiple levels of nesting", () => {
		render(
			<VaulNestedProvider>
				<VaulNestedProvider>
					<Probe id="probe" />
				</VaulNestedProvider>
			</VaulNestedProvider>,
		);
		expect(screen.getByTestId("probe")).toHaveTextContent("nested");
	});
});
