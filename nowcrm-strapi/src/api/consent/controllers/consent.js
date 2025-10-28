"use strict";

/**
 * consent controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::consent.consent', ({ strapi }) => ({
  async getCRMVersion(ctx) {
    try {
      // Retrieve the version from environment variables
      const version = process.env.NT_STACK_VERSION;
      
      // If the version variable is not set, force an error
      if (!version) {
        throw new Error("NT_STACK_VERSION is not defined.");
      }
      
      // Return the version wrapped in the desired response object
      return {
        data: [{ name: version }],
        status: 200,
        success: true,
        errorMessage: ""
      };
    } catch (error) {
      console.error("Error retrieving CRM version:", error);
      // Return the failure object as specified
      return {
        data: [{ name: "" }],
        status: 200,
        success: false,
        errorMessage: "Failed to parse response JSON."
      };
    }
  }
}));
