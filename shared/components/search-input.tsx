"use client"

import { useRef, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Search, X } from "lucide-react"

import { useAppForm } from "@/shared/components/forms"
import { MiniDotsLoader } from "@/shared/components/loaders/mini-dots-loader"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Spinner } from "@/shared/components/ui/spinner"
import { cn } from "@/shared/utils/cn"

type BaseProps = {
	/** Placeholder text */
	placeholder?: string
	/** Search mode: submit requires button click, live updates on change with debounce */
	mode?: "submit" | "live"
	/** Size variant: sm (44px) for toolbars, md (48px) for dialogs */
	size?: "sm" | "md"
	/** Debounce delay in ms for live mode */
	debounceMs?: number
	/** Show external pending state */
	isPending?: boolean
	/** Auto focus input on mount */
	autoFocus?: boolean
	/** Additional class for the container */
	className?: string
	/** Aria label for the input */
	ariaLabel?: string
}

type CallbackModeProps = BaseProps & {
	/** URL param name - when provided, manages URL state automatically */
	paramName?: never
	/** Callback when search is submitted or changed */
	onSearch: (value: string) => void
	/** Current search value (for controlled mode) */
	value?: string
	/** Callback when input value changes */
	onValueChange?: (value: string) => void
	/** Callback when clear button is clicked */
	onClear?: () => void
}

type UrlModeProps = BaseProps & {
	/** URL param name - manages URL state automatically */
	paramName: string
	/** Not needed in URL mode */
	onSearch?: never
	value?: never
	onValueChange?: never
	onClear?: never
}

type SearchInputProps = CallbackModeProps | UrlModeProps

const sizeStyles = {
	sm: {
		container: "h-11 rounded-md",
		input: "h-11 pl-10 pr-10 text-base sm:text-sm",
		iconLeft: "left-3",
		clearButton: "size-9",
		clearIcon: "size-4",
		submitButton: "size-11 rounded-md",
	},
	md: {
		container: "h-12 rounded-xl",
		input: "h-12 pl-12 pr-12 text-base",
		iconLeft: "left-4",
		clearButton: "size-10",
		clearIcon: "size-5",
		submitButton: "size-12 rounded-xl",
	},
}

/**
 * Reusable search input component.
 *
 * Two modes of operation:
 * 1. Callback mode: Pass `onSearch` for manual handling
 * 2. URL mode: Pass `paramName` for automatic URL state management
 *
 * Search behavior:
 * - Submit mode: shows submit button, requires explicit submission
 * - Live mode: updates on change with debounce
 */
export function SearchInput(props: SearchInputProps) {
	const {
		placeholder = "Rechercher...",
		mode = "submit",
		size = "md",
		debounceMs = 300,
		isPending: externalPending = false,
		autoFocus = false,
		className,
		ariaLabel,
	} = props

	const inputRef = useRef<HTMLInputElement>(null)
	const [internalPending, startTransition] = useTransition()
	const styles = sizeStyles[size]

	// URL mode hooks (only used when paramName is provided)
	const searchParams = useSearchParams()
	const router = useRouter()

	// Determine if we're in URL mode
	const isUrlMode = "paramName" in props && props.paramName !== undefined

	// Get initial value based on mode
	const initialValue = isUrlMode
		? searchParams.get(props.paramName) || ""
		: (props as CallbackModeProps).value || ""

	const isPending = externalPending || internalPending

	const form = useAppForm({
		defaultValues: { search: initialValue },
	})

	// Handle search based on mode
	const handleSearch = (searchValue: string) => {
		const trimmed = searchValue.trim()

		if (isUrlMode) {
			// URL mode: update URL params
			const newSearchParams = new URLSearchParams(searchParams.toString())
			if (trimmed) {
				newSearchParams.set(props.paramName, trimmed)
			} else {
				newSearchParams.delete(props.paramName)
			}

			// Reset pagination
			newSearchParams.delete("cursor")
			newSearchParams.delete("direction")

			startTransition(() => {
				router.replace(`?${newSearchParams.toString()}`, { scroll: false })
			})

			// Close keyboard on mobile
			if (typeof window !== "undefined" && window.innerWidth < 768) {
				inputRef.current?.blur()
			}
		} else {
			// Callback mode
			startTransition(() => {
				;(props as CallbackModeProps).onSearch(trimmed)
			})
		}
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (mode === "submit") {
			handleSearch(form.getFieldValue("search"))
		}
	}

	const handleClear = () => {
		form.setFieldValue("search", "")

		if (isUrlMode) {
			handleSearch("")
		} else {
			const callbackProps = props as CallbackModeProps
			callbackProps.onValueChange?.("")
			callbackProps.onClear?.()
		}

		inputRef.current?.focus()
	}

	const handleKeyDown = (e: React.KeyboardEvent, currentValue: string) => {
		if (e.key === "Escape") {
			e.preventDefault()
			if (currentValue) {
				handleClear()
			}
		}
	}

	const handleChange = (value: string) => {
		if (!isUrlMode) {
			;(props as CallbackModeProps).onValueChange?.(value)
		}
	}

	return (
		<form
			role="search"
			onSubmit={handleSubmit}
			className={cn("flex gap-2", className)}
			data-pending={isPending ? "" : undefined}
		>
			<div
				className={cn(
					"relative flex flex-1 items-center overflow-hidden",
					"bg-background border border-input",
					"hover:border-muted-foreground/25",
					"focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/30",
					"transition-all duration-200",
					isPending && "opacity-70",
					styles.container
				)}
			>
				<div
					className={cn(
						"absolute flex items-center text-muted-foreground pointer-events-none",
						styles.iconLeft
					)}
				>
					{isPending && mode === "live" ? (
						<MiniDotsLoader
							size="sm"
							color="primary"
							className="group-hover:text-foreground/70 group-focus-within:text-primary transition-colors duration-150"
						/>
					) : (
						<Search className="h-4 w-4 group-hover:text-foreground/70 group-focus-within:text-primary transition-colors duration-150" />
					)}
				</div>

				<form.AppField
					name="search"
					validators={
						mode === "live"
							? {
									onChangeAsync: async ({ value }) => {
										handleSearch(value)
										return undefined
									},
									onChangeAsyncDebounceMs: debounceMs,
								}
							: undefined
					}
				>
					{(field) => (
						<>
							<Input
								ref={inputRef}
								autoComplete="off"
								autoFocus={autoFocus}
								type="search"
								inputMode="search"
								enterKeyHint="search"
								value={field.state.value}
								onChange={(e) => {
									field.handleChange(e.target.value)
									handleChange(e.target.value)
								}}
								onKeyDown={(e) => handleKeyDown(e, field.state.value)}
								className={cn(
									"border-none shadow-none focus-visible:ring-0",
									"bg-transparent",
									"placeholder:text-muted-foreground/50",
									"transition-all duration-150",
									"[&::-webkit-search-cancel-button]:appearance-none",
									styles.input
								)}
								placeholder={placeholder}
								aria-label={ariaLabel || placeholder}
								aria-describedby="search-status"
							/>

							<AnimatePresence mode="wait">
								{field.state.value && (
									<motion.div
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={{ duration: 0.15 }}
										className="absolute right-0"
									>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={handleClear}
											className={cn(
												"text-muted-foreground hover:text-foreground active:scale-95 transition-all",
												styles.clearButton
											)}
											aria-label="Effacer la recherche"
										>
											<X className={styles.clearIcon} />
										</Button>
									</motion.div>
								)}
							</AnimatePresence>
						</>
					)}
				</form.AppField>
			</div>

			{/* Submit button (only in submit mode) */}
			{mode === "submit" && (
				<form.Subscribe
					selector={(state) => state.values.search}
					children={(search) => (
						<Button
							type="submit"
							disabled={!search?.trim() || isPending}
							className={cn("shrink-0", styles.submitButton)}
							aria-label="Rechercher"
						>
							{isPending ? (
								<Spinner className="size-4" />
							) : (
								<Search className="size-4" />
							)}
						</Button>
					)}
				/>
			)}

			{/* Live region for screen readers */}
			<span
				id="search-status"
				role="status"
				aria-live="polite"
				className="sr-only"
			>
				{isPending ? "Recherche en cours..." : ""}
			</span>
		</form>
	)
}
