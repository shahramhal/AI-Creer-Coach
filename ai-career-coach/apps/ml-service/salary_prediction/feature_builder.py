"""
Feature Builder - Production Inference 

Transforms user input into feature vector for salary prediction.


IMPORTANT: This must match the Colab training notebook exactly.
"""

import numpy as np
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from sklearn.preprocessing import LabelEncoder, StandardScaler


class FeatureBuilder:
    """
    Transforms user input into feature vector for model prediction.
    
    v2 Changes:
    - Loads TECH_SKILLS from model metadata (not hardcoded)
    - Matches SOC-filtered training
    - Additional role features (analyst, architect, scientist)
    """
    
    # Seniority patterns (universal, keep hardcoded)
    SENIORITY_PATTERNS = {
        'intern': 0, 'junior': 1, 'entry': 1, 'associate': 2,
        'mid': 3, 'senior': 4, 'sr.': 4, 'sr ': 4,
        'lead': 5, 'staff': 6, 'principal': 7, 'director': 8,
        'vp': 9, 'chief': 10
    }
    
    # Cost of living index by US state
    COL_INDEX = {
        'CA': 142, 'NY': 139, 'WA': 119, 'MA': 132, 'TX': 92,
        'FL': 100, 'IL': 95, 'PA': 95, 'GA': 91, 'CO': 105,
        'NJ': 115, 'VA': 105, 'NC': 95, 'AZ': 97, 'OR': 110,
        'MD': 110, 'CT': 115, 'MN': 98, 'OH': 90, 'MI': 90
    }
    
    # State name to code mapping
    STATE_MAPPING = {
        'california': 'CA', 'new york': 'NY', 'texas': 'TX',
        'washington': 'WA', 'massachusetts': 'MA', 'florida': 'FL',
        'illinois': 'IL', 'georgia': 'GA', 'colorado': 'CO',
        'pennsylvania': 'PA', 'virginia': 'VA', 'north carolina': 'NC',
        'arizona': 'AZ', 'ohio': 'OH', 'michigan': 'MI',
        'new jersey': 'NJ', 'oregon': 'OR', 'maryland': 'MD',
        'connecticut': 'CT', 'minnesota': 'MN',
        # UK/EU rough mappings (for user convenience, maps to similar COL)
        'london': 'NY', 'england': 'NY', 'uk': 'NY',
        'germany': 'WA', 'france': 'IL', 'netherlands': 'MA',
    }
    
    def __init__(
        self,
        title_encoder: LabelEncoder,
        state_encoder: LabelEncoder,
        scaler: StandardScaler,
        feature_names: List[str],
        tech_skills: List[str]
    ):
        """
        Initialize with encoders from training.
        
        Args:
            title_encoder: Fitted LabelEncoder for job titles
            state_encoder: Fitted LabelEncoder for states
            scaler: Fitted StandardScaler for all features
            feature_names: List of feature names in correct order
            tech_skills: List of IT skills extracted during training
        """
        self.title_encoder = title_encoder
        self.state_encoder = state_encoder
        self.scaler = scaler
        self.feature_names = feature_names
        self.tech_skills = tech_skills
        
    @classmethod
    def from_encoders_file(cls, encoders_path: str) -> "FeatureBuilder":
        """
        Create FeatureBuilder from saved encoders file.
        
        Args:
            encoders_path: Path to feature_encoders.pkl
        """
        import pickle
        
        with open(encoders_path, 'rb') as f:
            encoders = pickle.load(f)
        
        return cls(
            title_encoder=encoders['title_encoder'],
            state_encoder=encoders['state_encoder'],
            scaler=encoders['scaler'],
            feature_names=encoders['feature_names'],
            tech_skills=encoders.get('tech_skills', [])  # v2 includes skills
        )
    
    def build_features(
        self,
        job_title: str,
        location: str,
        skills: List[str],
        years_experience: int = 3
    ) -> Tuple[np.ndarray, Dict]:
        """
        Convert user input to feature vector.
        
        Args:
            job_title: Target job title
            location: State or region
            skills: User's skills from CV
            years_experience: Years of experience (currently unused, for future)
            
        Returns:
            Tuple of (scaled feature array, raw feature values dict)
        """
        # Normalize inputs
        job_title_lower = job_title.lower().strip()
        state = self._normalize_state(location)
        skills_lower = [s.lower().replace(' ', '_') for s in skills]
        
        # Build features dictionary
        feature_values = {}
        
        # 1. Job title encoding
        feature_values['job_title_encoded'] = self._encode_title(job_title_lower)
        
        # 2. State encoding
        feature_values['state_encoded'] = self._encode_state(state)
        feature_values['state'] = state  # Keep for display
        
        # 3. Seniority level
        feature_values['seniority_level'] = self._extract_seniority(job_title_lower)
        
        # 4. Role type features
        feature_values['is_manager'] = int(
            any(kw in job_title_lower for kw in ['manager', 'director', 'lead'])
        )
        feature_values['is_engineer'] = int(
            any(kw in job_title_lower for kw in ['engineer', 'developer'])
        )
        feature_values['is_analyst'] = int('analyst' in job_title_lower)
        feature_values['is_architect'] = int('architect' in job_title_lower)
        feature_values['is_scientist'] = int('scientist' in job_title_lower)
        
        # 5. Location features
        feature_values['cost_of_living'] = self.COL_INDEX.get(state, 100)
        feature_values['is_tech_hub'] = int(state in ['CA', 'WA', 'NY', 'MA', 'TX', 'CO'])
        
        # 6. Skill features (from trained model's skill list)
        total_skills = 0
        for skill in self.tech_skills:
            skill_key = f'has_{skill}'
            # Check if skill is in user's skill list OR in job title
            has_skill = (
                skill in skills_lower or
                skill.replace('_', ' ') in ' '.join(skills_lower) or
                skill in job_title_lower
            )
            feature_values[skill_key] = int(has_skill)
            total_skills += int(has_skill)
        
        feature_values['total_skills'] = total_skills
        
        # Build feature array in EXACT order from training
        feature_array = []
        for name in self.feature_names:
            if name in feature_values:
                feature_array.append(feature_values[name])
            else:
                # Feature not found - use 0 as default
                feature_array.append(0)
        
        # Scale and return
        X = np.array([feature_array], dtype=float)
        X_scaled = self.scaler.transform(X)
        
        return X_scaled, feature_values
    
    def _encode_title(self, title: str) -> int:
        """Encode job title, fallback to 'other' if unknown."""
        try:
            if title in self.title_encoder.classes_:
                return self.title_encoder.transform([title])[0]
        except:
            pass
        
        # Fallback to 'other'
        if 'other' in self.title_encoder.classes_:
            return self.title_encoder.transform(['other'])[0]
        return 0
    
    def _encode_state(self, state: str) -> int:
        """Encode state, fallback to 0 if unknown."""
        try:
            if state in self.state_encoder.classes_:
                return self.state_encoder.transform([state])[0]
        except:
            pass
        
        if 'UNKNOWN' in self.state_encoder.classes_:
            return self.state_encoder.transform(['UNKNOWN'])[0]
        return 0
    
    def _normalize_state(self, location: str) -> str:
        """Convert location string to US state code."""
        location = location.strip()
        
        # Already a 2-letter code
        if len(location) == 2 and location.upper().isalpha():
            return location.upper()
        
        # Check mapping
        location_lower = location.lower()
        if location_lower in self.STATE_MAPPING:
            return self.STATE_MAPPING[location_lower]
        
        # Extract from "City, ST" format
        parts = location.split(',')
        if len(parts) >= 2:
            potential_state = parts[-1].strip().upper()
            if len(potential_state) == 2 and potential_state.isalpha():
                return potential_state
        
        return 'UNKNOWN'
    
    def _extract_seniority(self, title: str) -> int:
        """Extract seniority level from job title."""
        for pattern, level in self.SENIORITY_PATTERNS.items():
            if pattern in title:
                return level
        return 3  # Default mid-level
    
    def get_feature_info(self) -> Dict:
        """Return information about expected features."""
        return {
            'total_features': len(self.feature_names),
            'feature_names': self.feature_names,
            'tech_skills': self.tech_skills,
            'skill_count': len(self.tech_skills),
            'seniority_keywords': list(self.SENIORITY_PATTERNS.keys()),
            'tech_hub_states': ['CA', 'WA', 'NY', 'MA', 'TX', 'CO'],
            'version': '2.0'
        }
