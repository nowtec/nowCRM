"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Eye, Filter } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import MassActionPreview from "@/components/generativeComponents/mass-actions-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { createList } from "@/lib/actions/lists/create-list";
import AdvancedFilters from "../../advancedFilters/advanced-filters";
import SelectOrCreateListTabs from "./select-or-create-list";

const formSchema = z.object({
	name: z.string().min(2, {
		message: "List name must be at least 2 characters.",
	}),
});

const STEPS = {
	FILTERS: "filters",
	PREVIEW: "preview",
	SELECT_LIST: "select_list",
} as const;

type Step = (typeof STEPS)[keyof typeof STEPS];

const stepConfig = {
	[STEPS.FILTERS]: {
		title: "Apply Filters",
		description: "Set up your contact filters",
		icon: Filter,
		number: 1,
	},
	[STEPS.PREVIEW]: {
		title: "Preview Results",
		description: "Review filtered contacts",
		icon: Eye,
		number: 2,
	},
	[STEPS.SELECT_LIST]: {
		title: "Select List",
		description: "Choose or create a list",
		icon: CheckCircle,
		number: 3,
	},
};

export default function AssignToListWithFiltersDialog({
	selectedOption,
	setSelectedOption,
	setFilters,
	closeDialog,
	setDialogNeeded,
}: {
	selectedOption: any;
	setSelectedOption: (value: any) => void;
	setFilters: (value: any) => void;
	closeDialog: (value: boolean) => void;
	setDialogNeeded: (value: boolean) => void;
}) {
	const [listCreated, setListCreated] = React.useState(false);
	const [activeTab, setActiveTab] = React.useState("select");
	const [isCreatingList, setIsCreatingList] = React.useState(false);
	const [listCreationSuccess, setListCreationSuccess] = React.useState(false);

	const [currentStep, setCurrentStep] = React.useState<Step>(STEPS.FILTERS);
	const [completedSteps, setCompletedSteps] = React.useState<Set<Step>>(
		new Set(),
	);

	const [showPreview, setShowPreview] = React.useState(false);
	const [previewData, setPreviewData] = React.useState<any>(null);
	const [totalCount, setTotalCount] = React.useState(0);
	const [isLoading, setIsLoading] = React.useState(false);
	const [showMainContent, setshowMainContent] = React.useState(false);

	const [appliedFilters, setAppliedFilters] = React.useState<any>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
		},
	});

	const markStepCompleted = (step: Step) => {
		setCompletedSteps((prev) => new Set([...prev, step]));
	};

	const isStepCompleted = (step: Step) => completedSteps.has(step);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsCreatingList(true);
		try {
			const res = await createList(values.name);
			if (res.data?.id) {
				setSelectedOption({ value: res.data.id, label: res.data.name });
				setListCreated(true);
				setListCreationSuccess(true);
				setTimeout(() => setActiveTab("select"), 1000);
			}
		} catch (error) {
			console.error("Error creating list:", error);
		} finally {
			setIsCreatingList(false);
		}
	}

	const fetchPreviewData = async (filterData: any) => {
		setShowPreview(true);
		setIsLoading(true);
		setCurrentStep(STEPS.PREVIEW);
		markStepCompleted(STEPS.FILTERS);

		try {
			const { getContactsPreview } = await import(
				"@/lib/actions/filters/get-contact-preview"
			);
			const response = await getContactsPreview(filterData);
			if (response) {
				setPreviewData(response.data);
				setTotalCount(response.meta?.pagination.total || 0);
				setshowMainContent(false);
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

	const handlePreviewApprove = () => {
		setShowPreview(false);
		setshowMainContent(true);
		setCurrentStep(STEPS.SELECT_LIST);
		markStepCompleted(STEPS.PREVIEW);
		setDialogNeeded(true);
	};

	const handlePreviewClose = () => {
		setShowPreview(false);
		closeDialog(false);
	};

	const goBackToFilters = () => {
		setCurrentStep(STEPS.FILTERS);
		setShowPreview(false);
		setshowMainContent(false);
	};

	const goBackToPreview = () => {
		if (appliedFilters) {
			setCurrentStep(STEPS.PREVIEW);
			setShowPreview(true);
			setshowMainContent(false);
		}
	};

	React.useEffect(() => {
		if (listCreated && activeTab === "create") {
			setActiveTab("select");
		}
	}, [listCreated, activeTab]);

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
								className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200${
									isCompleted
										? "border-green-500 bg-green-500 text-white"
										: isActive
											? "border-blue-500 bg-blue-500 text-white"
											: isAccessible
												? "cursor-pointer border-gray-300 text-gray-400 hover:border-gray-400"
												: "border-gray-200 text-gray-300"
								}
								`}
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
									className={`font-medium text-sm ${isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-500"}`}
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
								className={`mx-4 h-0.5 flex-1 ${isStepCompleted(Object.values(STEPS)[index + 1]) || currentStep === Object.values(STEPS)[index + 1] ? "bg-blue-500" : "bg-gray-200"}`}
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
				<DialogTitle>Add contacts to list</DialogTitle>
				<DialogDescription>Add filtered contacts to list</DialogDescription>
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

			{currentStep === STEPS.FILTERS && (
				<AdvancedFilters
					key="mass-add-tolist-filters"
					showTrigger={false}
					mode="mass-action"
					onClose={closeDialog}
					onSubmitComplete={handleFilterSubmit}
					inline={true}
				/>
			)}

			{showPreview && currentStep === STEPS.PREVIEW && (
				<div className="space-y-4 pr-4 pl-4">
					<div className="flex items-center justify-between">
						<h3 className="font-semibold text-lg">Preview Filtered Contacts</h3>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={goBackToFilters}
						>
							← Back to Filters
						</Button>
					</div>
					<MassActionPreview
						onClose={handlePreviewClose}
						onApprove={handlePreviewApprove}
						actionType="add_to_list"
						previewData={previewData}
						totalCount={totalCount}
						isLoading={isLoading}
					/>
				</div>
			)}

			{showMainContent && currentStep === STEPS.SELECT_LIST && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="font-semibold text-lg">Select Destination List</h3>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={goBackToPreview}
						>
							← Back to Preview
						</Button>
					</div>

					<SelectOrCreateListTabs
						activeTab={activeTab}
						setActiveTab={setActiveTab}
						listCreated={listCreated}
						listCreationSuccess={listCreationSuccess}
						totalCount={totalCount}
						selectedOption={selectedOption}
						setSelectedOption={setSelectedOption}
						form={form}
						onSubmit={onSubmit}
						isCreatingList={isCreatingList}
					/>
				</div>
			)}
		</div>
	);
}
