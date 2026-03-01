interface EyeDropperOpenResult {
	sRGBHex: string;
}

interface EyeDropper {
	open(): Promise<EyeDropperOpenResult>;
}

declare let EyeDropper: {
	prototype: EyeDropper;
	new (): EyeDropper;
};
