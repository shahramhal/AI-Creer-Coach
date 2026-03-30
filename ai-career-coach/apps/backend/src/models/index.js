// MongoDB Schema for AI Career Coach
// Purpose: Flexible document storage for jobs, parsed CVs, and analytics

const mongoose = require('mongoose');

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

const jobPostingSchema = new mongoose.Schema({
    external_id: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        index: 'text'
    },
    company: {
        name: String,
        id: String,
        logo_url: String,
        size: String,
        industry: String
    },
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
    description: {
        type: String,
        index: 'text'
    },
    requirements: [String],
    responsibilities: [String],
    benefits: [String],
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
    salary: {
        min: Number,
        max: Number,
        currency: String,
        period: String,
        is_estimated: Boolean
    },
    skills_required: [{
        name: String,
        importance: {
            type: String,
            enum: ['required', 'preferred', 'nice_to_have']
        },
        years_needed: Number
    }],
    education_required: {
        level: String,
        field: [String]
    },
    certifications: [String],
    source: {
        type: String,
        required: true,
        index: true
    },
    source_url: String,
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
    is_active: {
        type: Boolean,
        default: true,
        index: true
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    embedding: {
        type: [Number],
        index: '2dsphere'
    },
    skill_embeddings: mongoose.Schema.Types.Mixed,
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
    quality_score: Number,
    ats_keywords: [String],
    raw_html: String,
    raw_text: String
});

jobPostingSchema.index({ company: 1, posted_date: -1 });
jobPostingSchema.index({ 'location.city': 1, 'location.state': 1 });
jobPostingSchema.index({ skills_required: 1, experience_level: 1 });

const parsedCVSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    cv_id: {
        type: String,
        required: true,
        index: true
    },
    parse_version: String,
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
    summary: {
        text: String,
        keywords: [String],
        tone: String
    },
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
        entities: {
            metrics: [String],
            projects: [String],
            teams: [String]
        }
    }],
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
    skills: {
        technical: [{
            name: String,
            category: String,
            proficiency: String,
            years: Number,
            context: [String]
        }],
        soft: [String],
        languages: [{
            name: String,
            proficiency: String
        }],
        tools: [String],
        frameworks: [String],
        databases: [String]
    },
    projects: [{
        name: String,
        description: String,
        technologies: [String],
        url: String,
        date: Date,
        role: String
    }],
    certifications: [{
        name: String,
        issuer: String,
        date: Date,
        expiry: Date,
        credential_id: String
    }],
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
    ats_analysis: {
        score: Number,
        issues: [{
            type: String,
            severity: String,
            description: String,
            location: String,
            fix_suggestion: String
        }],
        keyword_density: mongoose.Schema.Types.Mixed,
        missing_sections: [String],
        formatting_problems: [String]
    },
    embedding: [Number],
    skill_vectors: mongoose.Schema.Types.Mixed,
    raw_text: String,
    structured_text: mongoose.Schema.Types.Mixed,
    file_hash: String,
    word_count: Number,
    page_count: Number
});

const jobMatchSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    cv_id: String,
    match_date: {
        type: Date,
        default: Date.now,
        index: true
    },
    algorithm_version: String,
    matches: [{
        job_id: String,
        match_score: Number,
        scores: {
            skill_match: Number,
            experience_match: Number,
            education_match: Number,
            location_match: Number,
            salary_match: Number,
            culture_fit: Number
        },
        matched_skills: [{
            skill: String,
            user_level: String,
            required_level: String,
            match_quality: String
        }],
        missing_skills: [{
            skill: String,
            importance: String,
            learning_time_estimate: Number
        }],
        application_tips: [String],
        cv_improvements: [String],
        cover_letter_points: [String],
        user_rating: Number,
        applied: Boolean,
        saved: Boolean,
        dismissed: Boolean,
        feedback: String
    }],
    insights: {
        top_matching_companies: [String],
        top_matching_roles: [String],
        average_match_score: Number,
        skill_gaps: [String],
        market_fit_score: Number
    }
});

const salaryDataSchema = new mongoose.Schema({
    source: {
        type: String,
        required: true
    },
    source_id: String,
    job_title: {
        type: String,
        required: true,
        index: true
    },
    normalized_title: String,
    company: {
        type: String,
        index: true
    },
    location: {
        city: String,
        state: String,
        country: String,
        metro_area: String,
        cost_of_living_index: Number
    },
    salary: {
        base: {
            type: Number,
            required: true
        },
        bonus: Number,
        stock: Number,
        total_compensation: Number,
        currency: String,
        period: String
    },
    years_experience: Number,
    education_level: String,
    skills: [String],
    reported_date: Date,
    effective_date: Date,
    is_verified: Boolean,
    confidence_score: Number,
    h1b_data: {
        case_number: String,
        employer: String,
        soc_code: String,
        wage_level: Number,
        visa_class: String
    }
});

salaryDataSchema.index({ job_title: 1, 'location.state': 1, years_experience: 1 });

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
    activity_type: {
        type: String,
        required: true,
        enum: ['page_view', 'job_view', 'job_save', 'job_apply',
                'cv_upload', 'cv_analyze', 'skill_test', 'search',
                'filter', 'profile_update', 'interview_practice'],
        index: true
    },
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
    device: {
        type: String,
        os: String,
        browser: String,
        screen_resolution: String,
        ip: String,
        country: String
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

userActivitySchema.index({ user_id: 1, timestamp: -1 });
userActivitySchema.index({ activity_type: 1, timestamp: -1 });

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
    data_extracted: Boolean,
    jobs_found: Number,
    scheduled_for: Date,
    completed_at: Date,
    created_at: {
        type: Date,
        default: Date.now
    }
});

scrapeQueueSchema.index({ status: 1, priority: -1, scheduled_for: 1 });

const analyticsAggregationSchema = new mongoose.Schema({
    metric_type: {
        type: String,
        required: true,
        index: true
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
    dimensions: {
        user_segment: String,
        job_category: String,
        location: String,
        source: String,
        device_type: String
    },
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
    period_comparison: {
        previous_period_value: Number,
        change_percentage: Number,
        trend: String
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

analyticsAggregationSchema.index({ metric_type: 1, timestamp: -1 });
analyticsAggregationSchema.index({ metric_type: 1, granularity: 1, timestamp: -1 });

// Create models
const JobPosting = mongoose.model('JobPosting', jobPostingSchema);
const ParsedCV = mongoose.model('ParsedCV', parsedCVSchema);
const JobMatch = mongoose.model('JobMatch', jobMatchSchema);
const SalaryData = mongoose.model('SalaryData', salaryDataSchema);
const UserActivity = mongoose.model('UserActivity', userActivitySchema);
const ScrapeQueue = mongoose.model('ScrapeQueue', scrapeQueueSchema);
const AnalyticsAggregation = mongoose.model('AnalyticsAggregation', analyticsAggregationSchema);

const createIndexes = async () => {
    try {
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

        await JobPosting.collection.createIndex({
            'location.coordinates': '2dsphere'
        });

        await UserActivity.collection.createIndex({
            timestamp: 1
        }, {
            expireAfterSeconds: 90 * 24 * 60 * 60
        });

        await ScrapeQueue.collection.createIndex({
            completed_at: 1
        }, {
            expireAfterSeconds: 7 * 24 * 60 * 60,
            partialFilterExpression: { status: 'completed' }
        });

        console.log('MongoDB indexes created successfully');
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
};

const findSimilarJobs = async function(embedding, limit = 10) {
    return await JobPosting.aggregate([
        {
            $addFields: {
                similarity: {
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
                        1
                    ]
                }
            }
        },
        { $sort: { similarity: -1 } },
        { $limit: limit }
    ]);
};

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

const calculateATSScore = function(parsedCV) {
    let score = 100;
    const issues = [];

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

module.exports = {
    connectDB,
    JobPosting,
    ParsedCV,
    JobMatch,
    SalaryData,
    UserActivity,
    ScrapeQueue,
    AnalyticsAggregation,
    findSimilarJobs,
    updateMatchFeedback,
    calculateATSScore
};
