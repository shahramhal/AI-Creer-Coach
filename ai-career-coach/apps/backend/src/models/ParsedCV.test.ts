import { describe, it, expect, vi } from 'vitest';

const captured = vi.hoisted(() => ({ schema: null as any, modelName: '' }));

vi.mock('mongoose', async (importOriginal) => {
  const realMongoose = await importOriginal<typeof import('mongoose')>();
  return {
    default: {
      ...realMongoose,
      Schema: realMongoose.Schema,
      models: {},
      model: vi.fn((name: string, schema: any) => {
        captured.modelName = name;
        captured.schema = schema;
        return realMongoose.model(name, schema);
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

import { ParsedCV } from './ParsedCV.js';

describe('ParsedCV Mongoose Model - Schema Validation', () => {
  it('should register the model with name "ParsedCV"', () => {
    expect(captured.modelName).toBe('ParsedCV');
  });

  it('should define user_id as a required String field', () => {
    const path = captured.schema.path('user_id');
    expect(path).toBeDefined();
    expect(path.instance).toBe('String');
    expect(path.isRequired).toBe(true);
  });

  it('should define cv_id as an optional String field', () => {
    const path = captured.schema.path('cv_id');
    expect(path).toBeDefined();
    expect(path.instance).toBe('String');
    expect(path.isRequired).toBeFalsy();
  });

  it('should define filename as a String field', () => {
    const path = captured.schema.path('filename');
    expect(path).toBeDefined();
    expect(path.instance).toBe('String');
  });

  it('should define raw_text as a String field', () => {
    const path = captured.schema.path('raw_text');
    expect(path).toBeDefined();
    expect(path.instance).toBe('String');
  });

  it('should define contact_info subdocument with extended fields', () => {
    expect(captured.schema.path('contact_info.name')).toBeDefined();
    expect(captured.schema.path('contact_info.email')).toBeDefined();
    expect(captured.schema.path('contact_info.phone')).toBeDefined();
    expect(captured.schema.path('contact_info.location')).toBeDefined();
    expect(captured.schema.path('contact_info.linkedin')).toBeDefined();
    expect(captured.schema.path('contact_info.github')).toBeDefined();
    expect(captured.schema.path('contact_info.website')).toBeDefined();
  });

  it('should define skills as an Array', () => {
    const path = captured.schema.path('skills');
    expect(path).toBeDefined();
    expect(path.instance).toBe('Array');
  });

  it('should define experience as an Array with all expected nested fields', () => {
    const path = captured.schema.path('experience');
    expect(path).toBeDefined();
    expect(path.instance).toBe('Array');

    const expSchema = path.schema;
    expect(expSchema.path('title')).toBeDefined();
    expect(expSchema.path('company')).toBeDefined();
    expect(expSchema.path('location')).toBeDefined();
    expect(expSchema.path('dates')).toBeDefined();
    expect(expSchema.path('startDate')).toBeDefined();
    expect(expSchema.path('endDate')).toBeDefined();
    expect(expSchema.path('responsibilities')).toBeDefined();
    expect(expSchema.path('achievements')).toBeDefined();
    expect(expSchema.path('description')).toBeDefined();
  });

  it('should define education as an Array with all expected nested fields', () => {
    const path = captured.schema.path('education');
    expect(path).toBeDefined();
    expect(path.instance).toBe('Array');

    const eduSchema = path.schema;
    expect(eduSchema.path('degree')).toBeDefined();
    expect(eduSchema.path('field')).toBeDefined();
    expect(eduSchema.path('institution')).toBeDefined();
    expect(eduSchema.path('location')).toBeDefined();
    expect(eduSchema.path('dates')).toBeDefined();
    expect(eduSchema.path('startDate')).toBeDefined();
    expect(eduSchema.path('endDate')).toBeDefined();
    expect(eduSchema.path('gpa')).toBeDefined();
  });

  it('should define certifications, languages, and projects as Arrays', () => {
    expect(captured.schema.path('certifications').instance).toBe('Array');
    expect(captured.schema.path('languages').instance).toBe('Array');
    expect(captured.schema.path('projects').instance).toBe('Array');
  });

  it('should define summary as an optional String field', () => {
    const path = captured.schema.path('summary');
    expect(path).toBeDefined();
    expect(path.instance).toBe('String');
    expect(path.isRequired).toBeFalsy();
  });

  it('should define created_at as a Date field with a default value', () => {
    const path = captured.schema.path('created_at');
    expect(path).toBeDefined();
    expect(path.instance).toBe('Date');
    expect(path.defaultValue).toBeDefined();
  });

  it('should not have automatic timestamps (uses created_at manually)', () => {
    expect(captured.schema.options.timestamps).toBeFalsy();
  });

  it('should target the parsed_cvs collection', () => {
    expect(captured.schema.options.collection).toBe('parsed_cvs');
  });

  it('should reject a document missing the required user_id field', () => {
    const doc = new ParsedCV({
      filename: 'test.pdf',
      skills: [],
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err!.errors.user_id).toBeDefined();
  });

  it('should accept a valid document with all required fields', () => {
    const doc = new ParsedCV({
      user_id: 'user-uuid-123',
      filename: 'resume.pdf',
      raw_text: 'John Doe, Software Engineer',
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

    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });
});
