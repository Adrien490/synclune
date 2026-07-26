"use client";

import { createContext, use } from "react";

/**
 * Ferme le menu sheet lors d'un tap sur une entrée de navigation.
 *
 * ⚠️ **Ne JAMAIS remplacer un appel à ce handler par `<SheetClose asChild>`
 * autour d'un `<Link>`.** Ce chemin annule la navigation :
 *
 * `SheetClose` → `Vaul.onOpenChange(false)` → `wrappedOnOpenChange`
 * (`shared/components/ui/sheet.tsx`) → `useBackButtonClose.handleClose()` →
 * `history.back()` **synchrone**. Or le Slot Radix fait atterrir le `onClick` de
 * `SheetClose` sur le `<Link>`, et Next l'invoque AVANT `linkClicked` : au moment
 * du `handleClose`, le `router.push` n'a pas encore empilé son entrée, donc la
 * garde `isTopOfHistory` conclut « je suis au sommet » et recule. Le `back()`
 * race alors le `push` et l'utilisateur reste sur la même page, sans erreur.
 *
 * C'est exactement le bug verrouillé par
 * `shared/components/responsive-action-menu/__tests__/link-history-back.regression.test.tsx`
 * (2026-05-15). La garde `history.length` de `use-back-button-close` couvre le cas
 * « un push a eu lieu PENDANT l'ouverture » (filtre, tri) — pas celui-ci, où le
 * push est queué dans le même clic, après la fermeture. Fermer par la prop
 * contrôlée court-circuite `onOpenChange`, donc `history.back()` n'est jamais
 * appelé.
 *
 * Corollaire : les liens du menu naviguent en `replace`. L'entrée poussée à
 * l'ouverture du sheet porte la même URL que la page ; la consommer plutôt que
 * d'empiler par-dessus évite une pression de retour morte par cycle
 * ouvrir → naviguer (cumulative — c'est le défaut n°1 corrigé par l'audit
 * « Overlays » du 2026-07-26). Résultat : Accueil → Bagues → Colliers produit
 * l'historique `[Accueil, Bagues, Colliers]`, et non
 * `[Accueil, Accueil′, Bagues, Bagues′, Colliers]`.
 */
const MenuSheetNavigateContext = createContext<() => void>(() => {});

export const MenuSheetNavigateProvider = MenuSheetNavigateContext.Provider;

/**
 * Handler à brancher sur le `onClick` de chaque `<Link>` du menu sheet.
 * Déclenche l'haptique puis ferme le sheet via la prop contrôlée.
 */
export function useMenuSheetNavigate(): () => void {
	return use(MenuSheetNavigateContext);
}
