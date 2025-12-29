/**
 * Types pour la navigation (menu, header, footer)
 */

/**
 * Catégories d'items de navigation pour le menu mobile
 */
export type NavCategory = "discovery" | "transaction"

/**
 * Types d'icônes disponibles (mapping côté client)
 */
export type IconName =
	| "home"
	| "gem"
	| "sparkles"
	| "shopping-cart"
	| "user"
	| "folder-open"
	| "heart"
	| "log-in"
	| "info"
	| "layout-dashboard"

/**
 * Item enfant de navigation (sous-menu)
 */
export type NavItemChild = {
	href: string
	label: string
	badge?: string | number
	icon?: IconName
	description?: string | null
	imageUrl?: string | null
	blurDataUrl?: string | null
}

/**
 * Item de navigation avec enfants possibles
 */
export type NavItemWithChildren = {
	href: string
	label: string
	children?: NavItemChild[]
	icon?: IconName
	/**
	 * Pour desktop: si true, affiche un dropdown au hover
	 * Pour mobile: si true, affiche un collapsible
	 */
	hasDropdown?: boolean
}

/**
 * Item de navigation simple
 */
export type NavItem = {
	href: string
	label: string
	icon?: IconName
}
