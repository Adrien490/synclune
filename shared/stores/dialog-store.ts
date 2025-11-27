import { createStore } from "zustand/vanilla";

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

export type DialogActions = {
	openDialog: (dialogId: string, data?: DialogData) => void;
	closeDialog: (dialogId: string) => void;
	toggleDialog: (dialogId: string) => void;
	isDialogOpen: (dialogId: string) => boolean;
	getDialogData: <T extends DialogData = DialogData>(
		dialogId: string
	) => T | undefined;
	clearDialogData: (dialogId: string) => void;
};

export type DialogStore = DialogState & DialogActions;

export const defaultInitState: DialogState = {
	dialogs: {},
};

export const createDialogStore = (
	initState: DialogState = defaultInitState
) => {
	return createStore<DialogStore>()((set, get) => ({
		...initState,
		openDialog: (dialogId: string, data?: DialogData) =>
			set((state) => ({
				dialogs: {
					...state.dialogs,
					[dialogId]: { isOpen: true, data },
				},
			})),
		closeDialog: (dialogId: string) =>
			set((state) => ({
				dialogs: {
					...state.dialogs,
					[dialogId]: { ...state.dialogs[dialogId], isOpen: false },
				},
			})),
		toggleDialog: (dialogId: string) =>
			set((state) => ({
				dialogs: {
					...state.dialogs,
					[dialogId]: {
						isOpen: !state.dialogs[dialogId]?.isOpen,
						data: state.dialogs[dialogId]?.data,
					},
				},
			})),
		isDialogOpen: (dialogId: string) => {
			return get().dialogs[dialogId]?.isOpen ?? false;
		},
		getDialogData: <T extends DialogData = DialogData>(
			dialogId: string
		): T | undefined => {
			return get().dialogs[dialogId]?.data as T | undefined;
		},
		clearDialogData: (dialogId: string) =>
			set((state) => ({
				dialogs: {
					...state.dialogs,
					[dialogId]: { isOpen: false, data: undefined },
				},
			})),
	}));
};
