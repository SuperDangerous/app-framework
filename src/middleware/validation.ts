/**
 * Validation Middleware
 * Request validation using Zod schemas with TypeScript support
 *
 * Features:
 * - Request body, params, and query validation
 * - Detailed field-level error reporting
 * - Custom error messages
 * - Async validation support
 * - Schema composition and reuse
 * - Full TypeScript type inference
 */

import { z, ZodSchema, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";
import { ApiResponse, FieldValidationError } from "../types/index.js";

/**
 * Validation options for middleware
 */
export interface ValidationOptions {
  /** Whether to stop on first error (not used with Zod) */
  abortEarly?: boolean;
  /** Whether to strip unknown properties from validated data */
  stripUnknown?: boolean;
}

/**
 * Default validation options
 */
const defaultOptions: ValidationOptions = {
  abortEarly: false,
  stripUnknown: true,
};

/**
 * Format validation errors into a consistent structure
 */
function formatValidationErrors(error: ZodError): FieldValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
}

/**
 * Create a user-friendly error message
 */
function createErrorMessage(
  errors: FieldValidationError[],
  context: string,
): string {
  if (errors.length === 1) {
    return `${context}: ${errors[0].message}`;
  }

  const fieldList = errors.map((e) => e.field).join(", ");
  return `${context}: Multiple validation errors in fields: ${fieldList}`;
}

/**
 * Validation schemas for different endpoints
 */
export const schemas = {
  // Template validation
  template: z.object({
    id: z
      .string()
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "ID must contain only letters, numbers, underscores, and hyphens",
      ),
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).optional(),
    manufacturer: z.string().min(1, "Manufacturer is required"),
    model: z.string().optional(),
    protocol: z.enum(["modbus", "bacnet"]).default("modbus"),
    metadata: z
      .object({
        manufacturer: z.string().optional(),
        models: z
          .array(
            z.object({
              name: z.string(),
              variants: z.array(z.string()).optional(),
            }),
          )
          .optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
        lastUpdated: z.string().datetime().optional(),
        version: z.string().optional(),
        author: z.string().optional(),
      })
      .optional(),
    data_points: z
      .array(
        z.object({
          name: z.string(),
          address: z.number().int().min(0).max(65535),
          type: z.enum(["coil", "discrete", "holding", "input"]),
          dataType: z.enum([
            "uint16",
            "int16",
            "uint32",
            "int32",
            "float32",
            "string",
            "bool",
            "bits",
          ]),
          writable: z.boolean().default(false),
          unit: z.string().optional(),
          min: z.number().optional(),
          max: z.number().optional(),
          scaling_factor: z.number().default(1),
          description: z.string().optional(),
          simulation_type: z
            .enum(["static", "random", "csv", "function"])
            .optional(),
          initial_value: z.any().optional(),
          csv_file: z.string().optional(),
          function_code: z.string().optional(),
          update_interval: z.number().int().min(100).optional(),
        }),
      )
      .min(1, "At least one data point is required"),
    devices: z
      .array(
        z.object({
          name: z.string(),
          device_type: z.string(),
          description: z.string().optional(),
          unit_id: z.number().int().min(1).max(247).optional(),
          data_points: z.array(z.any()).optional(),
        }),
      )
      .optional(),
    attachments: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          size: z.number(),
          mimeType: z.string(),
          uploadedAt: z.string().datetime(),
        }),
      )
      .optional(),
    intelligent: z.boolean().optional(),
    state_machine: z
      .object({
        states: z.array(
          z.object({
            name: z.string(),
            values: z.record(z.any()),
            transitions: z.array(z.any()),
          }),
        ),
        initial_state: z.string(),
        current_state: z.string().optional(),
      })
      .optional(),
    data_links: z
      .array(
        z.object({
          source: z.string(),
          targets: z.array(z.string()),
          transform: z.string().optional(),
        }),
      )
      .optional(),
  }),

  // Template update validation (partial)
  templateUpdate: z
    .object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      manufacturer: z.string().min(1).optional(),
      model: z.string().optional(),
      metadata: z.any().optional(),
      data_points: z.array(z.any()).optional(),
      devices: z.array(z.any()).optional(),
      attachments: z.array(z.any()).optional(),
      intelligent: z.boolean().optional(),
      state_machine: z.any().optional(),
      data_links: z.array(z.any()).optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Simulator validation
  simulator: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    templateId: z.string(),
    config: z.object({
      port: z.number().int().min(1).max(65535),
      host: z.string().default("0.0.0.0"),
      unitId: z.number().int().min(1).max(247).default(1),
      protocol: z.enum(["modbus", "bacnet"]),
    }),
    autoStart: z.boolean().default(false),
  }),

  // Settings validation
  settings: z.object({
    api: z
      .object({
        port: z.number().int().min(1024).max(65535),
        host: z.string(),
        cors: z.object({
          enabled: z.boolean(),
          origins: z.array(z.string()),
        }),
      })
      .optional(),
    simulator: z
      .object({
        defaultPort: z.number().int().min(1024).max(65535),
        autoRestart: z.boolean(),
        maxInstances: z.number().int().min(1).max(100),
      })
      .optional(),
    logging: z
      .object({
        level: z.enum(["error", "warn", "info", "debug"]),
        file: z.boolean(),
        console: z.boolean(),
        maxSize: z.string().regex(/^\d+[kmg]b?$/i),
        maxFiles: z.string(),
      })
      .optional(),
    ui: z
      .object({
        theme: z.enum(["light", "dark", "auto"]),
        language: z.enum(["en", "es", "fr", "de"]),
        dateFormat: z.string(),
      })
      .optional(),
  }),

  // Common ID validation
  id: z.object({
    id: z.string().min(1, "ID is required"),
  }),

  // Pagination validation
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("asc"),
  }),

  // Search/filter validation
  filter: z.object({
    search: z.string().max(100).optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    protocol: z.enum(["modbus", "bacnet"]).optional(),
    status: z.enum(["active", "inactive", "error"]).optional(),
  }),
};

/**
 * Create a validation middleware for request body
 */
export function validate<T extends ZodSchema>(
  schema: T,
  options?: ValidationOptions,
) {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const value = schema.parse(req.body);

      // Replace request body with validated and sanitized value
      if (opts.stripUnknown) {
        req.body = value;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatValidationErrors(error);
        const message = createErrorMessage(errors, "Invalid request");

        res.status(400).json({
          success: false,
          error: "Validation failed",
          message,
          errors,
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse<never>);
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate request parameters
 */
export function validateParams<T extends ZodSchema>(
  schema: T,
  options?: ValidationOptions,
) {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const value = schema.parse(req.params);

      if (opts.stripUnknown) {
        req.params = value;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatValidationErrors(error);
        const message = createErrorMessage(errors, "Invalid parameters");

        res.status(400).json({
          success: false,
          error: "Invalid parameters",
          message,
          errors,
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse<never>);
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery<T extends ZodSchema>(
  schema: T,
  options?: ValidationOptions,
) {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const value = schema.parse(req.query);

      if (opts.stripUnknown) {
        req.query = value;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatValidationErrors(error);
        const message = createErrorMessage(errors, "Invalid query");

        res.status(400).json({
          success: false,
          error: "Invalid query parameters",
          message,
          errors,
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse<never>);
        return;
      }
      next(error);
    }
  };
}

/**
 * Combined validation for body, params, and query
 */
export function validateRequest<
  T extends {
    body?: ZodSchema;
    params?: ZodSchema;
    query?: ZodSchema;
  },
>(validationSchemas: T, options?: ValidationOptions) {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: FieldValidationError[] = [];

    // Validate body
    if (validationSchemas.body) {
      try {
        const value = validationSchemas.body.parse(req.body);
        if (opts.stripUnknown) {
          req.body = value;
        }
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...formatValidationErrors(error));
        }
      }
    }

    // Validate params
    if (validationSchemas.params) {
      try {
        const value = validationSchemas.params.parse(req.params);
        if (opts.stripUnknown) {
          req.params = value;
        }
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...formatValidationErrors(error));
        }
      }
    }

    // Validate query
    if (validationSchemas.query) {
      try {
        const value = validationSchemas.query.parse(req.query);
        if (opts.stripUnknown) {
          req.query = value;
        }
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...formatValidationErrors(error));
        }
      }
    }

    if (errors.length > 0) {
      const message = createErrorMessage(errors, "Request validation failed");

      res.status(400).json({
        success: false,
        error: "Validation failed",
        message,
        errors,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse<never>);
      return;
    }

    next();
  };
}

/**
 * Error type for async validation
 */
interface AsyncValidationError {
  field?: string;
  message?: string;
}

/**
 * Async validation wrapper for custom validation logic
 */
export function validateAsync(validationFn: (req: Request) => Promise<void>) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await validationFn(req);
      next();
    } catch (error: unknown) {
      const validationError = error as AsyncValidationError;
      const fieldError: FieldValidationError = {
        field: validationError.field || "unknown",
        message: validationError.message || "Validation failed",
      };

      res.status(400).json({
        success: false,
        error: "Validation failed",
        message: fieldError.message,
        errors: [fieldError],
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse<never>);
    }
  };
}

/**
 * Create a conditional validation middleware
 */
export function validateIf<T extends ZodSchema>(
  condition: (req: Request) => boolean,
  schema: T,
  options?: ValidationOptions,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (condition(req)) {
      validate(schema, options)(req, res, next);
      return;
    }
    next();
  };
}

/**
 * Schema composition helpers using Zod's built-in methods
 */
export const compose = {
  /**
   * Merge multiple schemas
   */
  merge: <T extends ZodSchema, U extends ZodSchema>(schema1: T, schema2: U) => {
    if (schema1 instanceof z.ZodObject && schema2 instanceof z.ZodObject) {
      return schema1.merge(schema2);
    }
    return z.intersection(schema1, schema2);
  },

  /**
   * Make all fields optional
   */
  partial: <T extends z.ZodObject<z.ZodRawShape>>(schema: T) => {
    return schema.partial();
  },

  /**
   * Make specific fields required
   */
  require: <T extends z.ZodObject<z.ZodRawShape>>(
    schema: T,
    fields: Array<keyof T["shape"]>,
  ) => {
    const partialSchema = schema.partial();
    const requiredOverrides: Record<string, z.ZodTypeAny> = {};
    fields.forEach((field) => {
      const fieldSchema = schema.shape[field as string];
      if (fieldSchema) {
        requiredOverrides[field as string] = fieldSchema;
      }
    });
    return partialSchema.extend(requiredOverrides);
  },

  /**
   * Pick specific fields from a schema
   */
  pick: <T extends z.ZodObject<z.ZodRawShape>>(
    schema: T,
    fields: Array<keyof T["shape"]>,
  ) => {
    const picked: Record<string, z.ZodTypeAny> = {};
    fields.forEach((field) => {
      if (schema.shape[field as string]) {
        picked[field as string] = schema.shape[field as string];
      }
    });
    return z.object(picked);
  },

  /**
   * Omit specific fields from a schema
   */
  omit: <T extends z.ZodObject<z.ZodRawShape>>(
    schema: T,
    fields: Array<keyof T["shape"]>,
  ) => {
    const omitKeys = fields.reduce(
      (acc, field) => {
        acc[field as string] = true;
        return acc;
      },
      {} as Record<string, true>,
    );
    return schema.omit(omitKeys);
  },
};

/**
 * Export Zod for direct use
 */
export { z, z as zod };

export default {
  validate,
  validateParams,
  validateQuery,
  validateRequest,
  validateAsync,
  validateIf,
  schemas,
  compose,
  z,
};
