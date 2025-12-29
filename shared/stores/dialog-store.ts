import { createStore } from "zustand/vanilla"

import type {
	DialogData,
	DialogState,
	DialogStore,
} from "@/shared/types/store.types"

export type { DialogData, DialogState, DialogActions, DialogStore } from "@/shared/types/store.types"

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
