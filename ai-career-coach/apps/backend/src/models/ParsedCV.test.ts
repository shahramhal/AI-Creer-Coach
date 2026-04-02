// apps/backend/src/models/ParsedCV.test.ts
//
// Strategy: Override the global mongoose mock with a partial mock that uses the
// REAL Schema class but stubs out mongoose.model() to capture the schema argument.
// This lets us test the actual schema definition without hitting MongoDB.

import { describe, it, expect, vi } from 'vitest';

// Use vi.hoisted() so these are initialized before the vi.mock factory runs
const captured = vi.hoisted(() => ({ schema: null as any, modelName: '' }));

vi.mock('mongoose', async (importOriginal) => {
  const realMongoose = await importOriginal<typeof import('mongoose')>();
  return {
    default: {
      ...realMongoose,
      Schema: realMongoose.Schema,
      model: vi.fn((name: string, schema: any) => {
        captured.modelName = name;
        captured.schema = schema;
        // Return a minimal model-like constructor backed by the real schema
        const ModelConstructor = realMongoose.model(name, schema);
        return ModelConstructor;
      }),
      connection: {
        readyState: 1,
        db: null,
        on: vi.fn(),
        close: vi.fn(),
      },
      connect: vi.fn(),
      Types: realMongoose.Types,
    },
    Schema: realMongoose.Schema,
    model: vi.fn(),
    Types: realMongoose.Types,
  };
});

// Import the module - this triggers the schema definition and mongoose.model() call
import { ParsedCV } from './ParsedCV.js';

describe('ParsedCV Mongoose Model - Schema Validation', () => {
  it('should register the model with name "ParsedCV"', () => {
    expect(captured.modelName).toBe('ParsedCV');
  });

  it('should define userId as a required String field', () => {
    const userIdPath = captured.schema.path('userId');
    expect(userIdPath).toBeDefined();
    expect(userIdPath.instance).toBe('String');
    expect(userIdPath.isRequired).toBe(true);
  });

  it('should define cvId as an optional String field', () => {
    const cvIdPath = captured.schema.path('cvId');
    expect(cvIdPath).toBeDefined();
    expect(cvIdPath.instance).toBe('String');
    expect(cvIdPath.isRequired).toBeFalsy();
  });

  it('should define filename as a String field', () => {
    const filenamePath = captured.schema.path('filename');
    expect(filenamePath).toBeDefined();
    expect(filenamePath.instance).toBe('String');
  });

  it('should define contact_info subdocument with name, email, phone, location', () => {
    expect(captured.schema.path('contact_info.name')).toBeDefined();
    expect(captured.schema.path('contact_info.email')).toBeDefined();
    expect(captured.schema.path('contact_info.phone')).toBeDefined();
    expect(captured.schema.path('contact_info.location')).toBeDefined();
  });

  it('should define skills as an Array', () => {
    const skillsPath = captured.schema.path('skills');
    expect(skillsPath).toBeDefined();
    expect(skillsPath.instance).toBe('Array');
  });

  it('should define experience as an Array with nested title, company, location, dates, responsibilities', () => {
    const experiencePath = captured.schema.path('experience');
    expect(experiencePath).toBeDefined();
    expect(experiencePath.instance).toBe('Array');

    const experienceSchema = experiencePath.schema;
    expect(experienceSchema.path('title')).toBeDefined();
    expect(experienceSchema.path('company')).toBeDefined();
    expect(experienceSchema.path('location')).toBeDefined();
    expect(experienceSchema.path('dates')).toBeDefined();
    expect(experienceSchema.path('responsibilities')).toBeDefined();
  });

  it('should define education as an Array with nested degree, field, institution, location, dates', () => {
    const educationPath = captured.schema.path('education');
    expect(educationPath).toBeDefined();
    expect(educationPath.instance).toBe('Array');

    const educationSchema = educationPath.schema;
    expect(educationSchema.path('degree')).toBeDefined();
    expect(educationSchema.path('field')).toBeDefined();
    expect(educationSchema.path('institution')).toBeDefined();
    expect(educationSchema.path('location')).toBeDefined();
    expect(educationSchema.path('dates')).toBeDefined();
  });

  it('should define summary as an optional String field', () => {
    const summaryPath = captured.schema.path('summary');
    expect(summaryPath).toBeDefined();
    expect(summaryPath.instance).toBe('String');
    expect(summaryPath.isRequired).toBeFalsy();
  });

  it('should define parsedAt as a Date field with a default value', () => {
    const parsedAtPath = captured.schema.path('parsedAt');
    expect(parsedAtPath).toBeDefined();
    expect(parsedAtPath.instance).toBe('Date');
    expect(parsedAtPath.defaultValue).toBeDefined();
  });

  it('should have timestamps enabled (createdAt, updatedAt)', () => {
    expect(captured.schema.options.timestamps).toBe(true);
  });

  it('should reject a document missing the required userId field', () => {
    const invalidDocument = new ParsedCV({
      filename: 'test.pdf',
      contact_info: { name: 'John' },
      skills: [],
      experience: [],
      education: [],
    });

    const validationError = invalidDocument.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError!.errors.userId).toBeDefined();
  });

  it('should accept a valid document with all required fields', () => {
    const validDocument = new ParsedCV({
      userId: 'user-uuid-123',
      filename: 'resume.pdf',
      contact_info: { name: 'Jane Doe', email: 'jane@example.com' },
      skills: ['JavaScript', 'TypeScript'],
      experience: [{
        title: 'Engineer',
        company: 'Corp',
        location: 'London',
        dates: '2020-2024',
        responsibilities: ['Built APIs'],
      }],
      education: [{
        degree: 'BSc',
        field: 'CS',
        institution: 'University',
        location: 'London',
        dates: '2016-2020',
      }],
      summary: 'Experienced engineer',
    });

    const validationError = validDocument.validateSync();
    expect(validationError).toBeUndefined();
  });
});
