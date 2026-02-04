"use client";

/**
 * Procurement Review Actions Component
 *
 * Client-side component for approve/deny buttons with kill switch integration.
 * Handles form submission and API calls to the procurement decision endpoints.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";

interface ProcurementReviewActionsProps {
	workflowId: number;
	applicantId: number;
	companyName: string;
	riskScore?: number;
}

export function ProcurementReviewActions({
	workflowId,
	applicantId,
	companyName,
	riskScore = 0,
}: ProcurementReviewActionsProps) {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [denyReason, setDenyReason] = useState("");

	const handleApprove = async () => {
		setIsSubmitting(true);
		try {
			const response = await fetch("/api/risk-decision/procurement", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflowId,
					applicantId,
					procureCheckResult: {
						riskScore,
						anomalies: [],
						recommendedAction: "APPROVE",
					},
					decision: {
						outcome: "CLEARED",
						reason: "Manual review approved by risk manager",
					},
				}),
			});

			if (response.ok) {
				router.refresh();
			} else {
				console.error("Failed to approve:", await response.text());
			}
		} catch (error) {
			console.error("Error approving:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeny = async () => {
		if (!denyReason.trim()) {
			return;
		}

		setIsSubmitting(true);
		try {
			// Use the kill endpoint directly for immediate termination
			const response = await fetch("/api/risk-decision/kill", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflowId,
					applicantId,
					reason: denyReason,
				}),
			});

			if (response.ok) {
				router.refresh();
			} else {
				console.error("Failed to deny:", await response.text());
			}
		} catch (error) {
			console.error("Error denying:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="flex items-center gap-3 mt-4">
			{/* Approve Button */}
			<Button
				onClick={handleApprove}
				disabled={isSubmitting}
				className="bg-green-600 hover:bg-green-700 text-white">
				{isSubmitting ? (
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
				) : (
					<CheckCircle className="mr-2 h-4 w-4" />
				)}
				Clear Procurement
			</Button>

			{/* Deny Button with Confirmation Dialog */}
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button variant="destructive" disabled={isSubmitting}>
						<XCircle className="mr-2 h-4 w-4" />
						Deny & Terminate
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-destructive" />
							Terminate Workflow
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-4">
								<p>
									You are about to <strong>permanently terminate</strong> the onboarding
									workflow for <strong>{companyName}</strong>.
								</p>
								<p className="text-destructive">This action will:</p>
								<ul className="list-disc list-inside text-sm space-y-1">
									<li>Stop all parallel processing immediately</li>
									<li>Invalidate all pending magic link forms</li>
									<li>Mark the workflow as terminated</li>
									<li>Send notification emails</li>
								</ul>
								<div className="mt-4">
									<label className="text-sm font-medium">
										Reason for denial (required):
									</label>
									<Textarea
										placeholder="Enter the reason for denying this applicant..."
										value={denyReason}
										onChange={e => setDenyReason(e.target.value)}
										className="mt-2"
										rows={3}
									/>
								</div>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeny}
							disabled={!denyReason.trim() || isSubmitting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
							Terminate Workflow
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
