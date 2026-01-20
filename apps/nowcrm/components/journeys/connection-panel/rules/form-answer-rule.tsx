"use client";

import type { DocumentId, FormEntityItem } from "@nowcrm/services";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AsyncSelect } from "@/components/autoComplete/async-select";
import type { Option } from "@/components/autoComplete/auto-complete";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { RouteConfig } from "@/lib/config/routes-config";
import type { Condition } from "../connection-panel";

interface FormCompleteRuleProps {
	condition: Condition;
	updateCondition: (id: string, updates: Partial<Condition>) => void;
}

export function FormAnswerRule({
	condition,
	updateCondition,
}: FormCompleteRuleProps) {
	const [formId, setFormId] = useState<DocumentId | undefined>(
		condition.additional_data?.form?.value,
	);

	const [conditionValue, setConditionValue] = useState<string>(
		condition.operator,
	);

	const answerType =
		condition?.additional_data?.formAnswer?.additional_data?.type;

	const isNumber = answerType === "number";
	const isBoolean = answerType === "checkbox";

	return (
		<div className="space-y-4">
			{/* Form */}
			<div>
				<label className="mb-1 block text-muted-foreground text-sm">Form</label>

				<AsyncSelect
					key="form"
					serviceName="formsService"
					presetOption={condition.additional_data?.form as Option | undefined}
					onValueChange={(value) => {
						value ? setFormId(value.value) : setFormId(undefined);

						updateCondition(condition.id, {
							additional_data: {
								form: value,
							},
						});
					}}
					label="select Form"
					useFormClear={false}
				/>

				{formId != null && (
					<div className="mt-1 text-sm">
						<Link
							href={RouteConfig.forms.single(formId)}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center text-yellow-600 hover:underline"
						>
							Preview Form
							<ExternalLink className="ml-1 h-4 w-4" />
						</Link>
					</div>
				)}
			</div>

			{/* Form Question */}
			<div>
				<label className="mb-1 block text-muted-foreground text-sm">
					Form question
				</label>

				<AsyncSelect
					key="formAnswer"
					serviceName="formItemsService"
					presetOption={
						condition.additional_data?.formAnswer as Option | undefined
					}
					disabled={!formId}
					fetchFilters={{ form: { documentId: { $eq: formId } } }}
					extractAdditionalFields={["type", "name"]}
					labelBuilder={(item: FormEntityItem) => item.label}
					onValueChange={(value: any) => {
						updateCondition(condition.id, {
							additional_data: {
								formAnswer: value,
								conditionOperator: "$eq",
								conditionField: "[question]",
							},
							conditionOperator: "$eq",
							conditionField: "[question]",
							value: value?.additional_data.name,
						});
					}}
					label="select Form question"
					useFormClear={false}
				/>
			</div>

			{/* Operator */}
			<div>
				<label className="mb-1 block text-muted-foreground text-sm">
					Operator
				</label>

				<Select
					value={condition.operator}
					onValueChange={(value) => {
						setConditionValue(value);
						updateCondition(condition.id, { operator: value });
					}}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select operator" />
					</SelectTrigger>

					<SelectContent>
						<SelectItem value="$eqi">Equals</SelectItem>
						<SelectItem value="$nei">Not Equals</SelectItem>

						{isNumber && (
							<>
								<SelectItem value="$gte">Greater or equal</SelectItem>
								<SelectItem value="$gt">Greater than</SelectItem>
								<SelectItem value="$lte">Less or equal</SelectItem>
								<SelectItem value="$lt">Less than</SelectItem>
							</>
						)}
					</SelectContent>
				</Select>
			</div>

			{/* Value */}
			<div>
				<label className="mb-1 block text-muted-foreground text-sm">
					Value
				</label>

				{isBoolean ? (
					<Select
						value={condition.additionalCondition?.split("/")[2]}
						onValueChange={(value) => {
							updateCondition(condition.id, {
								additionalCondition: `[surveys][survey_items][answer]/${conditionValue}/${value}`,
							});
						}}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select value" />
						</SelectTrigger>

						<SelectContent>
							<SelectItem value="true">True</SelectItem>
							<SelectItem value="false">False</SelectItem>
						</SelectContent>
					</Select>
				) : (
					<Input
						value={condition.additionalCondition?.split("/")[2] ?? ""}
						onChange={(e) => {
							updateCondition(condition.id, {
								additionalCondition: `[surveys][survey_items][answer]/${conditionValue}/${e.target.value}`,
							});
						}}
					/>
				)}
			</div>
		</div>
	);
}
