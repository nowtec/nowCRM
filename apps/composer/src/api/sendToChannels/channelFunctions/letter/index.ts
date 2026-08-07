/**
 * Letter Channel Function Module
 * 
 * This module provides integration with Strapi Letter-Template API for:
 * - Generating PDF letters from templates
 * - Processing contact tokens in templates
 * - Sending letters via email with PDF attachments
 * - Validating template tokens and configurations
 * 
 * Integration with Strapi Letter-Template API:
 * - Base URL: ${env.STRAPI_API_URL}/api/letter-templates
 * - Services: pdf-generator, template-processor, token-detector
 * - Endpoints: upload, preview, validate-tokens, category filtering
 */

// Export all types and interfaces
export type {
  LetterServiceRequest,
  LetterServiceResponse
} from "./send-letter";

export type {
  ProcessingStatus
} from "./process-letter";

export type {
  LetterEmailAttachment
} from "./email-integration";

// Export Strapi client and errors
export {
  StrapiLetterClient,
  StrapiApiError,
  type StrapiLetterTemplate,
  type StrapiApiResponse
} from "./strapi-client";

// Export Email Integration
export {
  LetterEmailIntegration,
  type LetterEmailAttachment
} from "./email-integration";

// Export main functions
export {
  sendLetter,
  generateLetterPdf,
  sendLetterViaEmail
} from "./send-letter";

export {
  processLetterTemplate,
  validateLetterTemplateTokens,
  getLetterTemplatePreview
} from "./process-letter";

/**
 * Letter Channel Configuration
 * Default configuration for letter channel operations
 */
export const letterChannelConfig = {
  /** Default PDF generation options */
  defaultPdfOptions: {
    paper_size: "A4" as const,
    orientation: "portrait" as const,
    dpi: 300,
    compression_level: "medium" as const
  },
  
  /** Default processing options */
  defaultProcessingOptions: {
    validateTemplate: true,
    processTokens: true,
    includeLetterhead: true
  },
  
  /** Email integration defaults */
  emailDefaults: {
    subject: "Your Letter from Template",
    body: "Please find your letter attached as a PDF.",
    attachmentFilename: "letter-{templateId}-{timestamp}.pdf"
  },
  
  /** Supported file formats for letter templates */
  supportedFormats: [".docx", ".pdf", ".html", ".htm"],
  
  /** Maximum file size for templates (10MB) */
  maxFileSize: 10 * 1024 * 1024,
  
  /** Batch processing configuration */
  batchProcessing: {
    maxBatchSize: 100,
    concurrentProcesses: 5,
    retryAttempts: 3
  }
};

/**
 * Letter Channel Constants
 * Constants used throughout the letter channel module
 */
export const LETTER_CHANNEL_CONSTANTS = {
  /** Channel identifier */
  CHANNEL_NAME: "LETTER" as const,
  
  /** Delivery methods */
  DELIVERY_METHODS: {
    PDF_ONLY: "pdf-only" as const,
    EMAIL_ATTACHMENT: "email-attachment" as const
  },
  
  /** Strapi API endpoints */
  STRAPI_ENDPOINTS: {
    BASE: "/api/letter-templates",
    UPLOAD: "/api/letter-templates/upload",
    PREVIEW: "/api/letter-templates/:id/preview",
    VALIDATE_TOKENS: "/api/letter-templates/:id/validate-tokens",
    CATEGORY: "/api/letter-templates/category/:category",
    GENERATE_PDF: "/api/letter-templates/:id/generate-pdf"
  },
  
  /** Token patterns */
  TOKEN_PATTERNS: {
    CONTACT: /@contact\.(\w+)/g,
    TEXT_BLOCK: /@text_block\.(\w+)/g,
    ANY: /@(\w+)\.(\w+)/g
  },
  
  /** Error messages */
  ERROR_MESSAGES: {
    TEMPLATE_NOT_FOUND: "Letter template not found in Strapi",
    INVALID_TEMPLATE_ID: "Invalid template ID format",
    MISSING_CONTACT_DATA: "Contact data is required for token replacement",
    PDF_GENERATION_FAILED: "Failed to generate PDF from template",
    STRAPI_CONNECTION_FAILED: "Failed to connect to Strapi API",
    TOKEN_VALIDATION_FAILED: "Token validation failed",
    FILE_SIZE_EXCEEDED: "Template file size exceeds maximum limit",
    UNSUPPORTED_FORMAT: "Unsupported template file format",
    EMAIL_OPTIONS_REQUIRED: "Email options are required when sendViaEmail is true",
    MISSING_EMAIL_FIELDS: "Missing required email fields: from, subject, contact, composition"
  }
};

/**
 * Initialize letter channel
 * Performs any required initialization for the letter channel
 * 
 * @returns Promise resolving to initialization status
 */
export async function initializeLetterChannel(): Promise<{ initialized: boolean; message: string }> {
  try {
    
    // Get Strapi API configuration
    const strapiBaseUrl = process.env.STRAPI_API_URL || "http://localhost:1337";
    const strapiApiToken = process.env.STRAPI_API_TOKEN;
    
    // Create client and test connection
    const client = new StrapiLetterClient(strapiBaseUrl, strapiApiToken);
    const health = await client.healthCheck();
    
    if (!health.healthy) {
      throw new Error(`Strapi API unreachable: ${health.message}`);
    }
    
    
    return {
      initialized: true,
      message: "Letter channel initialized successfully with email integration"
    };
  } catch (error) {
    console.error("[Letter Channel] Initialization failed:", error);
    
    return {
      initialized: false,
      message: `Letter channel initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

/**
 * Health check for letter channel
 * Verifies that the letter channel is functioning correctly
 * 
 * @returns Promise resolving to health check status
 */
export async function checkLetterChannelHealth(): Promise<{
  healthy: boolean;
  details: {
    strapiConnection: boolean;
    emailIntegration: boolean;
    servicesAvailable: string[];
    lastChecked: Date;
    error?: string;
  };
}> {
  try {
    
    // Get Strapi API configuration
    const strapiBaseUrl = process.env.STRAPI_API_URL || "http://localhost:1337";
    const strapiApiToken = process.env.STRAPI_API_TOKEN;
    
    // Create client and test connection
    const client = new StrapiLetterClient(strapiBaseUrl, strapiApiToken);
    const health = await client.healthCheck();
    
    // Check email integration availability
    const emailIntegrationAvailable = true; // Email channel is always available
    
    return {
      healthy: health.healthy && emailIntegrationAvailable,
      details: {
        strapiConnection: health.healthy,
        emailIntegration: emailIntegrationAvailable,
        servicesAvailable: health.healthy ? [
          "pdf-generation", 
          "token-processing", 
          "template-validation",
          "email-attachment-delivery"
        ] : [],
        lastChecked: new Date(),
        error: health.healthy ? undefined : health.message
      }
    };
  } catch (error) {
    console.error("[Letter Channel] Health check failed:", error);
    
    return {
      healthy: false,
      details: {
        strapiConnection: false,
        emailIntegration: false,
        servicesAvailable: [],
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error"
      }
    };
  }
}

/**
 * Example workflow for sending a letter via email
 * 
 * This demonstrates the complete workflow:
 * 1. User uploads Letter Template to Strapi
 * 2. Letter Channel receives sendLetter request with contact data
 * 3. StrapiLetterClient generates PDF from template
 * 4. LetterEmailIntegration converts PDF to attachment
 * 5. Email Channel sends letter as PDF attachment
 * 6. Response includes both email messageId and PDF URL
 * 
 * @example
 * ```typescript
 * const result = await sendLetterViaEmail(
 *   "template-123",
 *   { name: "John Doe", email: "john@example.com" },
 *   {
 *     from: "sender@example.com",
 *     to: "recipient@example.com",
 *     subject: "Your Important Letter",
 *     contact: contactObject,
 *     composition: compositionObject
 *   }
 * );
 * ```
 */
export const LETTER_WORKFLOW_EXAMPLE = {
  description: "Complete letter delivery workflow via email",
  steps: [
    "1. Upload letter template to Strapi via /api/letter-templates/upload",
    "2. Call sendLetterViaEmail() with template ID and contact data",
    "3. Strapi generates PDF with token replacement",
    "4. PDF is attached to email via Email Channel",
    "5. Email is sent with PDF attachment",
    "6. Response includes email messageId and PDF URL for tracking"
  ],
  responseExample: {
    success: true,
    messageId: "email-1234567890",
    pdfUrl: "http://strapi/uploads/letter-template-123.pdf",
    metadata: {
      templateId: "123",
      deliveryMethod: "email-attachment",
      recipientEmail: "recipient@example.com"
    }
  }
};
