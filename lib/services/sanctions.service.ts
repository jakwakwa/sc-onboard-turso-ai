/**
 * Sanctions Checking Service (Mock Implementation)
 *
 * This is a MOCK implementation for Phase 1 development.
 * Provides simulated sanctions screening including:
 * - UN Sanctions list checking
 * - PEP (Politically Exposed Person) screening
 * - Adverse media scanning
 * - Regulatory watch list verification
 *
 * For Phase 2, this should be replaced with real API integrations
 * such as ComplyAdvantage, World-Check, or LexisNexis.
 */

export interface SanctionsCheckInput {
	applicantId: number;
	companyName: string;
	registrationNumber?: string;
	directors?: string[];
	country?: string;
}

export interface SanctionsResult {
	passed: boolean;
	matchesFound: number;
	pepStatus: "CLEAR" | "MATCH" | "POTENTIAL";
	adverseMedia: string[];
	sanctionsListsChecked: string[];
	confidence: number;
	recommendation: "APPROVE" | "MANUAL_REVIEW" | "DECLINE";
	details: {
		unSanctions: SanctionsListResult;
		pepScreening: PEPScreeningResult;
		adverseMediaScan: AdverseMediaResult;
	};
}

export interface SanctionsListResult {
	checked: boolean;
	listsScanned: string[];
	matchCount: number;
	matches: Array<{
		listName: string;
		matchType: "EXACT" | "PARTIAL" | "ALIAS";
		confidence: number;
		details?: string;
	}>;
}

export interface PEPScreeningResult {
	status: "CLEAR" | "MATCH" | "POTENTIAL";
	pepLevel?: 1 | 2 | 3; // 1 = High (government), 2 = Medium (relatives), 3 = Low (associates)
	details?: string;
}

export interface AdverseMediaResult {
	articlesFound: number;
	significance: "NONE" | "LOW" | "MEDIUM" | "HIGH";
	sources: string[];
}

// ============================================
// Mock Data for Testing
// ============================================

const MOCK_FLAGGED_NAMES = [
	"FLAGGED COMPANY LTD",
	"SANCTIONS TEST CORP",
	"PEP CONNECTED PTY",
];

const MOCK_PEP_SURNAMES = ["politician", "minister", "ambassador"];

const SANCTIONS_LISTS = [
	"UN Security Council Consolidated List",
	"EU Consolidated Financial Sanctions List",
	"OFAC SDN List",
	"UK HM Treasury Sanctions List",
	"South African FIC Targeted Financial Sanctions",
];

// ============================================
// Main Sanctions Check Function
// ============================================

/**
 * Perform a comprehensive sanctions check (MOCK)
 *
 * This mock implementation provides realistic-looking results
 * for testing purposes. Replace with real API calls in Phase 2.
 *
 * @param input - Applicant details for screening
 * @returns Sanctions check results
 */
export async function performSanctionsCheck(
	input: SanctionsCheckInput
): Promise<SanctionsResult> {
	const { companyName, directors = [], country = "ZA" } = input;

	// Simulate API delay (real APIs typically take 2-5 seconds)
	await simulateDelay(1500);

	console.log(`[SanctionsService] Checking: ${companyName}`);

	// Check for mock flagged companies
	const isFlagged = MOCK_FLAGGED_NAMES.some(name =>
		companyName.toUpperCase().includes(name)
	);

	// Check for mock PEP connections
	const hasPEPConnection = directors.some(director =>
		MOCK_PEP_SURNAMES.some(surname => director.toLowerCase().includes(surname))
	);

	// Build UN sanctions result
	const unSanctions: SanctionsListResult = {
		checked: true,
		listsScanned: SANCTIONS_LISTS,
		matchCount: isFlagged ? 1 : 0,
		matches: isFlagged
			? [
					{
						listName: "UN Security Council Consolidated List",
						matchType: "PARTIAL",
						confidence: 75,
						details: "Partial name match detected - manual review recommended",
					},
				]
			: [],
	};

	// Build PEP screening result
	const pepScreening: PEPScreeningResult = {
		status: hasPEPConnection ? "POTENTIAL" : "CLEAR",
		pepLevel: hasPEPConnection ? 3 : undefined,
		details: hasPEPConnection
			? "Director surname matches known PEP associate database"
			: undefined,
	};

	// Build adverse media result
	const adverseMediaScan: AdverseMediaResult = {
		articlesFound: isFlagged ? 3 : 0,
		significance: isFlagged ? "MEDIUM" : "NONE",
		sources: isFlagged ? ["Financial Times", "Reuters", "Local Business News"] : [],
	};

	// Calculate overall result
	const matchesFound = unSanctions.matchCount + (hasPEPConnection ? 1 : 0);
	const passed = matchesFound === 0;
	const pepStatus = pepScreening.status;

	// Determine recommendation
	let recommendation: "APPROVE" | "MANUAL_REVIEW" | "DECLINE";
	if (unSanctions.matchCount > 0) {
		recommendation = "DECLINE";
	} else if (hasPEPConnection || adverseMediaScan.significance !== "NONE") {
		recommendation = "MANUAL_REVIEW";
	} else {
		recommendation = "APPROVE";
	}

	// Calculate confidence based on data quality
	const confidence = calculateConfidence(input);

	const result: SanctionsResult = {
		passed,
		matchesFound,
		pepStatus,
		adverseMedia: adverseMediaScan.sources,
		sanctionsListsChecked: SANCTIONS_LISTS,
		confidence,
		recommendation,
		details: {
			unSanctions,
			pepScreening,
			adverseMediaScan,
		},
	};

	console.log(
		`[SanctionsService] Result for ${companyName}: ${passed ? "PASSED" : "FLAGGED"} (${recommendation})`
	);

	return result;
}

/**
 * Quick sanctions check - returns only pass/fail
 */
export async function quickSanctionsCheck(
	companyName: string
): Promise<{ passed: boolean; reason?: string }> {
	const isFlagged = MOCK_FLAGGED_NAMES.some(name =>
		companyName.toUpperCase().includes(name)
	);

	await simulateDelay(500);

	return {
		passed: !isFlagged,
		reason: isFlagged ? "Company name matches sanctions list" : undefined,
	};
}

// ============================================
// Helper Functions
// ============================================

function simulateDelay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateConfidence(input: SanctionsCheckInput): number {
	let confidence = 50; // Base confidence

	if (input.registrationNumber) confidence += 15;
	if (input.directors && input.directors.length > 0) confidence += 15;
	if (input.country) confidence += 10;
	if (input.companyName.length > 5) confidence += 10;

	return Math.min(confidence, 100);
}
