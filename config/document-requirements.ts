import type { DocumentCategory, DocumentType } from "@/lib/types";

export interface DocumentRequirement {
	type: DocumentType;
	label: string;
	category: DocumentCategory;
	required: boolean;
	description?: string;
}

export interface DocumentRequirementContext {
	entityType?:
		| "company"
		| "close_corporation"
		| "proprietor"
		| "partnership"
		| "npo"
		| "trust"
		| "body_corporate"
		| "other";
	industry?: string;
	productType?: "standard" | "premium_collections" | "call_centre";
	isExistingUser?: boolean;
	saleOfBusiness?: boolean;
	needsBankGuarantee?: boolean;
	isHighRisk?: boolean;
}

// ============================================
// 1. Standard Application Documents
// (attached to on-boarding email)
// ============================================

const standardApplicationRequirements: DocumentRequirement[] = [
	{
		type: "INVOICE",
		label: "Last 3 invoices (if applicable)",
		category: "standard_application",
		required: false,
	},
	{
		type: "EXISTING_MANDATE",
		label: "Existing mandates (if applicable)",
		category: "standard_application",
		required: false,
	},
	{
		type: "BANK_GUARANTEE",
		label: "Bank guarantee (if option selected)",
		category: "standard_application",
		required: false,
	},
];

// ============================================
// 2. Standard FICA Requirements
// ============================================

// 2.1 Entity Documentation
const standardFicaEntityRequirements: DocumentRequirement[] = [
	{
		type: "COMPANY_REGISTRATION",
		label: "Company registration documents / Trust deed / NPO certificate",
		category: "fica_entity",
		required: true,
		description: "As applicable to your entity type",
	},
	{
		type: "TAX_VAT",
		label: "Tax and VAT documents",
		category: "fica_entity",
		required: true,
	},
	{
		type: "SERVICE_DESCRIPTION",
		label: "Full description of services or website link",
		category: "fica_entity",
		required: true,
	},
];

// 2.2 Individuals (Directors / Shareholders / Owners / Members / Trustees)
const standardFicaIndividualsRequirements: DocumentRequirement[] = [
	{
		type: "DIRECTOR_ID",
		label: "Copy of ID (directors/shareholders/owners/members/trustees)",
		category: "fica_individual",
		required: true,
	},
	{
		type: "PROOF_OF_RESIDENCE",
		label: "Proof of residential address (not older than 3 months or lease agreement)",
		category: "fica_individual",
		required: true,
	},
];

// 2.3 Business Information
const standardFicaBusinessRequirements: DocumentRequirement[] = [
	{
		type: "BUSINESS_PREMISES_PROOF",
		label: "Proof of business premises address (not older than 3 months or lease agreement)",
		category: "fica_business",
		required: true,
	},
	{
		type: "BANK_STATEMENT",
		label: "Latest 3-month bank statement",
		category: "fica_business",
		required: true,
	},
	// Note: Accounting Officer Letter is now a standalone form (ACCOUNTANT_LETTER)
	// and Third-Party Confirmation Letter is its alternative
	{
		type: "THIRD_PARTY_CONFIRMATION_LETTER",
		label: "3rd-party confirmation letter (if no accountant letter)",
		category: "fica_business",
		required: false,
		description: "Alternative to the accountant confirmation letter",
	},
];

// ============================================
// Helper
// ============================================

const hasIndustry = (industry: string | undefined, token: string) => {
	if (!industry) return false;
	return industry.toLowerCase().includes(token.toLowerCase());
};

// ============================================
// Main conditional function
// ============================================

export function getDocumentRequirements(context: DocumentRequirementContext) {
	const requirements: DocumentRequirement[] = [];

	// Always include standard application docs
	requirements.push(...standardApplicationRequirements);

	// Bank guarantee becomes required if selected
	if (context.needsBankGuarantee) {
		const bgIdx = requirements.findIndex(r => r.type === "BANK_GUARANTEE");
		if (bgIdx >= 0) {
			requirements[bgIdx] = { ...requirements[bgIdx], required: true };
		}
	}

	// --- Entity-specific FICA entity docs ---
	// Sole proprietors don't need company registration or business premises proof
	if (context.entityType === "proprietor") {
		// Proprietors: ID + proof of residence (individuals section) + tax docs
		requirements.push(
			{
				type: "TAX_VAT",
				label: "Tax and VAT documents",
				category: "fica_entity",
				required: true,
			},
			{
				type: "SERVICE_DESCRIPTION",
				label: "Full description of services or website link",
				category: "fica_entity",
				required: true,
			}
		);
	} else {
		// All other entity types get the full FICA entity requirements
		requirements.push(...standardFicaEntityRequirements);
	}

	// Always include individuals requirements
	requirements.push(...standardFicaIndividualsRequirements);

	// Business info - proprietors skip business premises proof
	if (context.entityType === "proprietor") {
		requirements.push(
			{
				type: "BANK_STATEMENT",
				label: "Latest 3-month bank statement",
				category: "fica_business",
				required: true,
			},
			{
				type: "THIRD_PARTY_CONFIRMATION_LETTER",
				label: "3rd-party confirmation letter (if no accountant letter)",
				category: "fica_business",
				required: false,
			}
		);
	} else {
		requirements.push(...standardFicaBusinessRequirements);
	}

	// --- 3. Product-specific ---

	// 3.1 Premium Collections
	if (context.productType === "premium_collections") {
		requirements.push({
			type: "INTERMEDIARY_AGREEMENT",
			label: "Intermediary agreement",
			category: "product_specific",
			required: true,
			description: "Required for Premium Collections applicants",
		});
	}

	// 3.2 Call Centre - only the COLMS upload; the rest is a standalone form
	if (context.productType === "call_centre") {
		requirements.push({
			type: "COLMS_APPLICATION",
			label: "COLMS application",
			category: "product_specific",
			required: true,
			description: "Required for call centre applicants",
		});
	}

	// --- 4. Industry-specific ---

	// NPO
	if (context.entityType === "npo" || hasIndustry(context.industry, "npo")) {
		requirements.push(
			{
				type: "NPO_CONSTITUTION",
				label: "NPO constitution",
				category: "industry_specific",
				required: true,
			},
			{
				type: "NPO_RESOLUTION",
				label: "NPO resolution",
				category: "industry_specific",
				required: true,
			},
			{
				type: "NPO_BOARD_LIST",
				label: "List of board members (name, surname, ID number)",
				category: "industry_specific",
				required: true,
			}
		);
	}

	// Trust
	if (context.entityType === "trust" || hasIndustry(context.industry, "trust")) {
		requirements.push(
			{
				type: "TRUST_LETTER_OF_AUTHORITY",
				label: "Letter of authority",
				category: "industry_specific",
				required: true,
			},
			{
				type: "TRUST_BENEFICIARY_IDS",
				label: "Beneficiary IDs & addresses",
				category: "industry_specific",
				required: true,
			},
			{
				type: "TRUST_ORGANOGRAM",
				label: "Organogram (on request)",
				category: "industry_specific",
				required: false,
			}
		);
	}

	// Body Corporate
	if (
		context.entityType === "body_corporate" ||
		hasIndustry(context.industry, "body corporate")
	) {
		requirements.push(
			{
				type: "BODY_CORPORATE_RESOLUTION",
				label: "Body corporate resolution",
				category: "industry_specific",
				required: true,
			},
			{
				type: "BODY_CORPORATE_BOARD_LIST",
				label: "List of board members (name, surname, ID number)",
				category: "industry_specific",
				required: true,
			}
		);
	}

	// Insurance PC
	if (hasIndustry(context.industry, "insurance")) {
		requirements.push({
			type: "INSURANCE_FSCA_CERT",
			label: "FSCA certificate",
			category: "industry_specific",
			required: true,
		});
	}

	// Security Services
	if (hasIndustry(context.industry, "security")) {
		requirements.push({
			type: "SECURITY_PSIRA_CERT",
			label: "PSIRA certificate",
			category: "industry_specific",
			required: true,
		});
	}

	// FIC Centre
	if (hasIndustry(context.industry, "fic")) {
		requirements.push({
			type: "FIC_REGISTRATION",
			label: "FIC registration number",
			category: "industry_specific",
			required: true,
		});
	}

	// Loan Provider / Debt Counsellor
	if (hasIndustry(context.industry, "loan") || hasIndustry(context.industry, "debt")) {
		requirements.push({
			type: "NCR_CERTIFICATE",
			label: "NCR certificate",
			category: "industry_specific",
			required: true,
		});
	}

	// --- 5. Risk-based / High-risk additional documents ---

	if (context.isExistingUser) {
		requirements.push({
			type: "INSTRUCTION_LETTER_CHANGES",
			label: "Instruction letter for changes (existing users)",
			category: "risk_based",
			required: true,
		});
	}

	if (context.saleOfBusiness) {
		requirements.push({
			type: "SALES_AGREEMENT",
			label: "Sales agreement (sale of business)",
			category: "risk_based",
			required: true,
		});
	}

	// High-risk applicants: Financial statements handled by risk manager signal,
	// consent form is a scanned upload
	if (context.isHighRisk) {
		requirements.push({
			type: "CONSENT_FORM",
			label: "Usage of consent form (if applicable to your business)",
			category: "risk_based",
			required: false,
			description: "Scanned upload - required if consent forms are used in your business",
		});
	}

	return requirements;
}

/**
 * Returns ALL possible document requirements (for admin/overview purposes only).
 * The upload page should use getDocumentRequirements(context) instead.
 */
export function getAllDocumentRequirements() {
	return getDocumentRequirements({
		entityType: "company",
		productType: "standard",
		isHighRisk: true,
		isExistingUser: true,
		saleOfBusiness: true,
		needsBankGuarantee: true,
	});
}
