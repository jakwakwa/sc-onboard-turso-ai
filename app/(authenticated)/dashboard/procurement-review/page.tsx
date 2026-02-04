/**
 * Procurement Review Dashboard
 *
 * Allows Risk Managers to review applicants flagged by ProcureCheck,
 * approve or deny procurement clearance, and trigger kill switch for denials.
 */

import { Suspense } from "react";
import { getDatabaseClient } from "@/app/utils";
import { workflows, applicants, workflowEvents } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProcurementReviewActions } from "./procurement-actions";

interface PendingReview {
	workflowId: number;
	applicantId: number;
	companyName: string;
	email: string;
	stage: number;
	status: string;
	createdAt: Date;
	riskData?: {
		riskScore?: number;
		anomalies?: string[];
		recommendedAction?: string;
	};
}

async function getPendingReviews(): Promise<PendingReview[]> {
	const db = getDatabaseClient();
	if (!db) return [];

	// Get workflows awaiting human approval at stage 3 (procurement)
	const pendingWorkflows = await db
		.select({
			workflowId: workflows.id,
			applicantId: workflows.applicantId,
			stage: workflows.stage,
			status: workflows.status,
			startedAt: workflows.startedAt,
			companyName: applicants.companyName,
			email: applicants.email,
		})
		.from(workflows)
		.innerJoin(applicants, eq(workflows.applicantId, applicants.id))
		.where(and(eq(workflows.status, "awaiting_human"), eq(workflows.stage, 3)))
		.orderBy(desc(workflows.startedAt));

	// Enrich with risk data from workflow events
	const enrichedReviews: PendingReview[] = await Promise.all(
		pendingWorkflows.map(async wf => {
			// Get the latest procurement check event
			const events = await db
				.select()
				.from(workflowEvents)
				.where(
					and(
						eq(workflowEvents.workflowId, wf.workflowId),
						eq(workflowEvents.eventType, "procurement_check_completed")
					)
				)
				.orderBy(desc(workflowEvents.timestamp))
				.limit(1);

			let riskData = undefined;
			if (events[0]?.payload) {
				try {
					riskData = JSON.parse(events[0].payload);
				} catch {
					// Ignore parse errors
				}
			}

			return {
				workflowId: wf.workflowId,
				applicantId: wf.applicantId,
				companyName: wf.companyName,
				email: wf.email,
				stage: wf.stage || 3,
				status: wf.status || "awaiting_human",
				createdAt: wf.startedAt || new Date(),
				riskData,
			};
		})
	);

	return enrichedReviews;
}

function RiskBadge({ score }: { score?: number }) {
	if (score === undefined) return <Badge variant="outline">Unknown</Badge>;

	if (score >= 70) {
		return <Badge variant="destructive">High Risk ({score})</Badge>;
	}
	if (score >= 40) {
		return <Badge className="bg-yellow-500 text-black">Medium Risk ({score})</Badge>;
	}
	return <Badge className="bg-green-500">Low Risk ({score})</Badge>;
}

function ActionBadge({ action }: { action?: string }) {
	if (!action) return null;

	switch (action) {
		case "DECLINE":
			return <Badge variant="destructive">Recommended: Decline</Badge>;
		case "MANUAL_REVIEW":
			return <Badge className="bg-yellow-500 text-black">Needs Review</Badge>;
		case "APPROVE":
			return <Badge className="bg-green-500">Auto-Approve</Badge>;
		default:
			return <Badge variant="outline">{action}</Badge>;
	}
}

function PendingReviewsList({ reviews }: { reviews: PendingReview[] }) {
	if (reviews.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				<p className="text-lg">No pending procurement reviews</p>
				<p className="text-sm mt-2">All applicants have been processed</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{reviews.map(review => (
				<Card key={review.workflowId} className="border-2">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg">{review.companyName}</CardTitle>
							<div className="flex items-center gap-2">
								<RiskBadge score={review.riskData?.riskScore} />
								<ActionBadge action={review.riskData?.recommendedAction} />
							</div>
						</div>
						<p className="text-sm text-muted-foreground">{review.email}</p>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4 mb-4">
							<div>
								<p className="text-sm font-medium">Workflow ID</p>
								<p className="text-sm text-muted-foreground">{review.workflowId}</p>
							</div>
							<div>
								<p className="text-sm font-medium">Created</p>
								<p className="text-sm text-muted-foreground">
									{review.createdAt.toLocaleDateString()}
								</p>
							</div>
						</div>

						{review.riskData?.anomalies && review.riskData.anomalies.length > 0 && (
							<div className="mb-4">
								<p className="text-sm font-medium mb-1">Anomalies Detected:</p>
								<ul className="text-sm text-muted-foreground list-disc list-inside">
									{review.riskData.anomalies.map((anomaly, idx) => (
										<li key={idx}>{anomaly}</li>
									))}
								</ul>
							</div>
						)}

						<ProcurementReviewActions
							workflowId={review.workflowId}
							applicantId={review.applicantId}
							companyName={review.companyName}
							riskScore={review.riskData?.riskScore}
						/>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

export default async function ProcurementReviewPage() {
	const reviews = await getPendingReviews();

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold">Procurement Review</h1>
				<p className="text-muted-foreground mt-1">
					Review and approve or deny applicants based on ProcureCheck results
				</p>
			</div>

			<div className="mb-4 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="text-lg px-4 py-1">
						{reviews.length} pending
					</Badge>
				</div>
			</div>

			<Suspense fallback={<div>Loading reviews...</div>}>
				<PendingReviewsList reviews={reviews} />
			</Suspense>
		</div>
	);
}
