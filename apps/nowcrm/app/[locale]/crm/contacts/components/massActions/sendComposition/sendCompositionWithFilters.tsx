"use client";

import { CheckCircle, Eye, Filter } from "lucide-react";
import * as React from "react";
import MassActionPreview from "@/components/generativeComponents/MassActionPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { ChannelThrottleResponse } from "@/lib/actions/channels/get-channel-throttle";
import AdvancedFilters from "../../advancedFilters/advancedFilters";
import {
	SendCompositionForm,
	type SendCompositionFormValues,
} from "./sendCompositionForm";

const STEPS = {
	FILTERS: "filters",
	PREVIEW: "preview",
	COMPOSE: "compose",
} as const;

type Step = (typeof STEPS)[keyof typeof STEPS];

const stepConfig = {
	[STEPS.FILTERS]: {
		title: "Apply Filters",
		description: "Choose your contact filters",
		icon: Filter,
	},
	[STEPS.PREVIEW]: {
		title: "Preview Results",
		description: "Review the filtered contacts",
		icon: Eye,
	},
	[STEPS.COMPOSE]: {
		title: "Send Composition",
		description: "Configure your message and send",
		icon: CheckCircle,
	},
};

export default function SendCompositionWithFiltersDialog({
	selectedOption,
	setSelectedOption,
	setFilters,
	closeDialog,
	setDialogNeeded,
	defaultThrottle,
}: {
	selectedOption: any;
	setSelectedOption: (value: any) => void;
	setFilters: (value: any) => void;
	closeDialog: (value: boolean) => void;
	setDialogNeeded: (value: boolean) => void;
	defaultThrottle: ChannelThrottleResponse | null;
}) {
	const [currentStep, setCurrentStep] = React.useState<Step>(STEPS.FILTERS);
	const [completedSteps, setCompletedSteps] = React.useState<Set<Step>>(
		new Set(),
	);

	const [previewData, setPreviewData] = React.useState<any>(null);
	const [totalCount, setTotalCount] = React.useState(0);
	const [isLoading, setIsLoading] = React.useState(false);
	const [appliedFilters, setAppliedFilters] = React.useState<any>(null);

	const markStepCompleted = (step: Step) => {
		setCompletedSteps((prev) => new Set([...prev, step]));
	};

	const isStepCompleted = (step: Step) => completedSteps.has(step);

	/** Step 1 → Fetch preview */
	const fetchPreviewData = async (filterData: any) => {
		setIsLoading(true);
		setCurrentStep(STEPS.PREVIEW);
		markStepCompleted(STEPS.FILTERS);

		try {
			const { getContactsPreview } = await import(
				"@/lib/actions/filters/getContactsPreview"
			);
			const response = await getContactsPreview(filterData);
			if (response) {
				setPreviewData(response.data);
				setTotalCount(response.meta?.pagination.total || 0);
			}
		} catch (error) {
			console.error("Error fetching preview data:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleFilterSubmit = (filterData: any) => {
		setFilters(filterData);
		setAppliedFilters(filterData);
		fetchPreviewData(filterData);
	};

	/** Step 2 → Step 3 */
	const handlePreviewApprove = () => {
		setCurrentStep(STEPS.COMPOSE);
		markStepCompleted(STEPS.PREVIEW);
		setDialogNeeded(true);
	};

	const handlePreviewClose = () => {
		closeDialog(false);
	};

	/** Step 3 → Submit */
	async function handleComposeSubmit(values: SendCompositionFormValues) {
		console.log("Sending composition with filters:", {
			...values,
			appliedFilters,
		});
		const { default: toast } = await import("react-hot-toast");
		toast.success(`Composition sent to ${totalCount} contacts`);
		closeDialog(false);
	}

	/** Step Navigation */
	const goBackToFilters = () => {
		setCurrentStep(STEPS.FILTERS);
	};

	const goBackToPreview = () => {
		setCurrentStep(STEPS.PREVIEW);
	};

	const StepIndicator = () => (
		<div className="m-6 flex items-center justify-between px-4">
			{Object.values(STEPS).map((step, index) => {
				const config = stepConfig[step];
				const Icon = config.icon;
				const isActive = currentStep === step;
				const isCompleted = isStepCompleted(step);
				const isAccessible = isCompleted || isActive || index === 0;

				return (
					<React.Fragment key={step}>
						<div className="flex flex-col items-center">
							<div
								className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
									isCompleted
										? "border-green-500 bg-green-500 text-white"
										: isActive
											? "border-blue-500 bg-blue-500 text-white"
											: isAccessible
												? "cursor-pointer border-gray-300 text-gray-400 hover:border-gray-400"
												: "border-gray-200 text-gray-300"
								}`}
								onClick={() => {
									if (step === STEPS.FILTERS) goBackToFilters();
									if (step === STEPS.PREVIEW && isCompleted) goBackToPreview();
								}}
							>
								{isCompleted ? (
									<CheckCircle className="h-5 w-5" />
								) : (
									<Icon className="h-5 w-5" />
								)}
							</div>
							<div className="mt-2 text-center">
								<div
									className={`font-medium text-sm ${
										isActive
											? "text-blue-600"
											: isCompleted
												? "text-green-600"
												: "text-gray-500"
									}`}
								>
									{config.title}
								</div>
								<div className="text-gray-400 text-xs">
									{config.description}
								</div>
							</div>
						</div>
						{index < Object.values(STEPS).length - 1 && (
							<div
								className={`mx-4 h-0.5 flex-1 ${
									isStepCompleted(Object.values(STEPS)[index + 1]) ||
									currentStep === Object.values(STEPS)[index + 1]
										? "bg-blue-500"
										: "bg-gray-200"
								}`}
							/>
						)}
					</React.Fragment>
				);
			})}
		</div>
	);

	return (
		<div>
			<DialogHeader>
				<DialogTitle>Send Composition</DialogTitle>
				<DialogDescription>
					Send Composition to all <b>{totalCount}</b> filtered contacts
				</DialogDescription>
			</DialogHeader>

			<StepIndicator />

			{appliedFilters && currentStep !== STEPS.FILTERS && (
				<div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Filter className="h-4 w-4 text-blue-600" />
							<span className="font-medium text-blue-800 text-sm">
								Filters Applied
							</span>
							<Badge variant="secondary" className="bg-blue-100 text-blue-800">
								{totalCount} contacts
							</Badge>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={goBackToFilters}
							className="text-blue-600 hover:text-blue-800"
						>
							Edit Filters
						</Button>
					</div>
				</div>
			)}
			{/* Step 1 */}
			{currentStep === STEPS.FILTERS && (
				<AdvancedFilters
					key="mass-send-composition-filters"
					showTrigger={false}
					mode="mass-action"
					onClose={closeDialog}
					onSubmitComplete={handleFilterSubmit}
				/>
			)}

			{/* Step 2 */}
			{currentStep === STEPS.PREVIEW && (
				<MassActionPreview
					isOpen
					onClose={handlePreviewClose}
					onApprove={handlePreviewApprove}
					actionType="send"
					previewData={previewData}
					totalCount={totalCount}
					isLoading={isLoading}
				/>
			)}

			{/* Step 3 */}
			{currentStep === STEPS.COMPOSE && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="font-semibold text-lg">Composition</h3>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={goBackToPreview}
						>
							← Back to Preview
						</Button>
					</div>

					<SendCompositionForm
						selectedOption={selectedOption}
						setSelectedOption={setSelectedOption}
						defaultThrottle={defaultThrottle}
						onSubmit={handleComposeSubmit}
					/>
				</div>
			)}
		</div>
	);
}
