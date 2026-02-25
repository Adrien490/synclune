import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockValidateDiscountCode, mockFormatEuro } = vi.hoisted(() => ({
	mockValidateDiscountCode: vi.fn(),
	mockFormatEuro: vi.fn((n: number) => `${(n / 100).toFixed(2)} €`),
}))

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/modules/discounts/actions/validate-discount-code", () => ({
	validateDiscountCode: mockValidateDiscountCode,
}))

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: mockFormatEuro,
}))

vi.mock("@/shared/components/ui/collapsible", () => ({
	Collapsible: ({
		children,
		open,
		onOpenChange,
	}: {
		children: React.ReactNode
		open?: boolean
		onOpenChange?: (open: boolean) => void
	}) => (
		<div data-testid="collapsible" data-open={open}>
			{children}
		</div>
	),
	CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="collapsible-content">{children}</div>
	),
	CollapsibleTrigger: ({
		children,
		className,
		onClick,
	}: {
		children: React.ReactNode
		className?: string
		onClick?: () => void
	}) => (
		<button
			data-testid="collapsible-trigger"
			className={className}
			onClick={onClick}
		>
			{children}
		</button>
	),
}))

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		onClick,
		variant,
	}: {
		children: React.ReactNode
		disabled?: boolean
		type?: "button" | "submit" | "reset"
		onClick?: () => void
		variant?: string
	}) => (
		<button
			type={type ?? "button"}
			disabled={disabled}
			data-variant={variant}
			onClick={onClick}
		>
			{children}
		</button>
	),
}))

vi.mock("@/shared/components/ui/input", () => ({
	Input: ({
		value,
		onChange,
		placeholder,
		className,
		"aria-label": ariaLabel,
		"aria-invalid": ariaInvalid,
		"aria-describedby": ariaDescribedby,
		disabled,
		onKeyDown,
	}: {
		value: string
		onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
		placeholder?: string
		className?: string
		"aria-label"?: string
		"aria-invalid"?: boolean
		"aria-describedby"?: string
		disabled?: boolean
		onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
	}) => (
		<input
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			className={className}
			aria-label={ariaLabel}
			aria-invalid={ariaInvalid}
			aria-describedby={ariaDescribedby}
			disabled={disabled}
			onKeyDown={onKeyDown}
		/>
	),
}))

vi.mock("lucide-react", () => ({
	ChevronRight: ({ className }: { className?: string }) => (
		<svg data-testid="chevron-right" className={className} />
	),
	Loader2: ({ className }: { className?: string }) => (
		<svg data-testid="loader-icon" className={className} />
	),
	Tag: () => <svg data-testid="tag-icon" />,
	X: () => <svg data-testid="x-icon" />,
}))

// ─── Import under test ───────────────────────────────────────────────────────

import { DiscountCodeInput } from "../discount-code-input"
import type { ValidateDiscountCodeReturn } from "@/modules/discounts/types/discount.types"

afterEach(cleanup)

// ─── Fixtures ────────────────────────────────────────────────────────────────

type AppliedDiscount = NonNullable<ValidateDiscountCodeReturn["discount"]>

function createDiscount(overrides: Partial<AppliedDiscount> = {}): AppliedDiscount {
	return {
		id: "disc-1",
		code: "SAVE10",
		type: "PERCENTAGE" as AppliedDiscount["type"],
		value: 10,
		discountAmount: 500,
		...overrides,
	}
}

function renderComponent(props: Partial<React.ComponentProps<typeof DiscountCodeInput>> = {}) {
	const defaults = {
		subtotal: 5000,
		appliedDiscount: null as AppliedDiscount | null,
		onDiscountApplied: vi.fn(),
	}
	return render(<DiscountCodeInput {...defaults} {...props} />)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("DiscountCodeInput", () => {
	describe("no discount applied state", () => {
		it("shows the collapsible trigger with promo code text", () => {
			renderComponent()

			expect(screen.getByTestId("collapsible-trigger")).toBeDefined()
			expect(screen.getByText("J'ai un code promo")).toBeDefined()
		})

		it("does not show the applied discount badge when no discount", () => {
			renderComponent()

			expect(screen.queryByRole("button", { name: "Supprimer le code promo" })).toBeNull()
		})

		it("renders the collapsible input area", () => {
			renderComponent()

			expect(screen.getByTestId("collapsible-content")).toBeDefined()
		})

		it("renders the code input field", () => {
			renderComponent()

			expect(screen.getByRole("textbox", { name: "Code promo" })).toBeDefined()
		})

		it("renders the apply button", () => {
			renderComponent()

			expect(screen.getByRole("button", { name: "Appliquer" })).toBeDefined()
		})

		it("starts with collapsed state (isOpen false) when no discount", () => {
			renderComponent()

			const collapsible = screen.getByTestId("collapsible")
			expect(collapsible.getAttribute("data-open")).toBe("false")
		})
	})

	describe("applied discount state", () => {
		it("shows the applied discount badge when discount is provided", () => {
			const discount = createDiscount({ code: "SAVE10" })
			renderComponent({ appliedDiscount: discount })

			expect(screen.getByText("SAVE10")).toBeDefined()
		})

		it("shows the formatted discount amount", () => {
			mockFormatEuro.mockImplementation((n: number) => `${(n / 100).toFixed(2)} €`)
			const discount = createDiscount({ discountAmount: 500 })
			renderComponent({ appliedDiscount: discount })

			expect(screen.getByText("-5.00 €")).toBeDefined()
		})

		it("shows the remove (X) button when discount is applied", () => {
			const discount = createDiscount()
			renderComponent({ appliedDiscount: discount })

			expect(screen.getByRole("button", { name: "Supprimer le code promo" })).toBeDefined()
		})

		it("does not render the collapsible input area when discount is applied", () => {
			const discount = createDiscount()
			renderComponent({ appliedDiscount: discount })

			expect(screen.queryByTestId("collapsible-trigger")).toBeNull()
			expect(screen.queryByTestId("collapsible-content")).toBeNull()
		})

		it("starts open when discount is already applied (isOpen initialized to true)", () => {
			// When appliedDiscount is set, the component renders the badge view directly,
			// so the collapsible is not rendered. The isOpen state initialises to !!appliedDiscount.
			// We verify this by checking the badge view is shown instead of the collapsible.
			const discount = createDiscount()
			renderComponent({ appliedDiscount: discount })

			expect(screen.getByText(discount.code)).toBeDefined()
			expect(screen.queryByTestId("collapsible")).toBeNull()
		})
	})

	describe("remove discount", () => {
		it("calls onDiscountApplied(null) when the remove button is clicked", async () => {
			const user = userEvent.setup()
			const onDiscountApplied = vi.fn()
			const discount = createDiscount()

			renderComponent({ appliedDiscount: discount, onDiscountApplied })

			await user.click(screen.getByRole("button", { name: "Supprimer le code promo" }))

			expect(onDiscountApplied).toHaveBeenCalledWith(null)
		})

		it("calls onDiscountApplied exactly once on remove click", async () => {
			const user = userEvent.setup()
			const onDiscountApplied = vi.fn()
			const discount = createDiscount()

			renderComponent({ appliedDiscount: discount, onDiscountApplied })

			await user.click(screen.getByRole("button", { name: "Supprimer le code promo" }))

			expect(onDiscountApplied).toHaveBeenCalledOnce()
		})
	})

	describe("input auto-uppercase", () => {
		it("auto-uppercases typed text", async () => {
			const user = userEvent.setup()
			renderComponent()

			const input = screen.getByRole("textbox", { name: "Code promo" }) as HTMLInputElement

			await user.type(input, "save10")

			expect(input.value).toBe("SAVE10")
		})

		it("uppercases mixed-case input", async () => {
			const user = userEvent.setup()
			renderComponent()

			const input = screen.getByRole("textbox", { name: "Code promo" }) as HTMLInputElement

			await user.type(input, "SuMmEr")

			expect(input.value).toBe("SUMMER")
		})
	})

	describe("apply discount code", () => {
		beforeEach(() => {
			mockValidateDiscountCode.mockClear()
		})

		it("calls validateDiscountCode with uppercased code and subtotal on apply click", async () => {
			const user = userEvent.setup()
			mockValidateDiscountCode.mockResolvedValue({ valid: false, error: "Code invalide" })
			renderComponent({ subtotal: 5000 })

			const input = screen.getByRole("textbox", { name: "Code promo" })
			await user.type(input, "save10")
			await user.click(screen.getByRole("button", { name: "Appliquer" }))

			await waitFor(() => {
				expect(mockValidateDiscountCode).toHaveBeenCalledWith("SAVE10", 5000)
			})
		})

		it("calls onDiscountApplied with discount data on success", async () => {
			const user = userEvent.setup()
			const discount = createDiscount({ code: "SAVE10" })
			const onDiscountApplied = vi.fn()
			mockValidateDiscountCode.mockResolvedValue({ valid: true, discount })
			renderComponent({ subtotal: 5000, onDiscountApplied })

			const input = screen.getByRole("textbox", { name: "Code promo" })
			await user.type(input, "save10")
			await user.click(screen.getByRole("button", { name: "Appliquer" }))

			await waitFor(() => {
				expect(onDiscountApplied).toHaveBeenCalledWith(discount)
			})
		})

		it("shows error message when code is invalid", async () => {
			const user = userEvent.setup()
			mockValidateDiscountCode.mockResolvedValue({ valid: false, error: "Code expiré" })
			renderComponent()

			const input = screen.getByRole("textbox", { name: "Code promo" })
			await user.type(input, "OLDCODE")
			await user.click(screen.getByRole("button", { name: "Appliquer" }))

			await waitFor(() => {
				expect(screen.getByText("Code expiré")).toBeDefined()
			})
		})

		it("shows fallback error 'Code invalide' when error is undefined", async () => {
			const user = userEvent.setup()
			mockValidateDiscountCode.mockResolvedValue({ valid: false })
			renderComponent()

			const input = screen.getByRole("textbox", { name: "Code promo" })
			await user.type(input, "BAD")
			await user.click(screen.getByRole("button", { name: "Appliquer" }))

			await waitFor(() => {
				expect(screen.getByText("Code invalide")).toBeDefined()
			})
		})

		it("shows error with role=alert", async () => {
			const user = userEvent.setup()
			mockValidateDiscountCode.mockResolvedValue({ valid: false, error: "Code invalide" })
			renderComponent()

			const input = screen.getByRole("textbox", { name: "Code promo" })
			await user.type(input, "BAD")
			await user.click(screen.getByRole("button", { name: "Appliquer" }))

			await waitFor(() => {
				const alert = screen.getByRole("alert")
				expect(alert.textContent).toContain("Code invalide")
			})
		})

		it("does not call validateDiscountCode when input is empty", async () => {
			const user = userEvent.setup()
			renderComponent()

			await user.click(screen.getByRole("button", { name: "Appliquer" }))

			expect(mockValidateDiscountCode).not.toHaveBeenCalled()
		})

		it("does not call validateDiscountCode when input is only whitespace", async () => {
			const user = userEvent.setup()
			renderComponent()

			const input = screen.getByRole("textbox", { name: "Code promo" })
			await user.type(input, "   ")
			await user.click(screen.getByRole("button", { name: "Appliquer" }))

			expect(mockValidateDiscountCode).not.toHaveBeenCalled()
		})

		it("disables apply button when input is empty", () => {
			renderComponent()

			const applyButton = screen.getByRole("button", { name: "Appliquer" }) as HTMLButtonElement
			expect(applyButton.disabled).toBe(true)
		})

		it("clears error message when user starts typing again after an error", async () => {
			const user = userEvent.setup()
			mockValidateDiscountCode.mockResolvedValue({ valid: false, error: "Code invalide" })
			renderComponent()

			const input = screen.getByRole("textbox", { name: "Code promo" })
			await user.type(input, "BAD")
			await user.click(screen.getByRole("button", { name: "Appliquer" }))

			await waitFor(() => {
				expect(screen.getByRole("alert")).toBeDefined()
			})

			await user.type(input, "X")

			await waitFor(() => {
				expect(screen.queryByRole("alert")).toBeNull()
			})
		})

		it("clears the input field after a successful apply", async () => {
			const user = userEvent.setup()
			const discount = createDiscount({ code: "SAVE10" })
			mockValidateDiscountCode.mockResolvedValue({ valid: true, discount })
			renderComponent()

			const input = screen.getByRole("textbox", { name: "Code promo" }) as HTMLInputElement
			await user.type(input, "SAVE10")
			await user.click(screen.getByRole("button", { name: "Appliquer" }))

			await waitFor(() => {
				expect(input.value).toBe("")
			})
		})

		it("submits code on Enter key press", async () => {
			const user = userEvent.setup()
			mockValidateDiscountCode.mockResolvedValue({ valid: false, error: "Code invalide" })
			renderComponent({ subtotal: 5000 })

			const input = screen.getByRole("textbox", { name: "Code promo" })
			await user.type(input, "ENTERCODE{Enter}")

			await waitFor(() => {
				expect(mockValidateDiscountCode).toHaveBeenCalledWith("ENTERCODE", 5000)
			})
		})

		it("sets aria-invalid on the input when there is an error", async () => {
			const user = userEvent.setup()
			mockValidateDiscountCode.mockResolvedValue({ valid: false, error: "Code invalide" })
			renderComponent()

			const input = screen.getByRole("textbox", { name: "Code promo" }) as HTMLInputElement
			await user.type(input, "BAD")
			await user.click(screen.getByRole("button", { name: "Appliquer" }))

			await waitFor(() => {
				expect(input.getAttribute("aria-invalid")).toBe("true")
			})
		})
	})
})
