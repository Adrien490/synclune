import { createStore } from "zustand/vanilla";

/**
 * Type pour les données contextuelles d'un AlertDialog
 * Peut être étendu selon les besoins (ex: itemId, itemName, etc.)
 */
export type AlertDialogData = {
	itemId?: string;
	itemName?: string;
	action?: () => void | Promise<void>;
	[key: string]: unknown;
};

export type AlertDialogState = {
	alertDialogs: Record<string, { isOpen: boolean; data?: AlertDialogData }>;
};

export type AlertDialogActions = {
	openAlertDialog: (dialogId: string, data?: AlertDialogData) => void;
	closeAlertDialog: (dialogId: string) => void;
	isAlertDialogOpen: (dialogId: string) => boolean;
	getAlertDialogData: <T extends AlertDialogData = AlertDialogData>(
		dialogId: string,
	) => T | undefined;
	clearAlertDialogData: (dialogId: string) => void;
};

export type AlertDialogStore = AlertDialogState & AlertDialogActions;

export const defaultInitState: AlertDialogState = {
	alertDialogs: {},
};

export const createAlertDialogStore = (
	initState: AlertDialogState = defaultInitState,
) => {
	return createStore<AlertDialogStore>()((set, get) => ({
		...initState,
		openAlertDialog: (dialogId: string, data?: AlertDialogData) =>
			set((state) => ({
				alertDialogs: {
					...state.alertDialogs,
					[dialogId]: { isOpen: true, data },
				},
			})),
		closeAlertDialog: (dialogId: string) =>
			set((state) => ({
				alertDialogs: {
					...state.alertDialogs,
					[dialogId]: { ...state.alertDialogs[dialogId], isOpen: false },
				},
			})),
		isAlertDialogOpen: (dialogId: string) => {
			return get().alertDialogs[dialogId]?.isOpen ?? false;
		},
		getAlertDialogData: <T extends AlertDialogData = AlertDialogData>(
			dialogId: string,
		): T | undefined => {
			return get().alertDialogs[dialogId]?.data as T | undefined;
		},
		clearAlertDialogData: (dialogId: string) =>
			set((state) => ({
				alertDialogs: {
					...state.alertDialogs,
					[dialogId]: { isOpen: false, data: undefined },
				},
			})),
	}));
};
