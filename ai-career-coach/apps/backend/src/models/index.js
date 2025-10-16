// MongoDB Schema for AI Career Coach
// Purpose: Flexible document storage for jobs, parsed CVs, and analytics

const mongoose = require('mongoose');

// =====================================================
// DATABASE CONNECTION
// =====================================================

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_career_coach', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');
        
        // Create indexes after connection
        await createIndexes();
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// =====================================================
// JOB POSTINGS SCHEMA
// =====================================================

const jobPostingSchema = new mongoose.Schema({
    // Unique identifier from source
    external_id: {
        type: String,
        required: true,
        index: true
    },
    
    // Basic job information
    title: {
        type: String,
        required: true,
        index: 'text'  // Enable text search
    },
    company: {
        name: String,
        id: String,
        logo_url: String,
        size: String,  // startup, small, medium, large, enterprise
        industry: String
    },
    
    // Location details
    location: {
        city: String,
        state: String,
        country: String,
        remote_type: {
            type: String,
            enum: ['onsite', 'remote', 'hybrid'],
            index: true
        },
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    
    // Job details
    description: {
        type: String,
        index: 'text'  // Enable text search
    },
    requirements: [String],
    responsibilities: [String],
    benefits: [String],
    
    // Employment details
    employment_type: {
        type: String,
        enum: ['full_time', 'part_time', 'contract', 'internship', 'temporary'],
        index: true
    },
    experience_level: {
        type: String,
        enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'],
        index: true
    },
    years_experience_min: Number,
    years_experience_max: Number,
    
    // Compensation
    salary: {
        min: Number,
        max: Number,
        currency: String,
        period: String,  // yearly, monthly, hourly
        is_estimated: Boolean
    },
    
    // Skills and qualifications
    skills_required: [{
        name: String,
        importance: {
            type: String,
            enum: ['required', 'preferred', 'nice_to_have']
        },
        years_needed: Number
    }],
    education_required: {
        level: String,  // high_school, bachelors, masters, phd
        field: [String]
    },
    certifications: [String],
    
    // Source and metadata
    source: {
        type: String,
        required: true,
        index: true  // indeed, linkedin, glassdoor, etc
    },
    source_url: String,
    
    // Dates
    posted_date: {
        type: Date,
        index: true
    },
    expiry_date: Date,
    scraped_date: {
        type: Date,
        default: Date.now,
        index: true
    },
    last_updated: {
        type: Date,
        default: Date.now
    },
    
    // Status
    is_active: {
        type: Boolean,
        default: true,
        index: true
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    
    // ML-generated fields
    embedding: {
        type: [Number],  // 384-dimensional vector from sentence-transformers
        index: '2dsphere'  // Enable vector similarity search
    },
    skill_embeddings: mongoose.Schema.Types.Mixed,  // Multiple skill vectors
    
    // Analytics
    view_count: {
        type: Number,
        default: 0
    },
    application_count: {
        type: Number,
        default: 0
    },
    save_count: {
        type: Number,
        default: 0
    },
    
    // Quality metrics
    quality_score: Number,  // 0-100 based on completeness
    ats_keywords: [String],  // Extracted ATS-friendly keywords
    
    // Raw data backup
    raw_html: String,  // Original scraped HTML
    raw_text: String   // Cleaned text version
});

// Compound indexes for common queries
jobPostingSchema.index({ company: 1, posted_date: -1 });
jobPostingSchema.index({ 'location.city': 1, 'location.state': 1 });
jobPostingSchema.index({ skills_required: 1, experience_level: 1 });

// =====================================================
// PARSED CV SCHEMA
// =====================================================

const parsedCVSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    cv_id: {
        type: String,  // Reference to PostgreSQL cvs table
        required: true,
        index: true
    },
    
    // Parsing metadata
    parse_version: String,  // Parser version used
    parse_timestamp: {
        type: Date,
        default: Date.now
    },
    parse_duration_ms: Number,
    confidence_scores: {
        overall: Number,
        contact: Number,
        experience: Number,
        education: Number,
        skills: Number
    },
    
    // Extracted contact information
    contact: {
        full_name: String,
        email: String,
        phone: String,
        linkedin: String,
        github: String,
        portfolio: String,
        location: {
            city: String,
            state: String,
            country: String,
            full_address: String
        }
    },
    
    // Professional summary
    summary: {
        text: String,
        keywords: [String],
        tone: String  // professional, casual, academic
    },
    
    // Work experience (detailed)
    experience: [{
        company: String,
        title: String,
        location: String,
        start_date: Date,
        end_date: Date,
        is_current: Boolean,
        duration_months: Number,
        description: String,
        responsibilities: [String],
        achievements: [String],
        technologies: [String],
        // NER extracted entities
        entities: {
            metrics: [String],  // "increased sales by 25%"
            projects: [String],
            teams: [String]
        }
    }],
    
    // Education (detailed)
    education: [{
        institution: String,
        degree: String,
        field: String,
        start_date: Date,
        end_date: Date,
        gpa: String,
        honors: [String],
        coursework: [String],
        thesis_title: String
    }],
    
    // Skills (comprehensive)
    skills: {
        technical: [{
            name: String,
            category: String,
            proficiency: String,
            years: Number,
            context: [String]  // Where skill was mentioned
        }],
        soft: [String],
        languages: [{
            name: String,
            proficiency: String  // native, fluent, professional, basic
        }],
        tools: [String],
        frameworks: [String],
        databases: [String]
    },
    
    // Projects
    projects: [{
        name: String,
        description: String,
        technologies: [String],
        url: String,
        date: Date,
        role: String
    }],
    
    // Certifications
    certifications: [{
        name: String,
        issuer: String,
        date: Date,
        expiry: Date,
        credential_id: String
    }],
    
    // Publications and awards
    publications: [{
        title: String,
        publisher: String,
        date: Date,
        url: String,
        authors: [String]
    }],
    awards: [{
        title: String,
        issuer: String,
        date: Date,
        description: String
    }],
    
    // ATS analysis
    ats_analysis: {
        score: Number,  // 0-100
        issues: [{
            type: String,  // formatting, keywords, structure
            severity: String,  // critical, major, minor
            description: String,
            location: String,  // Where in CV
            fix_suggestion: String
        }],
        keyword_density: mongoose.Schema.Types.Mixed,
        missing_sections: [String],
        formatting_problems: [String]
    },
    
    // ML features
    embedding: [Number],  // Document embedding
    skill_vectors: mongoose.Schema.Types.Mixed,
    
    // Original text
    raw_text: String,
    structured_text: mongoose.Schema.Types.Mixed,  // Sections preserved
    
    // Metadata
    file_hash: String,  // For deduplication
    word_count: Number,
    page_count: Number
});

// =====================================================
// JOB MATCHING RESULTS SCHEMA
// =====================================================

const jobMatchSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    cv_id: String,
    
    // Matching run metadata
    match_date: {
        type: Date,
        default: Date.now,
        index: true
    },
    algorithm_version: String,
    
    // Matched jobs
    matches: [{
        job_id: String,  // Reference to job posting
        match_score: Number,  // Overall match 0-100
        
        // Detailed scoring breakdown
        scores: {
            skill_match: Number,
            experience_match: Number,
            education_match: Number,
            location_match: Number,
            salary_match: Number,
            culture_fit: Number
        },
        
        // Match details
        matched_skills: [{
            skill: String,
            user_level: String,
            required_level: String,
            match_quality: String  // exact, similar, transferable
        }],
        missing_skills: [{
            skill: String,
            importance: String,
            learning_time_estimate: Number  // in hours
        }],
        
        // Recommendations
        application_tips: [String],
        cv_improvements: [String],
        cover_letter_points: [String],
        
        // User interaction
        user_rating: Number,  // 1-5
        applied: Boolean,
        saved: Boolean,
        dismissed: Boolean,
        feedback: String
    }],
    
    // Aggregated insights
    insights: {
        top_matching_companies: [String],
        top_matching_roles: [String],
        average_match_score: Number,
        skill_gaps: [String],
        market_fit_score: Number
    }
});

// =====================================================
// SALARY PREDICTION DATA SCHEMA
// =====================================================

const salaryDataSchema = new mongoose.Schema({
    // Data source
    source: {
        type: String,
        required: true  // h1b, glassdoor, levels.fyi, user_reported
    },
    source_id: String,
    
    // Job details
    job_title: {
        type: String,
        required: true,
        index: true
    },
    normalized_title: String,  // Standardized title
    company: {
        type: String,
        index: true
    },
    
    // Location
    location: {
        city: String,
        state: String,
        country: String,
        metro_area: String,
        cost_of_living_index: Number
    },
    
    // Salary information
    salary: {
        base: {
            type: Number,
            required: true
        },
        bonus: Number,
        stock: Number,
        total_compensation: Number,
        currency: String,
        period: String  // yearly, monthly
    },
    
    // Requirements
    years_experience: Number,
    education_level: String,
    skills: [String],
    
    // Dates
    reported_date: Date,
    effective_date: Date,
    
    // Validation
    is_verified: Boolean,
    confidence_score: Number,
    
    // For H1B specific
    h1b_data: {
        case_number: String,
        employer: String,
        soc_code: String,
        wage_level: Number,
        visa_class: String
    }
});

// Index for queue processing
scrapeQueueSchema.index({ status: 1, priority: -1, scheduled_for: 1 });

// =====================================================
// ANALYTICS AGGREGATIONS SCHEMA
// =====================================================

const analyticsAggregationSchema = new mongoose.Schema({
    // Aggregation metadata
    metric_type: {
        type: String,
        required: true,
        index: true  // daily_signups, job_views, application_rate, etc.
    },
    granularity: {
        type: String,
        enum: ['hour', 'day', 'week', 'month'],
        required: true
    },
    timestamp: {
        type: Date,
        required: true,
        index: true
    },
    
    // Dimensions for slicing data
    dimensions: {
        user_segment: String,  // new, active, churned
        job_category: String,
        location: String,
        source: String,
        device_type: String
    },
    
    // Metrics
    metrics: {
        count: Number,
        unique_users: Number,
        total_value: Number,
        average_value: Number,
        median_value: Number,
        percentile_95: Number,
        conversion_rate: Number,
        growth_rate: Number
    },
    
    // Time-series specific
    period_comparison: {
        previous_period_value: Number,
        change_percentage: Number,
        trend: String  // up, down, stable
    },
    
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Compound index for time-series queries
analyticsAggregationSchema.index({ metric_type: 1, timestamp: -1 });
analyticsAggregationSchema.index({ metric_type: 1, granularity: 1, timestamp: -1 });

// =====================================================
// MODEL CREATION AND INDEXING
// =====================================================

// Create models
const JobPosting = mongoose.model('JobPosting', jobPostingSchema);
const ParsedCV = mongoose.model('ParsedCV', parsedCVSchema);
const JobMatch = mongoose.model('JobMatch', jobMatchSchema);
const SalaryData = mongoose.model('SalaryData', salaryDataSchema);
const UserActivity = mongoose.model('UserActivity', userActivitySchema);
const ScrapeQueue = mongoose.model('ScrapeQueue', scrapeQueueSchema);
const AnalyticsAggregation = mongoose.model('AnalyticsAggregation', analyticsAggregationSchema);

// Function to create additional indexes after connection
const createIndexes = async () => {
    try {
        // Text search indexes for job search
        await JobPosting.collection.createIndex({
            title: 'text',
            description: 'text',
            'company.name': 'text'
        }, {
            weights: {
                title: 10,
                'company.name': 5,
                description: 1
            }
        });
        
        // Geospatial index for location-based search
        await JobPosting.collection.createIndex({
            'location.coordinates': '2dsphere'
        });
        
        // TTL index for automatic cleanup of old activities
        await UserActivity.collection.createIndex({
            timestamp: 1
        }, {
            expireAfterSeconds: 90 * 24 * 60 * 60  // 90 days
        });
        
        // TTL index for scrape queue cleanup
        await ScrapeQueue.collection.createIndex({
            completed_at: 1
        }, {
            expireAfterSeconds: 7 * 24 * 60 * 60,  // 7 days
            partialFilterExpression: { status: 'completed' }
        });
        
        console.log('MongoDB indexes created successfully');
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Function to perform vector similarity search
const findSimilarJobs = async function(embedding, limit = 10) {
    // This would use MongoDB Atlas Search or a vector database
    // Simplified example using aggregation
    return await JobPosting.aggregate([
        {
            $addFields: {
                similarity: {
                    // Cosine similarity calculation
                    // In production, use Atlas Search or dedicated vector DB
                    $divide: [
                        { $reduce: {
                            input: { $range: [0, { $size: '$embedding' }] },
                            initialValue: 0,
                            in: {
                                $add: [
                                    '$value',
                                    { $multiply: [
                                        { $arrayElemAt: ['$embedding', '$this'] },
                                        { $arrayElemAt: [embedding, '$this'] }
                                    ]}
                                ]
                            }
                        }},
                        1 // Normalized score
                    ]
                }
            }
        },
        { $sort: { similarity: -1 } },
        { $limit: limit }
    ]);
};

// Function to update job match feedback
const updateMatchFeedback = async function(userId, jobId, feedback) {
    return await JobMatch.findOneAndUpdate(
        {
            user_id: userId,
            'matches.job_id': jobId
        },
        {
            $set: {
                'matches.$.user_rating': feedback.rating,
                'matches.$.applied': feedback.applied,
                'matches.$.saved': feedback.saved,
                'matches.$.feedback': feedback.comment
            }
        },
        { new: true }
    );
};

// Function to calculate ATS score
const calculateATSScore = function(parsedCV) {
    let score = 100;
    const issues = [];
    
    // Check for formatting issues
    if (!parsedCV.contact.email) {
        score -= 20;
        issues.push({
            type: 'missing_contact',
            severity: 'critical',
            description: 'Email address not found'
        });
    }
    
    if (!parsedCV.contact.phone) {
        score -= 10;
        issues.push({
            type: 'missing_contact',
            severity: 'major',
            description: 'Phone number not found'
        });
    }
    
    // Check for required sections
    if (!parsedCV.experience || parsedCV.experience.length === 0) {
        score -= 25;
        issues.push({
            type: 'missing_section',
            severity: 'critical',
            description: 'Work experience section not found'
        });
    }
    
    if (!parsedCV.education || parsedCV.education.length === 0) {
        score -= 15;
        issues.push({
            type: 'missing_section',
            severity: 'major',
            description: 'Education section not found'
        });
    }
    
    if (!parsedCV.skills.technical || parsedCV.skills.technical.length === 0) {
        score -= 20;
        issues.push({
            type: 'missing_section',
            severity: 'major',
            description: 'Skills section not found or empty'
        });
    }
    
    return { score: Math.max(0, score), issues };
};

// =====================================================
// EXPORT MODULES
// =====================================================

module.exports = {
    // Connection
    connectDB,
    
    // Models
    JobPosting,
    ParsedCV,
    JobMatch,
    SalaryData,
    UserActivity,
    ScrapeQueue,
    AnalyticsAggregation,
    
    // Helper functions
    findSimilarJobs,
    updateMatchFeedback,
    calculateATSScore
}; 
salaryDataSchema.index({ job_title: 1, 'location.state': 1, years_experience: 1 });

// =====================================================
// USER ACTIVITY TRACKING SCHEMA
// =====================================================

const userActivitySchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    session_id: {
        type: String,
        index: true
    },
    
    // Activity details
    activity_type: {
        type: String,
        required: true,
        enum: ['page_view', 'job_view', 'job_save', 'job_apply', 
                'cv_upload', 'cv_analyze', 'skill_test', 'search',
                'filter', 'profile_update', 'interview_practice'],
        index: true
    },
    
    // Context data (varies by activity type)
    metadata: {
        page_url: String,
        job_id: String,
        search_query: String,
        filters_applied: mongoose.Schema.Types.Mixed,
        duration_seconds: Number,
        result_count: Number,
        click_position: Number,
        improvement_score: Number
    },
    
    // Device and browser info
    device: {
        type: String,  // mobile, tablet, desktop
        os: String,
        browser: String,
        screen_resolution: String,
        ip: String,
        country: String
    },
    
    // Timestamp
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for user activity analysis
userActivitySchema.index({ user_id: 1, timestamp: -1 });
userActivitySchema.index({ activity_type: 1, timestamp: -1 });

// =====================================================
// SCRAPED DATA QUEUE SCHEMA
// =====================================================

const scrapeQueueSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
        unique: true
    },
    source: {
        type: String,
        required: true
    },
    priority: {
        type: Number,
        default: 0,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'blocked'],
        default: 'pending',
        index: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    last_attempt: Date,
    next_retry: Date,
    error_message: String,
    
    // Results
    data_extracted: Boolean,
    jobs_found: Number,
    
    // Scheduling
    scheduled_for: Date,
    completed_at: Date,
    
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Index for