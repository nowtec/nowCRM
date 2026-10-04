import type { LetterServiceRequest, LetterServiceResponse } from "./send-letter";

/**
 * Custom error class for Strapi API errors
 */
export class StrapiApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
    public details?: any
  ) {
    super(message);
    this.name = "StrapiApiError";
  }
}

/**
 * Interface for Strapi Letter Template
 */
export interface StrapiLetterTemplate {
  id: number;
  attributes: {
    name: string;
    description?: string;
    template_file?: {
      data?: {
        attributes: {
          url: string;
          name: string;
          size: number;
        };
      };
    };
    paper_size: "A4" | "Letter" | "Legal" | "A5";
    orientation: "portrait" | "landscape";
    margins?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
      unit: "cm" | "inch" | "mm";
    };
    html_preview?: string;
    extracted_text?: string;
    required_tokens?: string[];
    is_active: boolean;
  };
}

/**
 * Interface for Strapi API response
 */
export interface StrapiApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

/**
 * HTTP Client for Strapi Letter-Template API
 */
export class StrapiLetterClient {
  private baseUrl: string;
  private apiToken?: string;

  constructor(baseUrl: string, apiToken?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiToken = apiToken;
  }

  /**
   * Get authorization headers
   */
  private getHeaders(contentType: string = "application/json"): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": contentType,
    };

    if (this.apiToken) {
      headers["Authorization"] = `Bearer ${this.apiToken}`;
    }

    return headers;
  }

  /**
   * Make HTTP request to Strapi API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        let errorMessage = `Strapi API error: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // Ignore JSON parsing errors
        }

        throw new StrapiApiError(
          errorMessage,
          response.status,
          endpoint,
          { url, status: response.status }
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof StrapiApiError) {
        throw error;
      }
      
      throw new StrapiApiError(
        `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
        undefined,
        endpoint,
        { url, error: error instanceof Error ? error.message : "Unknown error" }
      );
    }
  }

  /**
   * Fetch letter template by ID
   */
  async fetchTemplate(templateId: string): Promise<StrapiLetterTemplate> {
    const endpoint = `/api/letter-templates/${templateId}?populate=template_file`;
    
    try {
      const response = await this.makeRequest<StrapiApiResponse<StrapiLetterTemplate>>(
        endpoint,
        { method: "GET" }
      );
      
      return response.data;
    } catch (error) {
      console.error(`[StrapiClient] Failed to fetch template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Generate PDF from template with contact data
   */
  async generatePdf(
    templateId: string,
    contactData: Record<string, any>,
    options?: {
      paper_size?: "A4" | "Letter" | "Legal" | "A5";
      orientation?: "portrait" | "landscape";
      returnPdf?: boolean;
    }
  ): Promise<{
    success: boolean;
    file_path?: string;
    file_size?: number;
    error?: string;
  }> {
    const endpoint = `/api/letter-templates/${templateId}/generate-pdf`;
    
    try {
      // Note: This endpoint needs to be implemented in Strapi
      // Currently using the pdf-generator service directly via custom endpoint
      const response = await this.makeRequest<{
        data: {
          success: boolean;
          file_path?: string;
          file_size?: number;
          error?: string;
        };
      }>(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify({
            contactData,
            options,
          }),
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`[StrapiClient] Failed to generate PDF for template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Validate tokens in template with contact data
   */
  async validateTokens(
    templateId: string,
    contactData: Record<string, any>
  ): Promise<{
    valid: boolean;
    validated: string[];
    invalid: string[];
    fields: string[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
    };
  }> {
    const endpoint = `/api/letter-templates/${templateId}/validate-tokens`;
    
    try {
      const response = await this.makeRequest<{
        data: {
          valid: boolean;
          validated: string[];
          invalid: string[];
          fields: string[];
          summary: {
            total: number;
            valid: number;
            invalid: number;
          };
        };
      }>(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify({ contactData }),
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`[StrapiClient] Failed to validate tokens for template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Upload template file to Strapi
   */
  async uploadTemplate(
    file: Buffer,
    fileName: string,
    metadata: {
      name: string;
      description?: string;
      paper_size?: "A4" | "Letter" | "Legal" | "A5";
      orientation?: "portrait" | "landscape";
      category?: string;
    }
  ): Promise<StrapiLetterTemplate> {
    const endpoint = `/api/letter-templates/upload`;
    
    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append("files.template_file", new Blob([file]), fileName);
      formData.append("data", JSON.stringify(metadata));

      const response = await this.makeRequest<StrapiApiResponse<StrapiLetterTemplate>>(
        endpoint,
        {
          method: "POST",
          headers: {}, // Let browser set Content-Type for FormData
          body: formData,
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`[StrapiClient] Failed to upload template ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Get template preview with sample data
   */
  async getTemplatePreview(
    templateId: string,
    sampleData?: Record<string, any>
  ): Promise<{
    previewHtml: string;
    rawHtml: string;
    cssStyles: string;
    metadata: any;
  }> {
    const endpoint = `/api/letter-templates/${templateId}/preview`;
    
    try {
      const response = await this.makeRequest<{
        data: {
          previewHtml: string;
          rawHtml: string;
          cssStyles: string;
          metadata: any;
        };
      }>(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify({ sampleData }),
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`[StrapiClient] Failed to get preview for template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Health check for Strapi API
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    message: string;
    timestamp: string;
  }> {
    const endpoint = `/api/letter-templates`;
    
    try {
      await this.makeRequest(endpoint, {
        method: "GET",
      });
      
      return {
        healthy: true,
        message: "Strapi Letter-Template API is reachable",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Strapi API unreachable: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
