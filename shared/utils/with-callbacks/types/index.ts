// Type pour les callbacks utilisés dans withCallbacks
export type Callbacks<T, R = unknown> = {
	onStart?: () => R;
	onEnd?: (reference: R) => void;
	onSuccess?: (result: T) => void;
	onError?: (result: T) => void;
};
