/**
 * Mandate Documents Configuration
 *
 * Defines the required documents based on:
 * 1. Business Type (NPO, Proprietor, Company, Trust)
 * 2. Mandate Type (EFT, Debit Order, Cash, Mixed)
 *
 * This configuration drives the conditional document requests
 * in the onboarding workflow, ensuring applicants only receive
 * relevant documentation requirements.
 */

// ============================================
// Business Type Document Requirements
// ============================================

export type BusinessType = "NPO" | "PROPRIETOR" | "COMPANY" | "TRUST" | "OTHER";
export type MandateType = "EFT" | "DEBIT_ORDER" | "CASH" | "MIXED";

export interface DocumentRequirement {
	id: string;
	name: string;
	description: string;
	required: boolean;
	category: "identity" | "registration" | "financial" | "authorization" | "compliance";
	acceptedFormats: string[];
	maxSizeMB: number;
	expiryMonths?: number; // Documents like proof of address expire
}

/**
 * NPO (Non-Profit Organization) Documents
 */
export const NPO_DOCUMENTS: DocumentRequirement[] = [
	{
		id: "npo_registration",
		name: "NPO Registration Certificate",
		description: "Certificate of registration from the Department of Social Development",
		required: true,
		category: "registration",
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 10,
	},
	{
		id: "tax_exemption_certificate",
		name: "Tax Exemption Certificate",
		description: "Section 18A or PBO status confirmation from SARS",
		required: true,
		category: "compliance",
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "board_resolution",
		name: "Board Resolution",
		description: "Resolution authorizing the mandate application signed by board members",
		required: true,
		category: "authorization",
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "founding_document",
		name: "Constitution / Founding Document",
		description: "Original NPO constitution or founding document",
		required: true,
		category: "registration",
		acceptedFormats: ["pdf"],
		maxSizeMB: 15,
	},
	{
		id: "authorized_signatory_id",
		name: "Authorized Signatory ID",
		description: "Certified copy of ID for all authorized signatories",
		required: true,
		category: "identity",
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 5,
	},
];

/**
 * Sole Proprietor Documents
 */
export const PROPRIETOR_DOCUMENTS: DocumentRequirement[] = [
	{
		id: "individual_id",
		name: "South African ID Document",
		description: "Certified copy of South African ID card or passport",
		required: true,
		category: "identity",
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 5,
	},
	{
		id: "proof_of_residence",
		name: "Proof of Residence",
		description: "Utility bill or bank statement (not older than 3 months)",
		required: true,
		category: "compliance",
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 5,
		expiryMonths: 3,
	},
	{
		id: "business_registration",
		name: "Business Registration",
		description: "CIPC CK1 or proof of business registration",
		required: false,
		category: "registration",
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "trading_license",
		name: "Trading License",
		description: "Municipal trading license (if applicable)",
		required: false,
		category: "compliance",
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 5,
	},
];

/**
 * Company (PTY LTD) Documents
 */
export const COMPANY_DOCUMENTS: DocumentRequirement[] = [
	{
		id: "cipc_registration",
		name: "CIPC Registration Documents",
		description: "CoR14.3 or Certificate of Incorporation",
		required: true,
		category: "registration",
		acceptedFormats: ["pdf"],
		maxSizeMB: 10,
	},
	{
		id: "memorandum_incorporation",
		name: "Memorandum of Incorporation",
		description: "Company MOI or Articles of Association",
		required: true,
		category: "registration",
		acceptedFormats: ["pdf"],
		maxSizeMB: 15,
	},
	{
		id: "director_details",
		name: "Director ID Documents",
		description: "Certified copies of IDs for all directors",
		required: true,
		category: "identity",
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 10,
	},
	{
		id: "share_certificate",
		name: "Share Certificate Register",
		description: "Proof of shareholding structure",
		required: true,
		category: "registration",
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "financial_statements",
		name: "Latest Financial Statements",
		description: "Annual financial statements or management accounts (last 12 months)",
		required: true,
		category: "financial",
		acceptedFormats: ["pdf"],
		maxSizeMB: 20,
	},
	{
		id: "company_resolution",
		name: "Company Resolution",
		description: "Board resolution authorizing the mandate application",
		required: true,
		category: "authorization",
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
];

/**
 * Trust Documents
 */
export const TRUST_DOCUMENTS: DocumentRequirement[] = [
	{
		id: "trust_deed",
		name: "Trust Deed",
		description: "Registered trust deed with Master of the High Court",
		required: true,
		category: "registration",
		acceptedFormats: ["pdf"],
		maxSizeMB: 15,
	},
	{
		id: "letters_authority",
		name: "Letters of Authority",
		description: "Master's letters of authority for trustees",
		required: true,
		category: "authorization",
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "trustee_details",
		name: "Trustee ID Documents",
		description: "Certified copies of IDs for all trustees",
		required: true,
		category: "identity",
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 10,
	},
	{
		id: "beneficiary_information",
		name: "Beneficiary Information",
		description: "List of beneficiaries with ID documentation",
		required: true,
		category: "identity",
		acceptedFormats: ["pdf"],
		maxSizeMB: 10,
	},
	{
		id: "trust_resolution",
		name: "Trust Resolution",
		description: "Resolution authorizing the mandate application signed by trustees",
		required: true,
		category: "authorization",
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
];

// ============================================
// Mandate Type Document Requirements
// ============================================

/**
 * Additional documents required based on mandate type
 */
export const MANDATE_TYPE_DOCUMENTS: Record<MandateType, DocumentRequirement[]> = {
	EFT: [
		{
			id: "bank_confirmation",
			name: "Bank Confirmation Letter",
			description: "Letter from bank confirming account details",
			required: true,
			category: "financial",
			acceptedFormats: ["pdf"],
			maxSizeMB: 5,
		},
		{
			id: "eft_mandate_form",
			name: "EFT Mandate Authorization",
			description: "Signed EFT mandate authorization form",
			required: true,
			category: "authorization",
			acceptedFormats: ["pdf"],
			maxSizeMB: 5,
		},
	],
	DEBIT_ORDER: [
		{
			id: "debit_order_mandate",
			name: "Debit Order Mandate",
			description: "Signed debit order mandate form",
			required: true,
			category: "authorization",
			acceptedFormats: ["pdf"],
			maxSizeMB: 5,
		},
		{
			id: "bank_statement_3m",
			name: "3 Months Bank Statements",
			description: "Latest 3 months bank statements",
			required: true,
			category: "financial",
			acceptedFormats: ["pdf"],
			maxSizeMB: 20,
		},
	],
	CASH: [
		{
			id: "proof_of_registration",
			name: "Proof of Business Registration",
			description: "Business registration or trading as documentation",
			required: true,
			category: "registration",
			acceptedFormats: ["pdf"],
			maxSizeMB: 5,
		},
	],
	MIXED: [
		{
			id: "bank_confirmation",
			name: "Bank Confirmation Letter",
			description: "Letter from bank confirming account details",
			required: true,
			category: "financial",
			acceptedFormats: ["pdf"],
			maxSizeMB: 5,
		},
		{
			id: "eft_mandate_form",
			name: "EFT Mandate Authorization",
			description: "Signed EFT mandate authorization form",
			required: true,
			category: "authorization",
			acceptedFormats: ["pdf"],
			maxSizeMB: 5,
		},
		{
			id: "debit_order_mandate",
			name: "Debit Order Mandate",
			description: "Signed debit order mandate form",
			required: true,
			category: "authorization",
			acceptedFormats: ["pdf"],
			maxSizeMB: 5,
		},
	],
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get documents required for a specific business type
 */
export function getBusinessTypeDocuments(
	businessType: BusinessType
): DocumentRequirement[] {
	switch (businessType) {
		case "NPO":
			return NPO_DOCUMENTS;
		case "PROPRIETOR":
			return PROPRIETOR_DOCUMENTS;
		case "COMPANY":
			return COMPANY_DOCUMENTS;
		case "TRUST":
			return TRUST_DOCUMENTS;
		default:
			return COMPANY_DOCUMENTS; // Default to company requirements
	}
}

/**
 * Get documents required for a specific mandate type
 */
export function getMandateTypeDocuments(mandateType: MandateType): DocumentRequirement[] {
	return MANDATE_TYPE_DOCUMENTS[mandateType] || [];
}

/**
 * Get all required documents for an applicant based on their profile
 */
export function getAllRequiredDocuments(
	businessType: BusinessType,
	mandateType: MandateType
): DocumentRequirement[] {
	const businessDocs = getBusinessTypeDocuments(businessType);
	const mandateDocs = getMandateTypeDocuments(mandateType);

	// Merge and deduplicate by ID
	const allDocs = [...businessDocs, ...mandateDocs];
	const uniqueDocs = allDocs.reduce((acc, doc) => {
		if (!acc.find(d => d.id === doc.id)) {
			acc.push(doc);
		}
		return acc;
	}, [] as DocumentRequirement[]);

	return uniqueDocs;
}

/**
 * Get required document IDs as a simple array (for workflow events)
 */
export function getRequiredDocumentIds(
	businessType: BusinessType,
	mandateType: MandateType
): string[] {
	return getAllRequiredDocuments(businessType, mandateType)
		.filter(doc => doc.required)
		.map(doc => doc.id);
}
