import { ServiceResponse } from "@nowcrm/services";
import { StatusCodes } from "http-status-codes";
import { env } from "@/common/utils/env-config";
import { StrapiLetterClient, StrapiApiError } from "./strapi-client";
import { LetterEmailIntegration } from "./email-integration";
import type { Contact, CompositionItem } from "@nowcrm/services";

/**
 * Letter Service Request Interface
 * Defines the parameters required for sending a letter
 */
export interface LetterServiceRequest {
  /** Strapi Letter-Template ID */
  templateId: string;
  /** Contact data for token replacement (e.g., {name: "John", email: "john@example.com"}) */
  contactData: Record<string, any>;
  /** Recipient email address for sending the letter */
  recipientEmail: string;
  /** Additional options for PDF generation and letter handling */
  additionalOptions?: {
    /** PDF generation options (paper size, orientation, margins, etc.) */
    pdfOptions?: {
      paper_size?: "A4" | "Letter" | "Legal" | "A5";
      orientation?: "portrait" | "landscape";
      margins?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
        unit: "cm" | "inch" | "mm";
      };
      dpi?: number;
      compression_level?: "none" | "low" | "medium" | "high";
    };
    /** Whether to return the PDF URL instead of sending it */
    returnPdf?: boolean;
    /** Whether to send the letter via email with PDF attachment */
    sendViaEmail?: boolean;
    /** Email sending options (required if sendViaEmail is true) */
    emailOptions?: {
      /** Sender email address */
      from: string;
      /** Email subject line */
      subject: string;
      /** Email body content (HTML) */
      body?: string;
      /** Contact information for email sending */
      contact?: Contact;
      /** Composition data for email sending */
      composition?: CompositionItem;
      /** Whether to ignore subscription checks */
      ignoreSubscription?: boolean;
    };
    /** Custom subject line for email notification */
    subject?: string;
    /** Include letterhead in the PDF */
    includeLetterhead?: boolean;
  };
}

/**
 * Letter Service Response Interface
 * Defines the response structure for letter sending operations
 */
export interface LetterServiceResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** URL to the generated PDF (if returnPdf is true) */
  pdfUrl?: string;
  /** Message ID or tracking identifier for the sent letter */
  messageId?: string;
  /** Error message if the operation failed */
  error?: string;
  /** Additional metadata about the letter generation */
  metadata?: {
    /** File size in bytes */
    fileSize?: number;
    /** Number of pages in the PDF */
    pageCount?: number;
    /** Processing time in milliseconds */
    processingTime?: number;
    /** Template name used */
    templateName?: string;
    /** Template ID */
    templateId?: string;
    /** Delivery method used */
    deliveryMethod?: "pdf-only" | "email-attachment";
    /** Recipient email */
    recipientEmail?: string;
  };
}

/**
 * Send a letter using Strapi Letter-Template API
 * 
 * This function integrates with the Strapi Letter-Template API to:
 * 1. Generate PDF from template with contact data
 * 2. Optionally send the PDF via email to recipient
 * 3. Return tracking information
 * 
 * @param params - Letter service request parameters
 * @returns ServiceResponse with letter sending results
 */
export async function sendLetter(
  params: LetterServiceRequest
): Promise<ServiceResponse<LetterServiceResponse>> {
  try {
    const { templateId, contactData, recipientEmail, additionalOptions } = params;
    
    // Validate required parameters
    if (!templateId) {
      return ServiceResponse.failure(
        "Template ID is required",
        { success: false, error: "Template ID is required" },
        StatusCodes.BAD_REQUEST
      );
    }

    if (!recipientEmail) {
      return ServiceResponse.failure(
        "Recipient email is required",
        { success: false, error: "Recipient email is required" },
        StatusCodes.BAD_REQUEST
      );
    }

    // Get Strapi API configuration from environment
    const strapiBaseUrl = env.STRAPI_API_URL || process.env.STRAPI_API_URL || "http://localhost:1337";
    const strapiApiToken = env.STRAPI_API_TOKEN || process.env.STRAPI_API_TOKEN;
    

    // Check if we should send via email
    if (additionalOptions?.sendViaEmail && additionalOptions?.emailOptions) {
      
      // Validate email options
      const { from, subject, contact, composition, ignoreSubscription } = additionalOptions.emailOptions;
      
      if (!from || !subject || !contact || !composition) {
        return ServiceResponse.failure(
          "Missing required email options. When sendViaEmail is true, emailOptions must include: from, subject, contact, and composition",
          { success: false, error: "Missing required email options" },
          StatusCodes.BAD_REQUEST
        );
      }

      // Use LetterEmailIntegration to send via email
      const emailIntegration = new LetterEmailIntegration(strapiBaseUrl, strapiApiToken);
      
      return await emailIntegration.sendLetterViaEmail(
        {
          templateId,
          contactData,
          recipientEmail,
          additionalOptions: {
            pdfOptions: additionalOptions.pdfOptions,
            returnPdf: false // We're sending via email, not returning PDF
          }
        },
        from,
        subject,
        contact,
        composition,
        ignoreSubscription || false
      );
    }

    // Standard PDF generation flow (without email)
    const client = new StrapiLetterClient(strapiBaseUrl, strapiApiToken);
    
    // 1. Fetch template from Strapi
    let template;
    try {
      template = await client.fetchTemplate(templateId);
    } catch (error) {
      console.error(`[Letter Channel] Failed to fetch template ${templateId}:`, error);
      
      return ServiceResponse.failure(
        `Template not found: ${error instanceof Error ? error.message : "Unknown error"}`,
        { 
          success: false, 
          error: `Template not found: ${error instanceof Error ? error.message : "Unknown error"}`,
          metadata: { templateId }
        },
        StatusCodes.NOT_FOUND
      );
    }

    // 2. Validate tokens if contact data is provided
    if (contactData && Object.keys(contactData).length > 0) {
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

    // 3. Generate PDF from template
    let pdfResult;
    try {
      pdfResult = await client.generatePdf(
        templateId,
        contactData,
        additionalOptions?.pdfOptions
      );
      
      if (!pdfResult.success) {
        throw new Error(pdfResult.error || "PDF generation failed");
      }
      
    } catch (error) {
      console.error(`[Letter Channel] PDF generation failed:`, error);
      
      return ServiceResponse.failure(
        `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { 
          success: false, 
          error: `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          metadata: { templateId, templateName: template.attributes.name }
        },
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // 4. Handle response based on options
    const response: LetterServiceResponse = {
      success: true,
      messageId: `letter-${Date.now()}-${templateId}`,
      metadata: {
        templateId,
        templateName: template.attributes.name,
        fileSize: pdfResult.file_size,
        pageCount: 1,
        processingTime: 0,
        deliveryMethod: "pdf-only",
        recipientEmail
      }
    };

    if (additionalOptions?.returnPdf) {
      // Return PDF URL
      response.pdfUrl = pdfResult.file_path || `${strapiBaseUrl}/api/letter-templates/${templateId}/generated-pdf`;
    } else {
      // PDF generated but not returned (could be saved to storage)
    }

    return ServiceResponse.success(
      "Letter processing completed successfully",
      response,
      StatusCodes.OK
    );

  } catch (error) {
    console.error("[Letter Channel] Error in sendLetter:", error);
    
    // Handle Strapi API errors specifically
    if (error instanceof StrapiApiError) {
      return ServiceResponse.failure(
        `Strapi API error: ${error.message}`,
        { 
          success: false, 
          error: error.message,
          metadata: { endpoint: error.endpoint, statusCode: error.statusCode }
        },
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    
    return ServiceResponse.failure(
      `Failed to process letter: ${error instanceof Error ? error.message : "Unknown error"}`,
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * Generate PDF from letter template without sending
 * 
 * This function is a convenience wrapper for generating PDFs without email sending
 * 
 * @param templateId - Strapi Letter-Template ID
 * @param contactData - Contact data for token replacement
 * @param pdfOptions - PDF generation options
 * @returns ServiceResponse with PDF URL and metadata
 */
export async function generateLetterPdf(
  templateId: string,
  contactData: Record<string, any>,
  pdfOptions?: LetterServiceRequest["additionalOptions"]["pdfOptions"]
): Promise<ServiceResponse<LetterServiceResponse>> {
  return sendLetter({
    templateId,
    contactData,
    recipientEmail: "pdf-only@example.com", // Dummy email for PDF-only generation
    additionalOptions: {
      returnPdf: true,
      pdfOptions
    }
  });
}

/**
 * Send letter via email with PDF attachment
 * 
 * Convenience wrapper for sending letters via email
 * 
 * @param templateId - Strapi Letter-Template ID
 * @param contactData - Contact data for token replacement
 * @param emailOptions - Email sending options
 * @param pdfOptions - PDF generation options
 * @returns ServiceResponse with sending results
 */
export async function sendLetterViaEmail(
  templateId: string,
  contactData: Record<string, any>,
  emailOptions: {
    from: string;
    to: string;
    subject: string;
    contact: Contact;
    composition: CompositionItem;
    ignoreSubscription?: boolean;
  },
  pdfOptions?: LetterServiceRequest["additionalOptions"]["pdfOptions"]
): Promise<ServiceResponse<LetterServiceResponse>> {
  return sendLetter({
    templateId,
    contactData,
    recipientEmail: emailOptions.to,
    additionalOptions: {
      sendViaEmail: true,
      emailOptions: {
        from: emailOptions.from,
        subject: emailOptions.subject,
        contact: emailOptions.contact,
        composition: emailOptions.composition,
        ignoreSubscription: emailOptions.ignoreSubscription
      },
      pdfOptions
    }
  });
}
