import { ServiceResponse } from "@nowcrm/services";
import { StatusCodes } from "http-status-codes";
import { env } from "@/common/utils/env-config";
import type { LetterServiceRequest, LetterServiceResponse } from "./send-letter";
import { StrapiLetterClient, StrapiApiError } from "./strapi-client";

/**
 * Processing Status Interface
 * Tracks the status of letter template processing
 */
export interface ProcessingStatus {
  /** Current processing stage */
  stage: "validation" | "token_processing" | "pdf_generation" | "completed" | "failed";
  /** Progress percentage (0-100) */
  progress: number;
  /** Status message */
  message: string;
  /** Timestamp of status update */
  timestamp: Date;
  /** Any errors encountered */
  error?: string;
}

/**
 * Process a letter template with contact data
 * 
 * This function handles the core processing logic:
 * 1. Validates template existence in Strapi
 * 2. Processes contact tokens in the template
 * 3. Calls Strapi PDF generator service
 * 4. Returns the generated PDF path
 * 
 * @param templateId - Strapi Letter-Template ID
 * @param contactData - Contact data for token replacement
 * @param options - Additional processing options
 * @returns ServiceResponse with PDF path and processing metadata
 */
export async function processLetterTemplate(
  templateId: string,
  contactData: Record<string, any>,
  options?: {
    /** Whether to validate template existence */
    validateTemplate?: boolean;
    /** Whether to process tokens */
    processTokens?: boolean;
    /** PDF generation options */
    pdfOptions?: LetterServiceRequest["additionalOptions"]["pdfOptions"];
  }
): Promise<ServiceResponse<{ pdfPath: string; processingStatus: ProcessingStatus }>> {
  const startTime = Date.now();
  const status: ProcessingStatus = {
    stage: "validation",
    progress: 0,
    message: "Starting letter template processing",
    timestamp: new Date()
  };

  try {
    // Validate template ID
    if (!templateId) {
      status.stage = "failed";
      status.progress = 0;
      status.message = "Template ID is required";
      status.error = "Template ID is required";
      
      return ServiceResponse.failure(
        "Template ID is required",
        { pdfPath: "", processingStatus: status },
        StatusCodes.BAD_REQUEST
      );
    }

    // Get Strapi API configuration
    const strapiBaseUrl = env.STRAPI_API_URL || process.env.STRAPI_API_URL || "http://localhost:1337";
    const strapiApiToken = env.STRAPI_API_TOKEN || process.env.STRAPI_API_TOKEN;
    
    // Create Strapi client
    const client = new StrapiLetterClient(strapiBaseUrl, strapiApiToken);
    
    status.progress = 10;
    status.message = "Connecting to Strapi API";
    status.timestamp = new Date();


    // 1. Validate template existence
    if (options?.validateTemplate !== false) {
      status.stage = "validation";
      status.progress = 30;
      status.message = "Validating template existence in Strapi";
      status.timestamp = new Date();

      try {
        const template = await client.fetchTemplate(templateId);
        
        if (!template.attributes.is_active) {
          throw new Error("Template is not active");
        }
      } catch (error) {
        status.stage = "failed";
        status.progress = 0;
        status.message = "Template validation failed";
        status.error = error instanceof Error ? error.message : "Unknown error";
        
        return ServiceResponse.failure(
          `Template validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          { pdfPath: "", processingStatus: status },
          error instanceof StrapiApiError && error.statusCode === 404 
            ? StatusCodes.NOT_FOUND 
            : StatusCodes.INTERNAL_SERVER_ERROR
        );
      }
    }

    // 2. Process tokens
    if (options?.processTokens !== false && contactData && Object.keys(contactData).length > 0) {
      status.stage = "token_processing";
      status.progress = 60;
      status.message = "Processing contact tokens in template";
      status.timestamp = new Date();

      try {
        const validation = await client.validateTokens(templateId, contactData);
        
        if (!validation.valid && validation.invalid.length > 0) {
          console.warn(`[Letter Channel] Invalid tokens found: ${validation.invalid.join(", ")}`);
          // Continue processing but log warning
        }
      } catch (error) {
        console.warn(`[Letter Channel] Token validation failed:`, error);
        // Continue processing even if validation fails
      }
    }

    // 3. Generate PDF
    status.stage = "pdf_generation";
    status.progress = 90;
    status.message = "Generating PDF from template";
    status.timestamp = new Date();

    let pdfResult;
    try {
      pdfResult = await client.generatePdf(
        templateId,
        contactData,
        options?.pdfOptions
      );
      
      if (!pdfResult.success) {
        throw new Error(pdfResult.error || "PDF generation failed");
      }
      
    } catch (error) {
      status.stage = "failed";
      status.progress = 0;
      status.message = "PDF generation failed";
      status.error = error instanceof Error ? error.message : "Unknown error";
      
      return ServiceResponse.failure(
        `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { pdfPath: "", processingStatus: status },
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // 4. Complete processing
    status.stage = "completed";
    status.progress = 100;
    status.message = "Letter template processing completed successfully";
    status.timestamp = new Date();

    const processingTime = Date.now() - startTime;
    
    return ServiceResponse.success(
      "Letter template processed successfully",
      {
        pdfPath: pdfResult.file_path || "",
        processingStatus: status
      },
      StatusCodes.OK
    );

  } catch (error) {
    console.error("[Letter Channel] Error in processLetterTemplate:", error);
    
    status.stage = "failed";
    status.progress = 0;
    status.message = "Failed to process letter template";
    status.timestamp = new Date();
    status.error = error instanceof Error ? error.message : "Unknown error";

    return ServiceResponse.failure(
      `Failed to process letter template: ${error instanceof Error ? error.message : "Unknown error"}`,
      { pdfPath: "", processingStatus: status },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * Validate letter template tokens
 * 
 * Validates that all required tokens in the template have corresponding contact data
 * 
 * @param templateId - Strapi Letter-Template ID
 * @param contactData - Contact data to validate against template tokens
 * @returns ServiceResponse with validation results
 */
export async function validateLetterTemplateTokens(
  templateId: string,
  contactData: Record<string, any>
): Promise<ServiceResponse<{
  valid: boolean;
  missingTokens: string[];
  availableTokens: string[];
  validationDetails: any;
}>> {
  try {
    // Get Strapi API configuration
    const strapiBaseUrl = env.STRAPI_API_URL || process.env.STRAPI_API_URL || "http://localhost:1337";
    const strapiApiToken = env.STRAPI_API_TOKEN || process.env.STRAPI_API_TOKEN;
    
    // Create Strapi client
    const client = new StrapiLetterClient(strapiBaseUrl, strapiApiToken);


    const validation = await client.validateTokens(templateId, contactData);
    
    return ServiceResponse.success(
      "Token validation completed",
      {
        valid: validation.valid,
        missingTokens: validation.invalid,
        availableTokens: validation.fields,
        validationDetails: validation
      },
      StatusCodes.OK
    );

  } catch (error) {
    console.error("[Letter Channel] Error in validateLetterTemplateTokens:", error);
    
    // Handle Strapi API errors
    if (error instanceof StrapiApiError) {
      return ServiceResponse.failure(
        `Strapi API error: ${error.message}`,
        {
          valid: false,
          missingTokens: [],
          availableTokens: [],
          validationDetails: { 
            error: error.message,
            endpoint: error.endpoint,
            statusCode: error.statusCode
          }
        },
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    
    return ServiceResponse.failure(
      `Failed to validate template tokens: ${error instanceof Error ? error.message : "Unknown error"}`,
      {
        valid: false,
        missingTokens: [],
        availableTokens: [],
        validationDetails: { error: error instanceof Error ? error.message : "Unknown error" }
      },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * Get letter template preview
 * 
 * Generates a preview of the letter template with sample data
 * 
 * @param templateId - Strapi Letter-Template ID
 * @param sampleData - Sample data for preview
 * @returns ServiceResponse with preview HTML and metadata
 */
export async function getLetterTemplatePreview(
  templateId: string,
  sampleData?: Record<string, any>
): Promise<ServiceResponse<{
  previewHtml: string;
  rawHtml: string;
  cssStyles: string;
  metadata: any;
}>> {
  try {
    // Get Strapi API configuration
    const strapiBaseUrl = env.STRAPI_API_URL || process.env.STRAPI_API_URL || "http://localhost:1337";
    const strapiApiToken = env.STRAPI_API_TOKEN || process.env.STRAPI_API_TOKEN;
    
    // Create Strapi client
    const client = new StrapiLetterClient(strapiBaseUrl, strapiApiToken);


    const preview = await client.getTemplatePreview(templateId, sampleData);
    
    return ServiceResponse.success(
      "Template preview generated",
      preview,
      StatusCodes.OK
    );

  } catch (error) {
    console.error("[Letter Channel] Error in getLetterTemplatePreview:", error);
    
    // Handle Strapi API errors
    if (error instanceof StrapiApiError) {
      return ServiceResponse.failure(
        `Strapi API error: ${error.message}`,
        {
          previewHtml: "",
          rawHtml: "",
          cssStyles: "",
          metadata: { 
            error: error.message,
            endpoint: error.endpoint,
            statusCode: error.statusCode
          }
        },
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    
    return ServiceResponse.failure(
      `Failed to generate template preview: ${error instanceof Error ? error.message : "Unknown error"}`,
      {
        previewHtml: "",
        rawHtml: "",
        cssStyles: "",
        metadata: { error: error instanceof Error ? error.message : "Unknown error" }
      },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}
