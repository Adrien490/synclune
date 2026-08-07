/**
 * Types centralisés pour les stores Zustand
 * Consolide tous les types de stores et providers
 */

import type { ReactNode } from "react";

// =============================================================================
// SHEET STORE TYPES
// =============================================================================

/**
 * Identifiants des sheets coordonnés par le SheetStore (un seul ouvert à la fois).
 *
 * Ajouter un identifiant ici lorsqu'un sheet doit participer à la coordination
 * globale (ex: fermer le panier quand on ouvre les filtres). Les sheets isolés
 * qui n'ont pas besoin de cette coordination (menu nav, filter-sheet per-page)
 * peuvent gérer leur propre état via Vaul directement.
 */
export type SheetId = "cart" | "menu" | "filters" | "search" | "sort" | "filter";

export type SheetState = {
	openSheet: SheetId | null;
};

type SheetActions = {
	open: (sheetId: SheetId) => void;
	close: () => void;
	toggle: (sheetId: SheetId) => void;
	isOpen: (sheetId: SheetId) => boolean;
};

export type SheetStore = SheetState & SheetActions;

// =============================================================================
// DIALOG STORE TYPES
// =============================================================================

/**
 * Type pour les données contextuelles d'un Dialog
 * Peut être étendu selon les besoins
 */
export type DialogData = {
	[key: string]: unknown;
};

export type DialogState = {
	dialogs: Record<string, { isOpen: boolean; data?: DialogData }>;
};

type DialogActions = {
	openDialog: (dialogId: string, data?: DialogData) => void;
	closeDialog: (dialogId: string) => void;
	toggleDialog: (dialogId: string) => void;
	isDialogOpen: (dialogId: string) => boolean;
	getDialogData: <T extends DialogData = DialogData>(dialogId: string) => T | undefined;
	clearDialogData: (dialogId: string) => void;
};

export type DialogStore = DialogState & DialogActions;

// =============================================================================
// ALERT DIALOG STORE TYPES
// =============================================================================

/**
 * Type pour les données contextuelles d'un AlertDialog
 * Peut être étendu selon les besoins (ex: itemId, itemName, etc.)
 */
export type AlertDialogData = {
	itemId?: string;
	itemName?: string;
	[key: string]: unknown;
};

export type AlertDialogState = {
	alertDialogs: Record<string, { isOpen: boolean; data?: AlertDialogData }>;
};

type AlertDialogActions = {
	openAlertDialog: (dialogId: string, data?: AlertDialogData) => void;
	closeAlertDialog: (dialogId: string) => void;
	isAlertDialogOpen: (dialogId: string) => boolean;
	getAlertDialogData: <T extends AlertDialogData = AlertDialogData>(
		dialogId: string,
	) => T | undefined;
	clearAlertDialogData: (dialogId: string) => void;
};

export type AlertDialogStore = AlertDialogState & AlertDialogActions;

// =============================================================================
// COOKIE CONSENT STORE TYPES
// =============================================================================

/**
 * État du store - simplifié à accepter/refuser
 */
export interface CookieConsentState {
	// true = cookies acceptés, false = refusés, null = pas encore choisi
	accepted: boolean | null;
	// Banner affiché ou non
	bannerVisible: boolean;
	// Date du consentement
	consentDate: string | null;
	// Version de la politique (pour forcer re-consentement si maj)
	policyVersion: number;
	// Indique si le store a été hydraté depuis localStorage
	_hasHydrated: boolean;
}

/**
 * Actions disponibles
 */
interface CookieConsentActions {
	// Accepter les cookies
	acceptCookies: () => void;
	// Refuser les cookies
	rejectCookies: () => void;
	// Afficher le banner
	showBanner: () => void;
	// Masquer le banner
	hideBanner: () => void;
	// Réinitialiser (pour révocation)
	resetConsent: () => void;
}

export type CookieConsentStore = CookieConsentState & CookieConsentActions;

// =============================================================================
// BADGE COUNTS STORE TYPES
// =============================================================================

/**
 * Bump descriptor — pulse temporaire publié à chaque mutation optimistic.
 * `key` est un timestamp/séquence qui change à chaque mutation pour forcer
 * le remount des animations consumer-side ; `delta` est utilisé par le flash
 * "+N" qui flotte au-dessus du badge.
 */
interface BadgeBump {
	delta: number;
	key: number;
}

interface BadgeCountsState {
	wishlistCount: number;
	cartCount: number;
	// Pas de `wishlistBump` : le badge favoris est un point (dot), sans flash "+N"
	cartBump: BadgeBump | null;
}

interface BadgeCountsActions {
	setWishlistCount: (count: number) => void;
	setCartCount: (count: number) => void;
	incrementWishlist: () => void;
	decrementWishlist: () => void;
	adjustCart: (delta: number) => void;
	reset: () => void;
}

export type BadgeCountsStore = BadgeCountsState & BadgeCountsActions;

// =============================================================================
// OVERLAY STACK STORE TYPES
// =============================================================================

interface OverlayStackState {
	count: number;
}

interface OverlayStackActions {
	push: () => void;
	pop: () => void;
}

export type OverlayStackStore = OverlayStackState & OverlayStackActions;

// =============================================================================
// PROVIDER TYPES
// =============================================================================

/*
 * ⚠️ `SheetStoreProviderProps`, `DialogStoreProviderProps` et
 * `AlertDialogStoreProviderProps` ont été retirés le 2026-08-07 : leurs trois
 * providers ont fusionné dans `overlay-store-provider.tsx`, qui déclare son
 * `{ children }` en ligne. Trois interfaces identiques d'un champ chacune, pour
 * trois composants qui n'en font plus qu'un.
 */

export interface CookieConsentStoreProviderProps {
	children: ReactNode;
}

export interface BadgeCountsStoreProviderProps {
	initialWishlistCount: number;
	initialCartCount: number;
	children: ReactNode;
}
