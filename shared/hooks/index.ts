// Device detection hooks
// (`useIsTouchDevice` n'est pas ré-exporté ici : ses ~11 consommateurs l'importent
// tous directement depuis `@/shared/hooks/use-touch-device`.)
export { useMediaQuery } from "./use-media-query";

// State & Effects hooks
export { useBottomBarHeight } from "./use-bottom-bar-height";
export { useToolbarDrawer } from "./use-toolbar-drawer";
export { useActiveListControls } from "./use-active-list-controls";

// Modal/Lightbox hooks
export { useLightbox } from "./use-lightbox";
