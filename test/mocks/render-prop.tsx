import * as React from "react";

/**
 * Reproduit le prop `render` de Base UI dans un mock de test.
 *
 * Sémantique alignée sur `useRenderElement` :
 * - l'élément passé à `render` REMPLACE l'élément par défaut ;
 * - ses propres props gagnent sur celles du composant (`mergeProps(props, render.props)`) ;
 * - `children` est une prop comme une autre dans cette fusion.
 *
 * ⚠️ Ne PAS passer `children` en 3ᵉ argument de `cloneElement` : React remplace
 * alors inconditionnellement les enfants, y compris par `undefined`. Un
 * `<TooltipTrigger render={<button>Texte</button>} />` (sans enfants propres)
 * se retrouverait vidé de son libellé, et tous les `getByRole(..., { name })`
 * du fichier échoueraient sans que le composant réel soit en cause.
 *
 * À utiliser dans les `vi.mock()` des composants qui exposent `render`
 * (`Button`, `Item`, `TooltipTrigger`, `DropdownMenuItem`…).
 *
 * @example
 * vi.mock("@/shared/components/ui/button", () => ({
 *   Button: (props: RenderPropMockProps) => renderPropMock("button", props),
 * }));
 */
export type RenderPropMockProps = Record<string, unknown> & {
	render?: React.ReactElement;
	children?: React.ReactNode;
};

export function renderPropMock(
	defaultTag: keyof React.JSX.IntrinsicElements,
	{ render, ...props }: RenderPropMockProps,
) {
	if (React.isValidElement(render)) {
		return React.cloneElement(render, {
			...props,
			...(render.props as Record<string, unknown>),
		});
	}
	return React.createElement(defaultTag, props);
}
