/**
 * Types centralisés pour les stores Zustand
 * Consolide tous les types de stores et providers
 */

import type { ReactNode } from "react"

// =============================================================================
// SHEET STORE TYPES
// =============================================================================

/**
 * Identifiants des sheets disponibles
 * Extensible pour futurs sheets
 */
export type SheetId = "cart"

export type SheetState = {
	openSheet: SheetId | null
}

export type SheetActions = {
	open: (sheetId: SheetId) => void
	close: () => void
	toggle: (sheetId: SheetId) => void
	isOpen: (sheetId: SheetId) => boolean
}

export type SheetStore = SheetState & SheetActions

// =============================================================================
// DIALOG STORE TYPES
// =============================================================================

/**
 * Type pour les données contextuelles d'un Dialog
 * Peut être étendu selon les besoins
 */
export type DialogData = {
	[key: string]: unknown
}

export type DialogState = {
	dialogs: Record<string, { isOpen: boolean; data?: DialogData }>
}

export type DialogActions = {
	openDialog: (dialogId: string, data?: DialogData) => void
	closeDialog: (dialogId: string) => void
	toggleDialog: (dialogId: string) => void
	isDialogOpen: (dialogId: string) => boolean
	getDialogData: <T extends DialogData = DialogData>(
		dialogId: string
	) => T | undefined
	clearDialogData: (dialogId: string) => void
}

export type DialogStore = DialogState & DialogActions

// =============================================================================
// ALERT DIALOG STORE TYPES
// =============================================================================

/**
 * Type pour les données contextuelles d'un AlertDialog
 * Peut être étendu selon les besoins (ex: itemId, itemName, etc.)
 */
export type AlertDialogData = {
	itemId?: string
	itemName?: string
	action?: () => void | Promise<void>
	[key: string]: unknown
}

export type AlertDialogState = {
	alertDialogs: Record<string, { isOpen: boolean; data?: AlertDialogData }>
}

export type AlertDialogActions = {
	openAlertDialog: (dialogId: string, data?: AlertDialogData) => void
	closeAlertDialog: (dialogId: string) => void
	isAlertDialogOpen: (dialogId: string) => boolean
	getAlertDialogData: <T extends AlertDialogData = AlertDialogData>(
		dialogId: string
	) => T | undefined
	clearAlertDialogData: (dialogId: string) => void
}

export type AlertDialogStore = AlertDialogState & AlertDialogActions

// =============================================================================
// COOKIE CONSENT STORE TYPES
// =============================================================================

/**
 * État du store - simplifié à accepter/refuser
 */
export interface CookieConsentState {
	// true = cookies acceptés, false = refusés, null = pas encore choisi
	accepted: boolean | null
	// Banner affiché ou non
	bannerVisible: boolean
	// Date du consentement
	consentDate: string | null
	// Version de la politique (pour forcer re-consentement si maj)
	policyVersion: number
	// Indique si le store a été hydraté depuis localStorage
	_hasHydrated: boolean
}

/**
 * Actions disponibles
 */
export interface CookieConsentActions {
	// Accepter les cookies
	acceptCookies: () => void
	// Refuser les cookies
	rejectCookies: () => void
	// Afficher le banner
	showBanner: () => void
	// Masquer le banner
	hideBanner: () => void
	// Réinitialiser (pour révocation)
	resetConsent: () => void
}

export type CookieConsentStore = CookieConsentState & CookieConsentActions

// =============================================================================
// PROVIDER TYPES
// =============================================================================

export interface SheetStoreProviderProps {
	children: ReactNode
}

export interface DialogStoreProviderProps {
	children: ReactNode
}

export interface AlertDialogStoreProviderProps {
	children: ReactNode
}

export interface CookieConsentStoreProviderProps {
	children: ReactNode
}

// =============================================================================
// INSTALL PROMPT STORE TYPES
// =============================================================================

export interface InstallPromptState {
	visitCount: number
	dismissCount: number
	permanentlyDismissed: boolean
	bannerVisible: boolean
	_hasHydrated: boolean
}

export interface InstallPromptActions {
	recordVisit: () => void
	dismissForSession: () => void
	markInstalled: () => void
	showBanner: () => void
	hideBanner: () => void
}

export type InstallPromptStore = InstallPromptState & InstallPromptActions

export interface InstallPromptStoreProviderProps {
	children: ReactNode
}
