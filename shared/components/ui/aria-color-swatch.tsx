"use client"

import {
  ColorSwatch as AriaColorSwatch,
  type ColorSwatchProps,
} from "react-aria-components"
import { composeTailwindRenderProps } from "@/shared/lib/react-aria-utils"

/**
 * ColorSwatch - Composant de prévisualisation de couleur accessible
 *
 * Basé sur React Aria ColorSwatch avec styling Tailwind.
 * Affiche un motif damier pour les couleurs avec transparence.
 *
 * @see https://react-spectrum.adobe.com/react-aria/ColorSwatch.html
 */
export function ColorSwatch(props: ColorSwatchProps) {
  return (
    <AriaColorSwatch
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "size-8 box-border rounded-full border border-border/50"
      )}
      style={({ color }) => ({
        background: `linear-gradient(${color}, ${color}),
          repeating-conic-gradient(#CCC 0% 25%, white 0% 50%) 50% / 16px 16px`,
      })}
    />
  )
}

export type { ColorSwatchProps }
