"use client"

import { useRef, useTransition } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Search, X } from "lucide-react"

import { useAppForm } from "@/shared/components/forms"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Spinner } from "@/shared/components/ui/spinner"
import { cn } from "@/shared/utils/cn"

interface SearchInputProps {
	/** Current search value */
	value?: string
	/** Callback when search is submitted (submit mode) or changed (live mode) */
	onSearch: (value: string) => void
	/** Placeholder text */
	placeholder?: string
	/** Search mode: submit requires button click, live updates on change with debounce */
	mode?: "submit" | "live"
	/** Debounce delay in ms for live mode */
	debounceMs?: number
	/** Show external pending state */
	isPending?: boolean
	/** Auto focus input on mount */
	autoFocus?: boolean
	/** Additional class for the container */
	className?: string
	/** Callback when input value changes (for controlled behavior) */
	onValueChange?: (value: string) => void
	/** Callback when clear button is clicked */
	onClear?: () => void
}

/**
 * Reusable search input component.
 * - Submit mode: shows submit button, requires explicit submission
 * - Live mode: updates on change with debounce
 */
export function SearchInput({
	value = "",
	onSearch,
	placeholder = "Rechercher...",
	mode = "submit",
	debounceMs = 300,
	isPending: externalPending = false,
	autoFocus = false,
	className,
	onValueChange,
	onClear,
}: SearchInputProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	const [internalPending, startTransition] = useTransition()
	const isPending = externalPending || internalPending

	const form = useAppForm({
		defaultValues: { search: value },
	})

	const handleSearch = (searchValue: string) => {
		const trimmed = searchValue.trim()
		startTransition(() => {
			onSearch(trimmed)
		})
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (mode === "submit") {
			handleSearch(form.getFieldValue("search"))
		}
	}

	const handleClear = () => {
		form.setFieldValue("search", "")
		onValueChange?.("")
		onClear?.()
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

	return (
		<form
			role="search"
			onSubmit={handleSubmit}
			className={cn("flex gap-2", className)}
		>
			<div
				className={cn(
					"relative flex flex-1 items-center h-12",
					"rounded-xl overflow-hidden",
					"bg-muted/50 border border-input",
					"focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
					"transition-all duration-200",
					isPending && "opacity-70"
				)}
			>
				<div className="absolute left-4 flex items-center text-muted-foreground pointer-events-none">
					<Search className="h-4 w-4" />
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
									onValueChange?.(e.target.value)
								}}
								onKeyDown={(e) => handleKeyDown(e, field.state.value)}
								className={cn(
									"pl-12 pr-12",
									"h-12",
									"text-base",
									"border-none shadow-none focus-visible:ring-0",
									"bg-transparent",
									"placeholder:text-muted-foreground/60",
									"[&::-webkit-search-cancel-button]:appearance-none"
								)}
								placeholder={placeholder}
								aria-label={placeholder}
							/>

							<AnimatePresence mode="wait">
								{field.state.value && (
									<motion.div
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={{ duration: 0.15 }}
										className="absolute right-1"
									>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={handleClear}
											className="size-10 text-muted-foreground hover:text-foreground"
											aria-label="Effacer"
										>
											<X className="size-5" />
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
							className="shrink-0 size-12 rounded-xl"
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
		</form>
	)
}
