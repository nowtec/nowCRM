import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { StrapiLetterClient, StrapiApiError } from '../strapi-client';

// Mock fetch globally
global.fetch = jest.fn();

describe('StrapiLetterClient', () => {
  let client: StrapiLetterClient;
  const mockBaseUrl = 'http://localhost:1337';
  const mockApiToken = 'test-token-123';

  beforeEach(() => {
    client = new StrapiLetterClient(mockBaseUrl, mockApiToken);
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with base URL and token', () => {
      expect(client).toBeInstanceOf(StrapiLetterClient);
    });

    it('should remove trailing slash from base URL', () => {
      const clientWithSlash = new StrapiLetterClient('http://localhost:1337/', mockApiToken);
      // @ts-ignore - accessing private property for test
      expect(clientWithSlash.baseUrl).toBe('http://localhost:1337');
    });
  });

  describe('fetchTemplate', () => {
    const mockTemplateId = '123';
    const mockTemplateResponse = {
      data: {
        id: 123,
        attributes: {
          name: 'Test Letter Template',
          description: 'A test template',
          paper_size: 'A4',
          orientation: 'portrait',
          is_active: true
        }
      }
    };

    it('should fetch template successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplateResponse
      });

      const result = await client.fetchTemplate(mockTemplateId);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:1337/api/letter-templates/123?populate=template_file',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123'
          })
        })
      );

      expect(result).toEqual(mockTemplateResponse.data);
    });

    it('should throw StrapiApiError on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: { message: 'Template not found' } })
      });

      await expect(client.fetchTemplate(mockTemplateId)).rejects.toThrow(StrapiApiError);
      await expect(client.fetchTemplate(mockTemplateId)).rejects.toThrow('Template not found');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.fetchTemplate(mockTemplateId)).rejects.toThrow(StrapiApiError);
      await expect(client.fetchTemplate(mockTemplateId)).rejects.toThrow('Network error');
    });
  });

  describe('generatePdf', () => {
    const mockTemplateId = '123';
    const mockContactData = { name: 'John Doe', email: 'john@example.com' };
    const mockPdfResponse = {
      data: {
        success: true,
        file_path: '/uploads/letter-123.pdf',
        file_size: 1024
      }
    };

    it('should generate PDF successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPdfResponse
      });

      const result = await client.generatePdf(mockTemplateId, mockContactData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:1337/api/letter-templates/123/generate-pdf',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            contactData: mockContactData,
            options: undefined
          })
        })
      );

      expect(result).toEqual(mockPdfResponse.data);
    });

    it('should include PDF options when provided', async () => {
      const pdfOptions = { paper_size: 'A4', orientation: 'portrait' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPdfResponse
      });

      await client.generatePdf(mockTemplateId, mockContactData, pdfOptions);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            contactData: mockContactData,
            options: pdfOptions
          })
        })
      );
    });

    it('should throw error when PDF generation fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            success: false,
            error: 'Template processing failed'
          }
        })
      });

      await expect(client.generatePdf(mockTemplateId, mockContactData)).rejects.toThrow('Template processing failed');
    });
  });

  describe('validateTokens', () => {
    const mockTemplateId = '123';
    const mockContactData = { name: 'John Doe', email: 'john@example.com' };
    const mockValidationResponse = {
      data: {
        valid: true,
        validated: ['name', 'email'],
        invalid: [],
        fields: ['name', 'email'],
        summary: { total: 2, valid: 2, invalid: 0 }
      }
    };

    it('should validate tokens successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidationResponse
      });

      const result = await client.validateTokens(mockTemplateId, mockContactData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:1337/api/letter-templates/123/validate-tokens',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ contactData: mockContactData })
        })
      );

      expect(result).toEqual(mockValidationResponse.data);
    });

    it('should handle invalid tokens', async () => {
      const invalidResponse = {
        data: {
          valid: false,
          validated: ['name'],
          invalid: ['email'],
          fields: ['name', 'email'],
          summary: { total: 2, valid: 1, invalid: 1 }
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse
      });

      const result = await client.validateTokens(mockTemplateId, mockContactData);
      expect(result.valid).toBe(false);
      expect(result.invalid).toEqual(['email']);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy when API is reachable', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

      const result = await client.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.message).toBe('Strapi Letter-Template API is reachable');
    });

    it('should return unhealthy when API is unreachable', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await client.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('Strapi API unreachable');
    });

    it('should return unhealthy on 500 error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await client.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('Strapi API unreachable');
    });
  });

  describe('StrapiApiError', () => {
    it('should create error with message and status code', () => {
      const error = new StrapiApiError('Test error', 404, '/api/test');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StrapiApiError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.endpoint).toBe('/api/test');
      expect(error.name).toBe('StrapiApiError');
    });

    it('should include details in error', () => {
      const details = { url: 'http://test.com', status: 500 };
      const error = new StrapiApiError('Test error', 500, '/api/test', details);
      
      expect(error.details).toEqual(details);
    });
  });
});
