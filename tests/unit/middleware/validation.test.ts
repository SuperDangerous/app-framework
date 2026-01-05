/**
 * Unit tests for Validation Middleware
 */

import {
  validate,
  validateParams,
  validateQuery,
  validateRequest,
  validateAsync,
  validateIf,
  compose,
  schemas,
  z,
} from '../../../src/middleware/validation';
import type { Request, Response, NextFunction } from 'express';

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {}
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
  });

  describe('validate (body)', () => {
    test('passes valid request body', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().min(0)
      });

      mockReq.body = { name: 'Test', age: 25 };
      const middleware = validate(schema);
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('rejects invalid request body', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().min(0)
      });

      mockReq.body = { age: -5 }; // Missing name, invalid age
      const middleware = validate(schema);
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: expect.any(Array)
        })
      );
    });

    test('strips unknown properties', () => {
      const schema = z.object({
        name: z.string()
      });

      mockReq.body = { name: 'Test', unknown: 'value' };
      const middleware = validate(schema);
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual({ name: 'Test' });
    });
  });

  describe('validateParams', () => {
    test('validates request params', () => {
      const schema = z.object({
        id: z.string().uuid()
      });

      mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      const middleware = validateParams(schema);
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('rejects invalid params', () => {
      const schema = z.object({
        id: z.string().uuid()
      });

      mockReq.params = { id: 'not-a-uuid' };
      const middleware = validateParams(schema);
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateQuery', () => {
    test('validates query parameters', () => {
      const schema = z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(10)
      });

      mockReq.query = { page: '2', limit: '20' };
      const middleware = validateQuery(schema);
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query).toEqual({ page: 2, limit: 20 }); // Parsed to numbers
    });

    test('applies defaults for missing query params', () => {
      const schema = z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(10)
      });

      mockReq.query = {};
      const middleware = validateQuery(schema);
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query).toEqual({ page: 1, limit: 10 });
    });

    test('rejects invalid query params', () => {
      const schema = z.object({
        page: z.coerce.number().min(1),
        limit: z.coerce.number().min(1).max(100)
      });

      mockReq.query = { page: '0', limit: '200' };
      const middleware = validateQuery(schema);
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('error formatting', () => {
    test('formats validation errors correctly', () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8)
      });

      mockReq.body = { email: 'invalid', password: '123' };
      const middleware = validate(schema);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('email')
            }),
            expect.objectContaining({
              field: 'password',
              message: expect.stringContaining('8')
            })
          ])
        })
      );
    });
  });

  describe('validateRequest (combined)', () => {
    test('validates body, params, and query together', () => {
      const bodySchema = z.object({ name: z.string() });
      const paramsSchema = z.object({ id: z.string().uuid() });
      const querySchema = z.object({ limit: z.coerce.number().min(1) });

      mockReq.body = { name: 'Test' };
      mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      mockReq.query = { limit: '10' };

      const middleware = validateRequest({
        body: bodySchema,
        params: paramsSchema,
        query: querySchema
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('accumulates errors from multiple sources', () => {
      const bodySchema = z.object({ name: z.string().min(1) });
      const paramsSchema = z.object({ id: z.string().uuid() });

      mockReq.body = { name: '' }; // Invalid - empty string
      mockReq.params = { id: 'not-a-uuid' }; // Invalid UUID

      const middleware = validateRequest({
        body: bodySchema,
        params: paramsSchema
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'name' }),
            expect.objectContaining({ field: 'id' })
          ])
        })
      );
    });

    test('validates only body when only body schema provided', () => {
      const bodySchema = z.object({ name: z.string() });

      mockReq.body = { name: 'Test' };

      const middleware = validateRequest({ body: bodySchema });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateAsync', () => {
    test('calls next on successful async validation', async () => {
      const asyncValidator = vi.fn().mockResolvedValue(undefined);
      const middleware = validateAsync(asyncValidator);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(asyncValidator).toHaveBeenCalledWith(mockReq);
      expect(mockNext).toHaveBeenCalled();
    });

    test('returns 400 on async validation failure', async () => {
      const asyncValidator = vi.fn().mockRejectedValue({
        field: 'email',
        message: 'Email already exists'
      });
      const middleware = validateAsync(asyncValidator);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: [{ field: 'email', message: 'Email already exists' }]
        })
      );
    });

    test('handles errors without field property', async () => {
      const asyncValidator = vi.fn().mockRejectedValue({
        message: 'Unknown error'
      });
      const middleware = validateAsync(asyncValidator);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [{ field: 'unknown', message: 'Unknown error' }]
        })
      );
    });
  });

  describe('validateIf (conditional)', () => {
    test('validates when condition is true', () => {
      const schema = z.object({ name: z.string().min(1) });
      const condition = (req: Request) => req.method === 'POST';

      mockReq.method = 'POST';
      mockReq.body = { name: '' }; // Invalid

      const middleware = validateIf(condition, schema);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('skips validation when condition is false', () => {
      const schema = z.object({ name: z.string().min(1) });
      const condition = (req: Request) => req.method === 'POST';

      mockReq.method = 'GET';
      mockReq.body = { name: '' }; // Would be invalid, but skipped

      const middleware = validateIf(condition, schema);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('passes valid data when condition is true', () => {
      const schema = z.object({ name: z.string().min(1) });
      const condition = () => true;

      mockReq.body = { name: 'Valid' };

      const middleware = validateIf(condition, schema);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('compose helpers', () => {
    describe('merge', () => {
      test('merges two object schemas', () => {
        const schema1 = z.object({ name: z.string() });
        const schema2 = z.object({ age: z.number() });

        const merged = compose.merge(schema1, schema2);
        const result = merged.safeParse({ name: 'Test', age: 25 });

        expect(result.success).toBe(true);
      });

      test('uses intersection for non-object schemas', () => {
        const schema1 = z.string();
        const schema2 = z.string().min(1);

        const merged = compose.merge(schema1, schema2);
        const result = merged.safeParse('test');

        expect(result.success).toBe(true);
      });
    });

    describe('partial', () => {
      test('makes all fields optional', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number()
        });

        const partialSchema = compose.partial(schema);
        const result = partialSchema.safeParse({});

        expect(result.success).toBe(true);
      });
    });

    describe('require', () => {
      test('makes specific fields required while others remain optional', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number(),
          email: z.string()
        });

        const requiredSchema = compose.require(schema, ['name']);

        // Should fail without name
        const resultWithoutName = requiredSchema.safeParse({ age: 25 });
        expect(resultWithoutName.success).toBe(false);

        // Should pass with just name
        const resultWithName = requiredSchema.safeParse({ name: 'Test' });
        expect(resultWithName.success).toBe(true);
      });
    });

    describe('pick', () => {
      test('picks specific fields from schema', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number(),
          email: z.string()
        });

        const pickedSchema = compose.pick(schema, ['name', 'age']);

        const result = pickedSchema.safeParse({ name: 'Test', age: 25 });
        expect(result.success).toBe(true);

        // Email should be stripped
        const parsed = pickedSchema.parse({ name: 'Test', age: 25, email: 'test@test.com' });
        expect(parsed).not.toHaveProperty('email');
      });
    });

    describe('omit', () => {
      test('omits specific fields from schema', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number(),
          password: z.string()
        });

        const omittedSchema = compose.omit(schema, ['password']);

        const result = omittedSchema.safeParse({ name: 'Test', age: 25 });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('predefined schemas', () => {
    describe('schemas.id', () => {
      test('validates valid ID', () => {
        const result = schemas.id.safeParse({ id: 'test-123' });
        expect(result.success).toBe(true);
      });

      test('rejects empty ID', () => {
        const result = schemas.id.safeParse({ id: '' });
        expect(result.success).toBe(false);
      });
    });

    describe('schemas.pagination', () => {
      test('validates pagination params', () => {
        const result = schemas.pagination.safeParse({
          page: 1,
          limit: 20,
          sort: 'name',
          order: 'asc'
        });
        expect(result.success).toBe(true);
      });

      test('applies defaults', () => {
        const result = schemas.pagination.parse({});
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
        expect(result.order).toBe('asc');
      });

      test('rejects invalid page number', () => {
        const result = schemas.pagination.safeParse({ page: 0 });
        expect(result.success).toBe(false);
      });

      test('rejects limit over 100', () => {
        const result = schemas.pagination.safeParse({ limit: 101 });
        expect(result.success).toBe(false);
      });
    });

    describe('schemas.filter', () => {
      test('validates filter params', () => {
        const result = schemas.filter.safeParse({
          search: 'test',
          protocol: 'modbus',
          status: 'active'
        });
        expect(result.success).toBe(true);
      });

      test('rejects invalid protocol', () => {
        const result = schemas.filter.safeParse({ protocol: 'invalid' });
        expect(result.success).toBe(false);
      });

      test('rejects invalid status', () => {
        const result = schemas.filter.safeParse({ status: 'invalid' });
        expect(result.success).toBe(false);
      });
    });

    describe('schemas.template', () => {
      test('validates minimal valid template', () => {
        const result = schemas.template.safeParse({
          id: 'test-template',
          name: 'Test Template',
          manufacturer: 'Test Corp',
          data_points: [{
            name: 'Temperature',
            address: 100,
            type: 'holding',
            dataType: 'float32'
          }]
        });
        expect(result.success).toBe(true);
      });

      test('rejects template without data_points', () => {
        const result = schemas.template.safeParse({
          id: 'test-template',
          name: 'Test Template',
          manufacturer: 'Test Corp',
          data_points: []
        });
        expect(result.success).toBe(false);
      });

      test('validates address range (0-65535)', () => {
        const validResult = schemas.template.safeParse({
          id: 'test',
          name: 'Test',
          manufacturer: 'Test',
          data_points: [{ name: 'Test', address: 65535, type: 'holding', dataType: 'uint16' }]
        });
        expect(validResult.success).toBe(true);

        const invalidResult = schemas.template.safeParse({
          id: 'test',
          name: 'Test',
          manufacturer: 'Test',
          data_points: [{ name: 'Test', address: 65536, type: 'holding', dataType: 'uint16' }]
        });
        expect(invalidResult.success).toBe(false);
      });

      test('validates protocol enum', () => {
        const modbusResult = schemas.template.safeParse({
          id: 'test',
          name: 'Test',
          manufacturer: 'Test',
          protocol: 'modbus',
          data_points: [{ name: 'Test', address: 0, type: 'holding', dataType: 'uint16' }]
        });
        expect(modbusResult.success).toBe(true);

        const bacnetResult = schemas.template.safeParse({
          id: 'test',
          name: 'Test',
          manufacturer: 'Test',
          protocol: 'bacnet',
          data_points: [{ name: 'Test', address: 0, type: 'holding', dataType: 'uint16' }]
        });
        expect(bacnetResult.success).toBe(true);
      });
    });

    describe('schemas.templateUpdate', () => {
      test('requires at least one field', () => {
        const emptyResult = schemas.templateUpdate.safeParse({});
        expect(emptyResult.success).toBe(false);

        const withFieldResult = schemas.templateUpdate.safeParse({ name: 'Updated' });
        expect(withFieldResult.success).toBe(true);
      });
    });

    describe('schemas.settings', () => {
      test('validates API settings', () => {
        const result = schemas.settings.safeParse({
          api: {
            port: 8080,
            host: 'localhost',
            cors: { enabled: true, origins: ['http://localhost:3000'] }
          }
        });
        expect(result.success).toBe(true);
      });

      test('rejects port below 1024', () => {
        const result = schemas.settings.safeParse({
          api: { port: 80, host: 'localhost', cors: { enabled: false, origins: [] } }
        });
        expect(result.success).toBe(false);
      });

      test('validates logging settings', () => {
        const result = schemas.settings.safeParse({
          logging: {
            level: 'debug',
            file: true,
            console: true,
            maxSize: '10mb',
            maxFiles: '7d'
          }
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('non-ZodError handling', () => {
    test('passes non-Zod errors to next', () => {
      // Create a schema that throws a non-Zod error
      const schema = z.object({
        name: z.string()
      }).transform(() => {
        throw new Error('Custom error');
      });

      mockReq.body = { name: 'Test' };
      const middleware = validate(schema);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
