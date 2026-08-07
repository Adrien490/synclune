"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Titre de la page de détail courante, publié par la page et consommé par le
 * chrome de navigation (header mobile + dernier segment du fil d'Ariane).
 *
 * **Pourquoi.** `generateBreadcrumbs()` dérive ses libellés du pathname : pour un
 * segment dynamique introuvable dans `navigationData`, il Title-Case le slug. Sur
 * les 5 ressources à id opaque (commandes, clients, remboursements, promos,
 * variantes) cela produisait « Cm5abc123xyz » — affiché comme titre de page sur
 * mobile ET comme dernier segment du fil d'Ariane desktop. La page, elle, connaît
 * le vrai libellé (« Commande #1042 ») : c'est elle qui doit le publier.
 *
 * Le fallback reste le breadcrumb, donc une page qui ne publie rien garde le
 * comportement actuel — l'adoption est incrémentale, ressource par ressource.
 */
interface AdminPageTitleValue {
	/** Titre publié par la page courante, ou `null` → fallback breadcrumb. */
	title: string | null;
	setTitle: (title: string | null) => void;
}

const AdminPageTitleContext = createContext<AdminPageTitleValue | null>(null);

export function AdminPageTitleProvider({ children }: { children: React.ReactNode }) {
	const [title, setTitle] = useState<string | null>(null);

	return <AdminPageTitleContext value={{ title, setTitle }}>{children}</AdminPageTitleContext>;
}

/** Lecture côté chrome (header mobile, fil d'Ariane). */
export function useAdminPageTitle(): string | null {
	return useContext(AdminPageTitleContext)?.title ?? null;
}

/**
 * Publication côté page de détail. À appeler avec le libellé humain de la
 * ressource ; le nettoyage au démontage remet le fallback breadcrumb en place
 * (sinon le titre d'une fiche survivrait à la navigation vers une liste).
 *
 * Sans provider (rendu isolé, tests unitaires d'un header), c'est un no-op.
 */
export function useSetAdminPageTitle(title: string | null | undefined) {
	const ctx = useContext(AdminPageTitleContext);
	const setTitle = ctx?.setTitle;

	useEffect(() => {
		if (!setTitle) return;
		setTitle(title ?? null);
		return () => setTitle(null);
	}, [setTitle, title]);
}
