/**
 * Validation des XML facturation électronique produits par `renderFacturX*` /
 * `renderUbl*`.
 *
 * Deux niveaux de validation :
 *
 *  1. **Structural** (synchrone, zéro dépendance) — vérifie la conformité
 *     "boite à fusibles" :
 *      - root element + namespaces requis présents,
 *      - balises BT obligatoires (BT-1 invoiceNumber, BT-2 issueDate,
 *        BT-5 currency, …) présentes et non vides,
 *      - bloc seller / buyer minimalement renseignés.
 *     C'est ce qu'utilisent les tests + le hook par défaut avant transmission.
 *
 *  2. **XSD** (async via `xmllint-wasm`) — validation complète contre les
 *     schémas officiels CII UN/CEFACT D16B / UBL 2.1 / Factur-X 1.0.07. Lourd
 *     (~2 MB wasm + tree XSD officiels). À activer juste avant transmission à
 *     une PDP : `await validateAgainstXsd(xml, xsdFiles)`. Les XSD ne sont
 *     PAS embarqués dans le repo — l'appelant fournit le bundle officiel
 *     (download manuel depuis fnfe-mpe.org / docs.peppol.eu, une fois).
 *
 * Cf. audit conformité 2026-05-28 — EINV-FORMAT-002.
 */

export interface ValidationError {
	code: string;
	message: string;
	location?: string;
}

export type ValidationResult = { ok: true } | { ok: false; errors: ValidationError[] };

interface StructuralExpectations {
	/** Nom de l'élément racine attendu (avec préfixe namespace si applicable). */
	rootElement: string;
	/** URIs de namespace qui doivent apparaître dans la déclaration root. */
	requiredNamespaces: string[];
	/** Balises XML qui DOIVENT apparaître avec un contenu non-vide. */
	requiredTags: string[];
}

// ============================================================================
// Validation structurelle (synchrone, sans dépendance)
// ============================================================================

export function validateXmlStructure(
	xml: string,
	expectations: StructuralExpectations,
): ValidationResult {
	const errors: ValidationError[] = [];

	if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
		errors.push({
			code: "STRUCT-001",
			message: "Déclaration XML manquante ou encoding non UTF-8",
		});
	}

	if (!xml.includes(`<${expectations.rootElement}`)) {
		errors.push({
			code: "STRUCT-002",
			message: `Élément racine attendu <${expectations.rootElement}> introuvable`,
		});
	}

	for (const ns of expectations.requiredNamespaces) {
		if (!xml.includes(`"${ns}"`)) {
			errors.push({
				code: "STRUCT-003",
				message: `Namespace requis manquant : ${ns}`,
			});
		}
	}

	for (const tag of expectations.requiredTags) {
		// Match <tag>X</tag> ou <tag attr="...">X</tag> avec X non vide.
		const openPattern = new RegExp(
			`<${escapeRegex(tag)}(\\s[^>]*)?>([^<]*?)</${escapeRegex(tag)}>`,
		);
		const match = xml.match(openPattern);
		if (!match || !match[2]?.trim()) {
			errors.push({
				code: "STRUCT-004",
				message: `Balise obligatoire manquante ou vide : <${tag}>`,
				location: tag,
			});
		}
	}

	return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// Helpers spécialisés par format
// ============================================================================

export function validateFacturXMinimumStructure(xml: string): ValidationResult {
	return validateXmlStructure(xml, {
		rootElement: "rsm:CrossIndustryInvoice",
		requiredNamespaces: [
			"urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100",
			"urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100",
		],
		requiredTags: [
			"ram:ID", // BT-1 (premier match = invoice number)
			"ram:TypeCode", // BT-3
			"udt:DateTimeString", // BT-2
			"ram:InvoiceCurrencyCode", // BT-5
			"ram:Name", // seller name
			"ram:TaxBasisTotalAmount", // BT-109
			"ram:GrandTotalAmount", // BT-112
		],
	});
}

export function validateFacturXBasicStructure(xml: string): ValidationResult {
	const base = validateFacturXMinimumStructure(xml);
	const errors: ValidationError[] = base.ok ? [] : [...base.errors];

	// BASIC ajoute lignes + breakdown TVA header
	if (!xml.includes("<ram:IncludedSupplyChainTradeLineItem>")) {
		errors.push({
			code: "BASIC-001",
			message: "Profil BASIC : au moins une ligne (BG-25) requise",
		});
	}
	if (!xml.includes("urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic")) {
		errors.push({
			code: "BASIC-002",
			message: "Profil BASIC : BT-24 GuidelineSpecifiedDocumentContextParameter incorrect",
		});
	}
	if (!xml.includes("<ram:LineTotalAmount>")) {
		errors.push({
			code: "BASIC-003",
			message: "Profil BASIC : BT-131/BT-106 LineTotalAmount manquant",
		});
	}

	return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function validateUblStructure(xml: string): ValidationResult {
	const isCreditNote = xml.includes("<CreditNote ");
	const rootElement = isCreditNote ? "CreditNote" : "Invoice";
	const baseNs = isCreditNote
		? "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
		: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2";

	return validateXmlStructure(xml, {
		rootElement,
		requiredNamespaces: [
			baseNs,
			"urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
			"urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
		],
		requiredTags: [
			"cbc:CustomizationID",
			"cbc:ID", // BT-1
			"cbc:IssueDate", // BT-2
			isCreditNote ? "cbc:CreditNoteTypeCode" : "cbc:InvoiceTypeCode", // BT-3
			"cbc:DocumentCurrencyCode", // BT-5
		],
	});
}

// ============================================================================
// Validation XSD (async, opt-in via xmllint-wasm)
// ============================================================================

export interface XsdValidationInput {
	/** Contenu binaire du fichier XSD principal (ex: factur-x-minimum.xsd) */
	mainXsd: { fileName: string; contents: Uint8Array | string };
	/** XSD inclus par le main (xs:include / xs:import). Optionnels. */
	includes?: Array<{ fileName: string; contents: Uint8Array | string }>;
}

/**
 * Valide un XML contre un XSD officiel via xmllint-wasm.
 *
 * Lazy-loaded : la dépendance n'est chargée que si appelée, gardant le cold
 * start des routes API peu impactant. Si xmllint-wasm n'est pas installé,
 * lève une erreur explicite plutôt que de fallback silencieux (la validation
 * XSD est opt-in, l'appelant sait ce qu'il demande).
 */
export async function validateAgainstXsd(
	xml: string,
	xsd: XsdValidationInput,
): Promise<ValidationResult> {
	interface XmllintLike {
		validateXML: (input: {
			xml: Array<{ fileName: string; contents: Uint8Array | string }>;
			schema: Array<{ fileName: string; contents: Uint8Array | string }>;
		}) => Promise<{
			valid: boolean;
			errors: Array<{ message: string; loc?: { fileName?: string } }>;
		}>;
	}

	let xmllint: XmllintLike;
	try {
		// Indirection via variable : Vite n'analyse pas statiquement un import()
		// dont le path est une expression. Garde le bundle propre + permet à la
		// dépendance d'être optionnelle (test/dev sans `pnpm install`).
		const moduleName = "xmllint-wasm";
		xmllint = (await import(/* @vite-ignore */ moduleName)) as unknown as XmllintLike;
	} catch (err) {
		throw new Error(
			"xmllint-wasm non installé. Lancer `pnpm add xmllint-wasm` ou retomber sur validateXmlStructure.",
			{ cause: err },
		);
	}

	const result = await xmllint.validateXML({
		xml: [{ fileName: "invoice.xml", contents: xml }],
		schema: [
			{ fileName: xsd.mainXsd.fileName, contents: xsd.mainXsd.contents },
			...(xsd.includes ?? []),
		],
	});

	if (result.valid) return { ok: true };

	const errors: ValidationError[] = result.errors.map((e, i) => ({
		code: `XSD-${String(i + 1).padStart(3, "0")}`,
		message: e.message,
		location: e.loc?.fileName,
	}));

	return { ok: false, errors };
}
