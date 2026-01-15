import mongoose from 'mongoose';

interface IContact {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
}

interface IExperience {
  title: string;
  company: string;
  location: string;
  dates: string;
  responsibilities: string[];
}

interface IEducation {
  degree: string;
  field: string;
  institution: string;
  location: string;
  dates: string;
}

interface IParsedCV {
  userId: string;
  cvId?: string; // Reference to PostgreSQL
  filename: string;
  contact_info: IContact;
  skills: string[];
  experience: IExperience[];
  education: IEducation[];
  summary?: string;
  parsedAt: Date;
}

const parsedCVSchema = new mongoose.Schema<IParsedCV>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  cvId: String,
  filename: String,
  contact_info: {
    name: String,
    email: String,
    phone: String,
    location: String
  },
  skills: [String],
  experience: [{
    title: String,
    company: String,
    location: String,
    dates: String,
    responsibilities: [String]
  }],
  education: [{
    degree: String,
    field: String,
    institution: String,
    location: String,
    dates: String
  }],
  summary: String,
  parsedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export const ParsedCV = mongoose.model<IParsedCV>('ParsedCV', parsedCVSchema);