import { useEffect, useRef, useState } from "react"

import { FOCUSABLE_SELECTOR } from "./constants"

export function useKeyboardNavigation() {
	const [activeIndex, setActiveIndex] = useState(-1)
	const contentRef = useRef<HTMLDivElement>(null)

	// Sync data-active attribute on focusable elements
	useEffect(() => {
		const container = contentRef.current
		if (!container) return

		const focusables = Array.from(
			container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
		)

		for (let i = 0; i < focusables.length; i++) {
			focusables[i].dataset.qsNavId = String(i)
			// Only assign id if none exists to avoid overwriting semantic IDs
			if (!focusables[i].id) {
				focusables[i].id = `qs-nav-${i}`
			}
			if (i === activeIndex) {
				focusables[i].setAttribute("data-active", "true")
				focusables[i].setAttribute("aria-current", "true")
			} else {
				focusables[i].removeAttribute("data-active")
				focusables[i].removeAttribute("aria-current")
			}
		}
	}, [activeIndex])

	// Delegated mouseenter handler — works for all focusable elements
	// including those rendered in the parallel route slot (X4 fix)
	useEffect(() => {
		const container = contentRef.current
		if (!container) return

		const handleMouseOver = (e: MouseEvent) => {
			const target = (e.target as HTMLElement).closest<HTMLElement>(FOCUSABLE_SELECTOR)
			if (!target || !container.contains(target)) return

			const focusables = Array.from(
				container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
			)
			const index = focusables.indexOf(target)
			if (index !== -1) {
				setActiveIndex(index)
			}
		}

		container.addEventListener("mouseover", handleMouseOver)
		return () => container.removeEventListener("mouseover", handleMouseOver)
	}, [])

	const getFocusableElements = () => {
		const container = contentRef.current
		if (!container) return []
		return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
	}

	const focusFirst = () => {
		setActiveIndex(0)
		const firstFocusable = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
		firstFocusable?.scrollIntoView({ block: "nearest" })
	}

	const handleArrowNavigation = (e: React.KeyboardEvent<HTMLDivElement>) => {
		const focusables = getFocusableElements()
		if (focusables.length === 0) return

		let nextIndex: number | null = null

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault()
				nextIndex = activeIndex < focusables.length - 1 ? activeIndex + 1 : 0
				break
			case "ArrowUp":
				e.preventDefault()
				nextIndex = activeIndex > 0 ? activeIndex - 1 : focusables.length - 1
				break
			case "Home":
				e.preventDefault()
				nextIndex = 0
				break
			case "End":
				e.preventDefault()
				nextIndex = focusables.length - 1
				break
			case "Enter":
				if (activeIndex >= 0 && focusables[activeIndex]) {
					e.preventDefault()
					focusables[activeIndex].click()
					return
				}
				break
		}

		if (nextIndex !== null) {
			setActiveIndex(nextIndex)
			focusables[nextIndex]?.scrollIntoView({ block: "nearest" })
		}
	}

	const resetActiveIndex = () => setActiveIndex(-1)

	const activeDescendantId = (() => {
		if (activeIndex < 0) return undefined
		const el = contentRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)[activeIndex]
		return el?.id || `qs-nav-${activeIndex}`
	})()

	return {
		contentRef,
		handleArrowNavigation,
		focusFirst,
		resetActiveIndex,
		activeDescendantId,
	}
}
