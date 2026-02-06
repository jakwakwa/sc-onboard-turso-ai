import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { workflows, applicants, workflowEvents } from "@/db/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

/**
 * Generate fallback explanation for existing workflows without stored reasoning
 */
function generateFallbackExplanation(
	aiTrustScore: number | undefined,
	riskFlagsCount: number,
	itcScore: number | undefined,
	nameMatchVerified: boolean | undefined
): string | undefined {
	if (!aiTrustScore) return undefined;

	const factors: string[] = [];

	// Score-based explanation
	if (aiTrustScore >= 80) {
		factors.push(
			"The AI trust score is high, indicating strong financial health patterns"
		);
	} else if (aiTrustScore >= 60) {
		factors.push(
			"The AI trust score is moderate, suggesting some areas require attention"
		);
	} else {
		factors.push(
			"The AI trust score is below threshold, indicating potential risk factors"
		);
	}

	// Risk flags
	if (riskFlagsCount > 0) {
		factors.push(
			`${riskFlagsCount} risk flag${riskFlagsCount > 1 ? "s were" : " was"} detected during document analysis`
		);
	} else {
		factors.push("No significant risk flags were detected");
	}

	// ITC score
	if (itcScore) {
		if (itcScore >= 350) {
			factors.push("The ITC credit score is in the favorable range");
		} else if (itcScore >= 200) {
			factors.push("The ITC credit score requires additional verification");
		} else {
			factors.push("The ITC credit score is a concern");
		}
	}

	// Name verification
	if (nameMatchVerified === false) {
		factors.push("Account holder name verification failed");
	} else if (nameMatchVerified === true) {
		factors.push("Account holder details match the application");
	}

	return factors.join(". ") + ".";
}

/**
 * Generate fallback summary for existing workflows
 */
function generateFallbackSummary(
	aiTrustScore: number | undefined,
	riskFlagsCount: number
): string | undefined {
	if (!aiTrustScore) return undefined;

	if (aiTrustScore >= 80 && riskFlagsCount === 0) {
		return "Bank statement analysis shows healthy financial patterns with no concerning activity.";
	} else if (aiTrustScore >= 60) {
		return "Bank statement analysis shows generally acceptable patterns. Manual verification recommended.";
	} else {
		return "Bank statement analysis revealed concerning patterns that require careful review.";
	}
}

/**
 * GET /api/risk-review
 * Fetches all workflows awaiting risk review (stage 3, status awaiting_human)
 */
export async function GET(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Fetch workflows awaiting risk review (stage 3 or 4, status awaiting_human)
		const riskReviewWorkflows = await db
			.select({
				workflowId: workflows.id,
				applicantId: workflows.applicantId,
				stage: workflows.stage,
				status: workflows.status,
				startedAt: workflows.startedAt,
				metadata: workflows.metadata,
				companyName: applicants.companyName,
				contactName: applicants.contactName,
				itcScore: applicants.itcScore,
			})
			.from(workflows)
			.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
			.where(
				and(
					eq(workflows.status, "awaiting_human"),
					or(eq(workflows.stage, 3), eq(workflows.stage, 4))
				)
			);

		// For each workflow, fetch the FICA analysis event to get AI analysis data
		const itemsWithAnalysis = await Promise.all(
			riskReviewWorkflows.map(async workflow => {
				// Fetch all relevant events from workflow_events
				const allEvents = await db
					.select()
					.from(workflowEvents)
					.where(eq(workflowEvents.workflowId, workflow.workflowId))
					.orderBy(desc(workflowEvents.timestamp));

				// Check for existing approval decision
				let isApproved = false;
				let approvedAt: string | undefined;
				let approvedBy: string | undefined;

				for (const event of allEvents) {
					// Check for procurement decision (Stage 3) or human override (any stage)
					if (
						event.eventType === "procurement_decision" ||
						event.eventType === "human_override"
					) {
						try {
							const payload = JSON.parse(event.payload || "{}");
							const decision = payload.decision;
							if (decision === "CLEARED" || decision === "APPROVED") {
								isApproved = true;
								approvedAt = event.timestamp?.toISOString();
								approvedBy = event.actorId || undefined;
								break;
							}
						} catch {
							// Ignore parsing errors
						}
					}
				}

				// Find FICA verification event for AI analysis data
				let aiTrustScore: number | undefined;
				let riskFlags: Array<{
					type: string;
					severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
					description: string;
					evidence?: string;
				}> = [];
				let summary: string | undefined;
				let reasoning: string | undefined;
				let recommendation: string | undefined;
				let nameMatchVerified: boolean | undefined;
				let accountMatchVerified: boolean | undefined;
				let analysisConfidence: number | undefined;

				// Procurement-specific data
				let procurementScore: number | undefined;
				let anomalies: string[] = [];

				for (const event of allEvents) {
					if (event.payload) {
						try {
							const payload = JSON.parse(event.payload);

							// Check for AI FICA verification
							if (payload.step === "ai-fica-verification") {
								aiTrustScore = payload.aiTrustScore;
								riskFlags = payload.riskFlags || [];
								summary = payload.summary;
								reasoning = payload.reasoning;
								recommendation = payload.recommendation;
								nameMatchVerified = payload.nameMatchVerified;
								accountMatchVerified = payload.accountMatchVerified;
								analysisConfidence = payload.analysisConfidence;
							}

							// Check for procurement check results
							if (event.eventType === "procurement_check_completed") {
								procurementScore = payload.riskScore;
								anomalies = payload.anomalies || [];
							}
						} catch {
							// Ignore parsing errors
						}
					}
				}

				// Generate fallback explanation if reasoning not stored (for existing workflows)
				const generatedReasoning =
					reasoning ||
					generateFallbackExplanation(
						aiTrustScore,
						riskFlags.length,
						workflow.itcScore || undefined,
						nameMatchVerified
					);

				return {
					id: workflow.workflowId,
					workflowId: workflow.workflowId,
					applicantId: workflow.applicantId,
					clientName: workflow.contactName || "Unknown",
					companyName: workflow.companyName || "Unknown Company",
					stage: workflow.stage || 3,
					stageName: workflow.stage === 3 ? "Procurement Review" : "Risk Review",
					reviewType:
						workflow.stage === 3 ? ("procurement" as const) : ("general" as const),
					createdAt: workflow.startedAt
						? new Date(workflow.startedAt).toISOString()
						: new Date().toISOString(),
					aiTrustScore,
					riskFlags,
					itcScore: workflow.itcScore || undefined,
					recommendation:
						recommendation ||
						(aiTrustScore
							? aiTrustScore >= 80
								? "APPROVE"
								: aiTrustScore >= 60
									? "APPROVE_WITH_CONDITIONS"
									: "MANUAL_REVIEW"
							: undefined),
					summary: summary || generateFallbackSummary(aiTrustScore, riskFlags.length),
					reasoning: generatedReasoning,
					nameMatchVerified,
					accountMatchVerified,
					analysisConfidence: analysisConfidence || (aiTrustScore ? 75 : undefined),
					bankStatementVerified: true, // If they're at stage 3, bank statement was received
					accountantLetterVerified: false,
					// Procurement-specific data
					procurementScore,
					hasAnomalies: anomalies.length > 0,
					anomalies,
					// Decision status
					isApproved,
					approvedAt,
					approvedBy,
				};
			})
		);

		// Filter out already approved items from the queue
		// (they should not appear in the queue, but we track the status for UX)
		const pendingItems = itemsWithAnalysis.filter(item => !item.isApproved);

		return NextResponse.json({
			items: pendingItems,
			count: pendingItems.length,
		});
	} catch (error) {
		console.error("[API] Risk review fetch error:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch risk review items",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
