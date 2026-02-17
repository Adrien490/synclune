"use client"

import { useInstallPromptStore } from "@/shared/providers/install-prompt-store-provider"
import {
	useCookieConsentStore,
	useHasConsented,
} from "@/shared/providers/cookie-consent-store-provider"
import { Button } from "./ui/button"
import { Logo } from "./logo"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { FocusScope } from "@radix-ui/react-focus-scope"
import { useEffect, useRef, useState } from "react"
import type { BeforeInstallPromptEvent } from "@/shared/types/pwa.types"

/**
 * PWA install prompt banner — bottom-left, cookie-banner style.
 *
 * Shows after the 2nd visit, once the cookie banner is resolved.
 * Supports native install prompt (Chrome/Edge) and iOS manual instructions.
 * Permanently dismissed after 3 "Plus tard" clicks.
 *
 * Accessibility:
 * - Focus trap + auto-focus on primary button
 * - Escape key dismisses
 * - Respects prefers-reduced-motion
 * - Safe area for iOS bottom bar
 */
export function InstallPromptBanner() {
	const bannerVisible = useInstallPromptStore((s) => s.bannerVisible)
	const _hasHydrated = useInstallPromptStore((s) => s._hasHydrated)
	const dismissForSession = useInstallPromptStore((s) => s.dismissForSession)
	const markInstalled = useInstallPromptStore((s) => s.markInstalled)

	const cookieBannerVisible = useCookieConsentStore((s) => s.bannerVisible)
	const hasConsented = useHasConsented()

	const shouldReduceMotion = useReducedMotion()
	const installButtonRef = useRef<HTMLButtonElement>(null)

	const [deferredPrompt, setDeferredPrompt] =
		useState<BeforeInstallPromptEvent | null>(null)
	const [isStandalone, setIsStandalone] = useState(false)
	const [isIOS, setIsIOS] = useState(false)

	// Detect standalone mode and iOS
	useEffect(() => {
		const standalone =
			window.matchMedia("(display-mode: standalone)").matches ||
			("standalone" in navigator &&
				(navigator as unknown as { standalone: boolean }).standalone)
		setIsStandalone(!!standalone)

		const ua = navigator.userAgent
		setIsIOS(/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window))
	}, [])

	// Listen for beforeinstallprompt event
	useEffect(() => {
		const handler = (e: BeforeInstallPromptEvent) => {
			e.preventDefault()
			setDeferredPrompt(e)
		}

		window.addEventListener("beforeinstallprompt", handler)
		return () => window.removeEventListener("beforeinstallprompt", handler)
	}, [])

	// Listen for appinstalled event
	useEffect(() => {
		const handler = () => {
			markInstalled()
			setDeferredPrompt(null)
		}

		window.addEventListener("appinstalled", handler)
		return () => window.removeEventListener("appinstalled", handler)
	}, [markInstalled])

	// Cookie banner must be resolved before showing install prompt
	const cookieBannerResolved = hasConsented || !cookieBannerVisible

	const shouldShow =
		_hasHydrated &&
		bannerVisible &&
		!isStandalone &&
		cookieBannerResolved &&
		(deferredPrompt !== null || isIOS)

	// Focus on install button after animation
	useEffect(() => {
		if (shouldShow && installButtonRef.current) {
			const timer = setTimeout(
				() => installButtonRef.current?.focus(),
				shouldReduceMotion ? 0 : 300
			)
			return () => clearTimeout(timer)
		}
	}, [shouldShow, shouldReduceMotion])

	// Escape key dismisses
	useEffect(() => {
		if (!shouldShow) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				dismissForSession()
			}
		}

		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [shouldShow, dismissForSession])

	async function handleInstall() {
		if (!deferredPrompt) return
		await deferredPrompt.prompt()
		const { outcome } = await deferredPrompt.userChoice
		if (outcome === "accepted") {
			markInstalled()
		}
		setDeferredPrompt(null)
	}

	if (!_hasHydrated) {
		return null
	}

	return (
		<AnimatePresence>
			{shouldShow && (
				<motion.div
					initial={
						shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }
					}
					animate={{ opacity: 1, y: 0 }}
					exit={
						shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }
					}
					transition={{
						duration: shouldReduceMotion ? 0 : 0.3,
						ease: "easeOut",
					}}
					className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 md:bottom-6 md:left-6 md:right-auto z-50 w-auto max-w-[calc(100vw-2rem)] md:max-w-md"
					role="region"
					aria-label="Installer l'application"
					aria-describedby="install-description"
					aria-live="polite"
				>
					<FocusScope trapped loop>
						<div className="bg-background/95 backdrop-blur-md border border-primary/15 shadow-lg rounded-xl p-4 md:p-6 space-y-3 md:space-y-4">
							<div className="flex items-center gap-3">
								<Logo size={32} rounded="lg" />
								<p className="text-base font-semibold text-foreground">
									Installer Synclune
								</p>
							</div>

							{isIOS ? (
								<p id="install-description" className="text-sm text-muted-foreground leading-relaxed">
									Appuyez sur{" "}
									<span className="inline-flex items-center">
										<svg
											className="inline-block size-4 align-text-bottom mx-0.5"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth={2}
											strokeLinecap="round"
											strokeLinejoin="round"
											aria-hidden="true"
										>
											<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
											<polyline points="16 6 12 2 8 6" />
											<line x1="12" y1="2" x2="12" y2="15" />
										</svg>
										<span className="sr-only">Partager</span>
									</span>{" "}
									puis <strong>Sur l&apos;écran d&apos;accueil</strong> pour
									installer l&apos;application.
								</p>
							) : (
								<p id="install-description" className="text-sm text-muted-foreground leading-relaxed">
									Accédez à vos bijoux préférés directement depuis votre écran
									d&apos;accueil, même hors ligne.
								</p>
							)}

							<div className="flex gap-2">
								{isIOS ? (
									<Button
										ref={installButtonRef}
										onClick={dismissForSession}
										variant="default"
										size="sm"
										className="flex-1 min-h-11"
									>
										Compris
									</Button>
								) : (
									<>
										<Button
											ref={installButtonRef}
											onClick={handleInstall}
											variant="default"
											size="sm"
											className="flex-1 min-h-11"
										>
											Installer
										</Button>
										<Button
											onClick={dismissForSession}
											variant="secondary"
											size="sm"
											className="flex-1 min-h-11"
											aria-label="Installer plus tard"
										>
											Plus tard
										</Button>
									</>
								)}
							</div>
						</div>
					</FocusScope>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
