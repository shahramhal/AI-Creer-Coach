"""
Multi-Region Feature Builder for Salary Prediction (v3.0)

Transforms user input into feature vectors for multi-region XGBoost model.
Supports both UK and US markets with country-aware features.

Key features:
- Explicit country encoding (UK vs US)
- Region-specific cost-of-living indices
- Country interaction features (country_seniority, country_manager)
- Company tier classification
"""

import numpy as np
import logging
from typing import Dict, List, Tuple, Optional
from sklearn.preprocessing import LabelEncoder, StandardScaler

logger = logging.getLogger(__name__)


class MultiRegionFeatureBuilder:
    """
    Builds features for multi-region salary prediction.
    
    Feature order MUST match training exactly (34 features):
    1. job_title_encoded
    2. country_encoded
    3. seniority_level
    4. is_manager
    5. is_engineer
    6. is_analyst
    7. is_scientist
    8. cost_of_living
    9. is_tech_hub
    10. company_tier_encoded
    11. total_skills
    12. country_seniority (interaction)
    13. country_manager (interaction)
    14. senior_engineer (interaction)
    15-34. has_{skill} for each skill
    """
    
    # Seniority patterns
    SENIORITY_PATTERNS = {
        'intern': 0, 'junior': 1, 'entry': 1, 'associate': 2,
        'mid': 3, 'senior': 4, 'sr.': 4, 'sr ': 4,
        'lead': 5, 'staff': 6, 'principal': 7, 'director': 8,
        'vp': 9, 'chief': 10
    }
    
    # US Cost of Living Index
    US_COL_INDEX = {
        'CA': 142, 'NY': 139, 'WA': 119, 'MA': 132, 'TX': 92,
        'FL': 100, 'IL': 95, 'PA': 95, 'GA': 91, 'CO': 105,
        'NJ': 115, 'VA': 105, 'NC': 95, 'AZ': 97, 'OR': 110,
        'MD': 110, 'CT': 115, 'MN': 98, 'OH': 90, 'MI': 90
    }
    
    # UK Cost of Living Index
    UK_COL_INDEX = {
        'london': 142,
        'edinburgh': 115,
        'manchester': 100,
        'bristol': 105,
        'birmingham': 95,
        'glasgow': 95,
        'cambridge': 125,
        'oxford': 120,
        'leeds': 92,
        'liverpool': 90,
    }
    
    # US Tech hub states
    US_TECH_HUBS = {'CA', 'WA', 'NY', 'MA', 'TX', 'CO'}
    
    # UK Tech hub cities
    UK_TECH_HUBS = {'london', 'cambridge', 'edinburgh', 'bristol', 'manchester'}
    
    # Company tiers for salary estimation
    COMPANY_TIERS = {
        'tier_1': ['google', 'meta', 'facebook', 'amazon', 'apple', 'microsoft', 'netflix', 'openai'],
        'tier_2': ['uber', 'airbnb', 'stripe', 'salesforce', 'adobe', 'linkedin', 'nvidia', 'snowflake'],
        'tier_3': ['ibm', 'oracle', 'sap', 'vmware', 'intel', 'cisco', 'hp', 'dell'],
        'tier_4': [],  # Default/startups
        'tier_5': ['consulting', 'accenture', 'deloitte', 'pwc', 'kpmg', 'ey'],
    }
    
    TIER_ENCODING = {'tier_1': 4, 'tier_2': 3, 'tier_3': 2, 'tier_4': 1, 'tier_5': 0}
    
    # State name to code mapping
    US_STATE_MAPPING = {
        'california': 'CA', 'new york': 'NY', 'texas': 'TX',
        'washington': 'WA', 'massachusetts': 'MA', 'florida': 'FL',
        'illinois': 'IL', 'georgia': 'GA', 'colorado': 'CO',
        'pennsylvania': 'PA', 'virginia': 'VA', 'north carolina': 'NC',
        'arizona': 'AZ', 'ohio': 'OH', 'michigan': 'MI',
        'new jersey': 'NJ', 'oregon': 'OR', 'maryland': 'MD',
        'connecticut': 'CT', 'minnesota': 'MN',
    }
    
    def __init__(
        self,
        title_encoder: LabelEncoder,
        country_encoder: LabelEncoder,
        scaler: StandardScaler,
        feature_names: List[str],
        tech_skills: List[str]
    ):
        """
        Initialize with encoders from training.
        
        Args:
            title_encoder: Fitted LabelEncoder for job titles
            country_encoder: Fitted LabelEncoder for countries
            scaler: Fitted StandardScaler
            feature_names: Feature names in training order
            tech_skills: Skills extracted during training
        """
        self.title_encoder = title_encoder
        self.country_encoder = country_encoder
        self.scaler = scaler
        self.feature_names = feature_names
        self.tech_skills = tech_skills
        
        logger.info(
            f"MultiRegionFeatureBuilder initialized: "
            f"{len(feature_names)} features, {len(tech_skills)} skills"
        )
    
    @classmethod
    def from_encoders_file(cls, encoders_path: str) -> "MultiRegionFeatureBuilder":
        """Load from saved encoders pickle file."""
        import pickle
        
        with open(encoders_path, 'rb') as f:
            encoders = pickle.load(f)
        
        return cls(
            title_encoder=encoders['title_encoder'],
            country_encoder=encoders['country_encoder'],
            scaler=encoders['scaler'],
            feature_names=encoders['feature_names'],
            tech_skills=encoders.get('tech_skills', [])
        )
    
    def build_features(
        self,
        job_title: str,
        country: str,
        location: str,
        skills: Optional[List[str]] = None,
        company: Optional[str] = None
    ) -> Tuple[np.ndarray, Dict]:
        """
        Build feature vector for prediction.
        
        Args:
            job_title: Target job title
            country: "UK" or "US"
            location: State (US) or city (UK)
            skills: User's skills from CV
            company: Company name (optional, for tier estimation)
            
        Returns:
            Tuple of (scaled_features, raw_feature_dict)
        """
        skills = skills or []
        country = country.upper()
        
        # Normalize inputs
        title_lower = job_title.lower().strip()
        skills_lower = {s.lower().replace(' ', '_') for s in skills}
        
        features = {}
        
        # 1. Job title encoding
        features['job_title_encoded'] = self._encode_title(title_lower)
        
        # 2. Country encoding (CRITICAL)
        features['country_encoded'] = self._encode_country(country)
        
        # 3. Seniority level
        features['seniority_level'] = self._extract_seniority(title_lower)
        
        # 4-7. Role type flags
        features['is_manager'] = int(any(kw in title_lower for kw in ['manager', 'director', 'lead']))
        features['is_engineer'] = int(any(kw in title_lower for kw in ['engineer', 'developer']))
        features['is_analyst'] = int('analyst' in title_lower)
        features['is_scientist'] = int('scientist' in title_lower)
        
        # 8. Cost of living (country-aware)
        features['cost_of_living'] = self._get_cost_of_living(location, country)
        
        # 9. Tech hub (country-aware)
        features['is_tech_hub'] = self._is_tech_hub(location, country)
        
        # 10. Company tier
        features['company_tier_encoded'] = self._get_company_tier(company)
        
        # 11. Total skills (calculated after skill features)
        
        # 12-14. Interaction features
        features['country_seniority'] = features['country_encoded'] * features['seniority_level']
        features['country_manager'] = features['country_encoded'] * features['is_manager']
        features['senior_engineer'] = int(
            features['seniority_level'] >= 4 and features['is_engineer'] == 1
        )
        
        # 15-34. Skill features
        total_skills = 0
        for skill in self.tech_skills:
            skill_key = f'has_{skill}'
            has_skill = (
                skill in skills_lower or
                skill.replace('_', ' ') in ' '.join(skills_lower) or
                skill in title_lower or
                skill.replace('_', ' ') in title_lower
            )
            features[skill_key] = int(has_skill)
            total_skills += int(has_skill)
        
        features['total_skills'] = total_skills
        
        # Build array in EXACT training order
        feature_array = []
        for name in self.feature_names:
            value = features.get(name, 0)
            feature_array.append(float(value))
        
        # Scale features
        X = np.array([feature_array])
        X_scaled = self.scaler.transform(X)
        
        # Add metadata for display
        features['_country'] = country
        features['_location'] = location
        features['_seniority_label'] = self._get_seniority_label(features['seniority_level'])
        
        return X_scaled, features
    
    def _encode_title(self, title: str) -> int:
        """Encode job title, fallback to 'other'."""
        try:
            if title in self.title_encoder.classes_:
                return int(self.title_encoder.transform([title])[0])
        except Exception:
            pass
        
        if 'other' in self.title_encoder.classes_:
            return int(self.title_encoder.transform(['other'])[0])
        return 0
    
    def _encode_country(self, country: str) -> int:
        """Encode country (UK=0, US=1 typically)."""
        country = country.upper()
        try:
            if country in self.country_encoder.classes_:
                return int(self.country_encoder.transform([country])[0])
        except Exception:
            pass
        return 1  # Default to US
    
    def _extract_seniority(self, title: str) -> int:
        """Extract seniority level (0-10)."""
        for pattern, level in self.SENIORITY_PATTERNS.items():
            if pattern in title:
                return level
        return 3  # Default mid-level
    
    def _get_seniority_label(self, level: int) -> str:
        """Convert level to label."""
        labels = {
            0: 'Intern', 1: 'Junior', 2: 'Associate', 3: 'Mid-level',
            4: 'Senior', 5: 'Lead', 6: 'Staff', 7: 'Principal',
            8: 'Director', 9: 'VP', 10: 'C-level'
        }
        return labels.get(level, 'Mid-level')
    
    def _get_cost_of_living(self, location: str, country: str) -> int:
        """Get COL index based on country."""
        if not location:
            return 100
        
        location_clean = location.strip()
        
        if country == 'UK':
            location_lower = location_clean.lower()
            for city, col in self.UK_COL_INDEX.items():
                if city in location_lower:
                    return col
            return 100
        else:  # US
            # Handle state code or name
            state = self._normalize_us_state(location_clean)
            return self.US_COL_INDEX.get(state, 100)
    
    def _normalize_us_state(self, location: str) -> str:
        """Convert location to US state code."""
        location = location.strip()
        
        # Already 2-letter code
        if len(location) == 2 and location.isalpha():
            return location.upper()
        
        # Check name mapping
        location_lower = location.lower()
        if location_lower in self.US_STATE_MAPPING:
            return self.US_STATE_MAPPING[location_lower]
        
        # Extract from "City, ST" format
        if ',' in location:
            parts = location.split(',')
            potential_state = parts[-1].strip().upper()
            if len(potential_state) == 2 and potential_state.isalpha():
                return potential_state
        
        return 'UNKNOWN'
    
    def _is_tech_hub(self, location: str, country: str) -> int:
        """Check if location is a tech hub."""
        if not location:
            return 0
        
        if country == 'UK':
            location_lower = location.lower()
            return int(any(city in location_lower for city in self.UK_TECH_HUBS))
        else:  # US
            state = self._normalize_us_state(location)
            return int(state in self.US_TECH_HUBS)
    
    def _get_company_tier(self, company: Optional[str]) -> int:
        """Classify company into tier (0-4)."""
        if not company:
            return 1  # Default tier_4
        
        company_lower = company.lower()
        
        for tier, companies in self.COMPANY_TIERS.items():
            for comp in companies:
                if comp in company_lower:
                    return self.TIER_ENCODING[tier]
        
        return 1  # Default tier_4
    
    def get_info(self) -> Dict:
        """Return feature builder configuration."""
        return {
            'version': '3.0_multi_region',
            'total_features': len(self.feature_names),
            'skill_count': len(self.tech_skills),
            'skills': self.tech_skills,
            'feature_names': self.feature_names,
            'supported_countries': ['UK', 'US'],
            'us_tech_hubs': list(self.US_TECH_HUBS),
            'uk_tech_hubs': list(self.UK_TECH_HUBS),
        }
