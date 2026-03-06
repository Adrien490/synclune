import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { useUpdateProfileMock } = vi.hoisted(() => ({
	useUpdateProfileMock: vi.fn(() => ({
		state: undefined,
		action: vi.fn(),
		isPending: false,
	})),
}));

vi.mock("@/modules/users/hooks/use-update-profile", () => ({
	useUpdateProfile: useUpdateProfileMock,
}));

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

vi.mock("@tanstack/react-form-nextjs", () => ({
	mergeForm: vi.fn((_form: unknown, state: unknown) => state),
	useTransform: vi.fn((fn: unknown) => fn),
}));

// Mock EmailChangeForm to isolate ProfileForm tests
vi.mock("@/modules/users/components/email-change-form", () => ({
	EmailChangeForm: () => <div data-testid="email-change-form" />,
}));

// Mock useAppForm with a smart implementation that runs validators
vi.mock("@/shared/components/forms", () => ({
	useAppForm: vi.fn((config: { defaultValues: Record<string, string> }) => {
		const { defaultValues } = config;
		return {
			AppField: ({
				name,
				validators,
				children,
			}: {
				name: string;
				validators?: { onChange?: (args: { value: string }) => string | undefined };
				children: (field: {
					InputField: (props: { label: string; [key: string]: unknown }) => React.ReactNode;
				}) => React.ReactNode;
			}) => {
				const [value, setValue] = React.useState(defaultValues[name] ?? "");
				const [error, setError] = React.useState<string | undefined>(undefined);

				const field = {
					InputField: ({ label, ...props }: { label: string; [key: string]: unknown }) => (
						<div>
							<label htmlFor={name}>{label}</label>
							<input
								id={name}
								name={name}
								value={value}
								onChange={(e) => {
									const newVal = e.target.value;
									setValue(newVal);
									if (validators?.onChange) {
										const err = validators.onChange({ value: newVal });
										setError(err);
									}
								}}
								{...(props as React.InputHTMLAttributes<HTMLInputElement>)}
							/>
							{error && <span role="alert">{error}</span>}
						</div>
					),
				};
				return children(field);
			},
			Subscribe: ({
				children,
				selector,
			}: {
				children: (values: unknown[]) => React.ReactNode;
				selector: (state: { canSubmit: boolean }) => unknown[];
			}) => children(selector({ canSubmit: true })),
			handleSubmit: vi.fn(),
		};
	}),
}));

import { ProfileForm } from "../profile-form";

const mockUser = {
	id: "user-1",
	name: "Alice",
	email: "alice@example.com",
	role: "USER" as const,
	accountStatus: "ACTIVE" as const,
	emailVerified: true,
	deletionRequestedAt: null,
	createdAt: new Date(),
	updatedAt: new Date(),
};

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	useUpdateProfileMock.mockReturnValue({ state: undefined, action: vi.fn(), isPending: false });
});

describe("ProfileForm", () => {
	it("renders with user name and email", () => {
		render(<ProfileForm user={mockUser} />);
		expect(screen.getByRole("textbox", { name: /Prénom/i })).toBeInTheDocument();
		expect(screen.getByDisplayValue("alice@example.com")).toBeInTheDocument();
	});

	it("email field is disabled and EmailChangeForm is rendered", () => {
		render(<ProfileForm user={mockUser} />);
		const emailInput = screen.getByDisplayValue("alice@example.com");
		expect(emailInput).toBeDisabled();
		expect(screen.getByTestId("email-change-form")).toBeInTheDocument();
	});

	it("renders the submit button", () => {
		render(<ProfileForm user={mockUser} />);
		expect(
			screen.getByRole("button", { name: /Enregistrer les modifications/i }),
		).toBeInTheDocument();
	});

	it("shows pending state on submit button", () => {
		useUpdateProfileMock.mockReturnValue({ state: undefined, action: vi.fn(), isPending: true });
		render(<ProfileForm user={mockUser} />);
		expect(screen.getByRole("button", { name: /Enregistrement/i })).toBeInTheDocument();
	});
});
