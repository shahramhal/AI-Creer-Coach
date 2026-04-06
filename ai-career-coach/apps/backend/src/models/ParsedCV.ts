import mongoose, { Document, Model } from 'mongoose';

export interface IContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface IExperience {
  title?: string;
  company?: string;
  location?: string;
  dates?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  responsibilities?: string[];
  achievements?: string[];
  description?: string;
}

export interface IEducation {
  degree?: string;
  field?: string;
  institution?: string;
  location?: string;
  dates?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  achievements?: string[];
}

export interface IParsedCV {
  user_id: string;
  cv_id?: string;
  filename?: string;
  raw_text?: string;
  metadata?: {
    raw_text?: string;
  };
  contact_info?: IContactInfo;
  skills?: string[];
  experience?: IExperience[];
  education?: IEducation[];
  summary?: string;
  certifications?: string[];
  languages?: string[];
  projects?: string[];
  created_at: Date;
}

export type ParsedCVDocument = IParsedCV & Document;

const contactInfoSchema = new mongoose.Schema<IContactInfo>(
  {
    name: String,
    email: String,
    phone: String,
    location: String,
    linkedin: String,
    github: String,
    website: String,
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema<IExperience>(
  {
    title: String,
    company: String,
    location: String,
    dates: String,
    startDate: String,
    endDate: String,
    duration: String,
    responsibilities: [String],
    achievements: [String],
    description: String,
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema<IEducation>(
  {
    degree: String,
    field: String,
    institution: String,
    location: String,
    dates: String,
    startDate: String,
    endDate: String,
    gpa: String,
    achievements: [String],
  },
  { _id: false }
);

const parsedCVSchema = new mongoose.Schema<IParsedCV>(
  {
    user_id: { type: String, required: true, index: true },
    cv_id: String,
    filename: String,
    raw_text: String,
    metadata: {
      raw_text: String,
    },
    contact_info: contactInfoSchema,
    skills: [String],
    experience: [experienceSchema],
    education: [educationSchema],
    summary: String,
    certifications: [String],
    languages: [String],
    projects: [String],
    created_at: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    collection: 'parsed_cvs',
  }
);

export const ParsedCV: Model<IParsedCV> = mongoose.models.ParsedCV
  ? (mongoose.models.ParsedCV as Model<IParsedCV>)
  : mongoose.model<IParsedCV>('ParsedCV', parsedCVSchema);
