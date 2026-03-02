"""
Salary Predictor - Production Inference 

Loads XGBoost model trained with SOC-filtered IT data.
Skills are loaded dynamically from training metadata.
"""

import json
import pickle
import logging
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import xgboost as xgb

logger = logging.getLogger(__name__)


class SalaryPredictor:
    """
    Production salary prediction for IT careers.
    
    v2 Changes:
    - Skills loaded from model metadata (not hardcoded)
    - Better role detection (analyst, architect, scientist)
    - Trained on SOC-filtered IT jobs only
    
    Usage:
        predictor = SalaryPredictor.load("models/")
        result = predictor.predict(
            job_title="Senior Software Engineer",
            location="California",
            skills=["Python", "AWS"],
            years_experience=5
        )
    """
    
    # Seniority labels for display
    SENIORITY_LABELS = {
        0: 'Intern', 1: 'Junior', 2: 'Associate', 3: 'Mid-level',
        4: 'Senior', 5: 'Lead', 6: 'Staff', 7: 'Principal',
        8: 'Director', 9: 'VP', 10: 'C-level'
    }
    
    def __init__(self, model, feature_builder, metadata: Dict):
        """Initialize with loaded components."""
        self.model = model
        self.feature_builder = feature_builder
        self.metadata = metadata
        
    @classmethod
    def load(cls, models_dir: str = "models") -> "SalaryPredictor":
        """
        Load trained model from disk.
        
        Args:
            models_dir: Directory containing model files
            
        Returns:
            Initialized SalaryPredictor
        """
        # Import here to avoid circular imports
        from .feature_builder import FeatureBuilder
        
        models_path = Path(models_dir)
        
        # Load XGBoost model
        model_file = models_path / "salary_predictor.json"
        if not model_file.exists():
            raise FileNotFoundError(
                f"Model not found: {model_file}. "
                "Train in Colab first and copy files here."
            )
        
        model = xgb.XGBRegressor()
        model.load_model(str(model_file))
        logger.info(f"Loaded model from {model_file}")
        
        # Load encoders
        encoders_file = models_path / "feature_encoders.pkl"
        if not encoders_file.exists():
            raise FileNotFoundError(f"Encoders not found: {encoders_file}")
        
        with open(encoders_file, 'rb') as f:
            encoders = pickle.load(f)
        
        # Create feature builder
        feature_builder = FeatureBuilder(
            title_encoder=encoders['title_encoder'],
            state_encoder=encoders['state_encoder'],
            scaler=encoders['scaler'],
            feature_names=encoders['feature_names'],
            tech_skills=encoders.get('tech_skills', [])
        )
        
        # Load metadata
        metadata_file = models_path / "model_metadata.json"
        metadata = {}
        if metadata_file.exists():
            with open(metadata_file) as f:
                metadata = json.load(f)
        
        logger.info(
            f"Model loaded. Features: {len(encoders['feature_names'])}, "
            f"Skills: {len(encoders.get('tech_skills', []))}, "
            f"R²: {metadata.get('metrics', {}).get('r2', 'N/A')}"
        )
        
        return cls(model, feature_builder, metadata)
    
    def predict(
        self,
        job_title: str,
        location: str,
        skills: List[str],
        years_experience: int = 3,
        include_factors: bool = True
    ) -> Dict:
        """
        Predict salary for given inputs.
        
        Args:
            job_title: Target job title
            location: US state (model trained on US data)
            skills: List of user's skills
            years_experience: Total years (for future use)
            include_factors: Include explanation in response
            
        Returns:
            Dictionary with prediction and metadata
        """
        # Build features
        features, feature_values = self.feature_builder.build_features(
            job_title=job_title,
            location=location,
            skills=skills,
            years_experience=years_experience
        )
        
        # Predict
        prediction = float(self.model.predict(features)[0])
        
        # Confidence interval (±12% based on typical model error)
        salary_min = int(prediction * 0.88)
        salary_max = int(prediction * 1.12)
        
        result = {
            'predicted_salary': int(round(prediction)),
            'salary_range': {
                'min': salary_min,
                'max': salary_max
            },
            'confidence': self._calculate_confidence(feature_values),
            'currency': 'USD',
            'note': 'Based on US H1B visa data for IT roles'
        }
        
        if include_factors:
            result['factors'] = self._get_factors(feature_values)
            result['skill_analysis'] = self._analyze_skills(skills, feature_values)
        
        return result
    
    def _calculate_confidence(self, feature_values: Dict) -> int:
        """Calculate prediction confidence (50-95%)."""
        confidence = 65  # Base
        
        # Boost for recognized title
        if feature_values.get('job_title_encoded', 0) > 0:
            confidence += 10
        
        # Boost for known state
        state = feature_values.get('state', 'UNKNOWN')
        if state != 'UNKNOWN':
            confidence += 10
        
        # Boost for skills
        if feature_values.get('total_skills', 0) >= 2:
            confidence += 10
        
        return min(95, max(50, confidence))
    
    def _get_factors(self, feature_values: Dict) -> List[Dict]:
        """Create human-readable factor breakdown."""
        factors = []
        
        # Base salary
        salary_stats = self.metadata.get('salary_stats', {})
        base = salary_stats.get('median', 110000)
        factors.append({
            'factor': 'IT Market Base',
            'description': 'Median IT salary in training data',
            'impact': 'baseline',
            'value': f'${base:,}'
        })
        
        # Seniority
        seniority = feature_values.get('seniority_level', 3)
        label = self.SENIORITY_LABELS.get(seniority, 'Mid-level')
        impact = 'positive' if seniority > 3 else ('negative' if seniority < 3 else 'neutral')
        factors.append({
            'factor': 'Seniority',
            'description': label,
            'impact': impact,
            'value': f'Level {seniority}'
        })
        
        # Location
        if feature_values.get('is_tech_hub'):
            factors.append({
                'factor': 'Location',
                'description': 'Tech hub state',
                'impact': 'positive',
                'value': feature_values.get('state', 'Unknown')
            })
        
        # Role type
        roles = []
        if feature_values.get('is_engineer'): roles.append('Engineer')
        if feature_values.get('is_architect'): roles.append('Architect')
        if feature_values.get('is_scientist'): roles.append('Scientist')
        if feature_values.get('is_manager'): roles.append('Manager')
        
        if roles:
            factors.append({
                'factor': 'Role Type',
                'description': ', '.join(roles),
                'impact': 'positive' if 'Architect' in roles or 'Scientist' in roles else 'neutral',
                'value': roles[0]
            })
        
        # Skills
        total = feature_values.get('total_skills', 0)
        if total > 0:
            factors.append({
                'factor': 'Technical Skills',
                'description': f'{total} relevant skills detected',
                'impact': 'positive' if total >= 3 else 'neutral',
                'value': f'{total} skills'
            })
        
        return factors
    
    def _analyze_skills(self, user_skills: List[str], feature_values: Dict) -> Dict:
        """Analyze user's skills vs high-value skills."""
        # Get skills from metadata
        all_skills = self.metadata.get('tech_skills', self.feature_builder.tech_skills)
        
        # High-value skills (first 15 are typically highest impact)
        high_value = all_skills[:15] if len(all_skills) > 15 else all_skills
        
        user_lower = [s.lower() for s in user_skills]
        
        has_skills = []
        missing_skills = []
        
        for skill in high_value:
            skill_key = f'has_{skill}'
            if feature_values.get(skill_key, 0) == 1:
                has_skills.append(skill.replace('_', ' ').title())
            else:
                missing_skills.append(skill.replace('_', ' ').title())
        
        return {
            'high_value_skills_you_have': has_skills[:5],
            'high_value_skills_to_consider': missing_skills[:5],
            'note': 'Skills ranked by correlation with higher IT salaries'
        }
    
    def get_model_info(self) -> Dict:
        """Return model metadata."""
        return {
            'model_type': 'XGBoost Regressor',
            'version': self.metadata.get('model_version', '2.0'),
            'trained_on': 'US H1B Visa Data (IT jobs only)',
            'training_date': self.metadata.get('trained_at', 'Unknown'),
            'metrics': self.metadata.get('metrics', {}),
            'feature_count': len(self.feature_builder.feature_names),
            'skill_count': len(self.feature_builder.tech_skills),
            'salary_stats': self.metadata.get('salary_stats', {}),
            'limitations': [
                'Trained on US data only',
                'IT/Tech roles only (filtered by SOC codes)',
                'Reflects H1B visa salaries (may differ from general market)',
                'Does not include stock/bonus compensation'
            ]
        }


# Singleton instance
_predictor_instance: Optional[SalaryPredictor] = None


def get_predictor(models_dir: str = "models") -> SalaryPredictor:
    """Get or create singleton predictor instance."""
    global _predictor_instance
    
    if _predictor_instance is None:
        _predictor_instance = SalaryPredictor.load(models_dir)
        logger.info("Initialized salary predictor singleton")
    
    return _predictor_instance
