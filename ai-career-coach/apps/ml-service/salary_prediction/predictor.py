"""
Multi-Region Salary Predictor (v3.0)

XGBoost-based salary prediction supporting UK and US markets.
Returns predictions with ranges, confidence scores, and explanatory factors.

Key features:
- Single model for both UK and US
- Country-aware predictions
- Automatic currency handling (GBP for UK, USD for US)
- Skill gap analysis
"""

import json
import pickle
import logging
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import xgboost as xgb

from .feature_builder import MultiRegionFeatureBuilder

logger = logging.getLogger(__name__)


class MultiRegionSalaryPredictor:
    """
    Production salary predictor for UK and US markets.
    
    Uses XGBoost model trained on:
    - US: H1B visa data (270,923 records)
    - UK: Adzuna job postings (9,663 records)
    
    Usage:
        predictor = MultiRegionSalaryPredictor.load("models/")
        
        # UK prediction
        result = predictor.predict(
            job_title="Senior Software Engineer",
            country="UK",
            location="London",
            skills=["Python", "AWS"]
        )
        # Returns: £75,000 (range: £65k-£85k)
        
        # US prediction
        result = predictor.predict(
            job_title="Senior Software Engineer",
            country="US",
            location="CA",
            skills=["Python", "AWS"]
        )
        # Returns: $150,000 (range: $130k-$170k)
    """
    
    SENIORITY_LABELS = {
        0: 'Intern', 1: 'Junior', 2: 'Associate', 3: 'Mid-level',
        4: 'Senior', 5: 'Lead', 6: 'Staff', 7: 'Principal',
        8: 'Director', 9: 'VP', 10: 'C-level'
    }
    
    # Currency settings by country
    CURRENCY_CONFIG = {
        'US': {'code': 'USD', 'symbol': '$', 'name': 'US Dollars'},
        'UK': {'code': 'GBP', 'symbol': '£', 'name': 'British Pounds'},
    }
    
    def __init__(
        self,
        model: xgb.XGBRegressor,
        feature_builder: MultiRegionFeatureBuilder,
        metadata: Dict
    ):
        """Initialize with loaded components."""
        self.model = model
        self.feature_builder = feature_builder
        self.metadata = metadata
    
    @classmethod
    def load(cls, models_dir: str = "models") -> "MultiRegionSalaryPredictor":
        """
        Load trained model from disk.
        
        Args:
            models_dir: Directory containing model files
            
        Expected files:
        - multi_region_salary_predictor.json (XGBoost model)
        - multi_region_encoders.pkl (encoders + scaler)
        - multi_region_metadata.json (metrics + info)
        """
        models_path = Path(models_dir)
        
        # Load XGBoost model
        model_file = models_path / "multi_region_salary_predictor.json"
        if not model_file.exists():
            raise FileNotFoundError(
                f"Model not found: {model_file}. "
                "Train model in Colab and copy files."
            )
        
        model = xgb.XGBRegressor()
        model.load_model(str(model_file))
        logger.info(f"Loaded XGBoost model from {model_file}")
        
        # Load encoders
        encoders_file = models_path / "multi_region_encoders.pkl"
        if not encoders_file.exists():
            raise FileNotFoundError(f"Encoders not found: {encoders_file}")
        
        with open(encoders_file, 'rb') as f:
            encoders = pickle.load(f)
        
        # Create feature builder
        feature_builder = MultiRegionFeatureBuilder(
            title_encoder=encoders['title_encoder'],
            country_encoder=encoders['country_encoder'],
            scaler=encoders['scaler'],
            feature_names=encoders['feature_names'],
            tech_skills=encoders.get('tech_skills', [])
        )
        
        # Load metadata
        metadata_file = models_path / "multi_region_metadata.json"
        metadata = {}
        if metadata_file.exists():
            with open(metadata_file) as f:
                metadata = json.load(f)
        
        logger.info(
            f"Multi-region predictor loaded. "
            f"Countries: {metadata.get('countries', ['US', 'UK'])}, "
            f"R²: {metadata.get('metrics', {}).get('overall_r2', 'N/A'):.3f}"
        )
        
        return cls(model, feature_builder, metadata)
    
    def predict(
        self,
        job_title: str,
        country: str,
        location: str,
        skills: Optional[List[str]] = None,
        company: Optional[str] = None,
        include_factors: bool = True
    ) -> Dict:
        """
        Predict salary for given job and location.
        
        Args:
            job_title: Target job title
            country: "UK" or "US"
            location: State code (US) or city name (UK)
            skills: User's technical skills
            company: Company name (optional)
            include_factors: Include explanation breakdown
            
        Returns:
            Dict with prediction, range, confidence, and factors
        """
        skills = skills or []
        country = country.upper()
        
        # Validate country
        if country not in ['UK', 'US']:
            raise ValueError(f"Unsupported country: {country}. Use 'UK' or 'US'.")
        
        # Build features
        features_scaled, feature_values = self.feature_builder.build_features(
            job_title=job_title,
            country=country,
            location=location,
            skills=skills,
            company=company
        )
        
        # Get prediction (model outputs log-transformed salary)
        log_prediction = float(self.model.predict(features_scaled)[0])
        prediction = float(np.exp(log_prediction))

        # Calculate range (±15% based on model accuracy)
        salary_min = int(prediction * 0.85)
        salary_max = int(prediction * 1.15)
        
        # Get currency config
        currency = self.CURRENCY_CONFIG.get(country, self.CURRENCY_CONFIG['US'])
        
        result = {
            'predicted_salary': int(round(prediction)),
            'salary_range': {
                'min': salary_min,
                'max': salary_max
            },
            'confidence': self._calculate_confidence(feature_values, country),
            'country': country,
            'currency': currency['code'],
            'currency_symbol': currency['symbol'],
            'formatted_salary': f"{currency['symbol']}{int(prediction):,}",
            'formatted_range': f"{currency['symbol']}{salary_min:,} - {currency['symbol']}{salary_max:,}",
            'data_source': 'H1B Visa Data' if country == 'US' else 'Adzuna Job Postings',
            'disclaimer': self._get_disclaimer(country)
        }
        
        if include_factors:
            result['factors'] = self._build_factors(feature_values, prediction, country)
            result['skill_analysis'] = self._analyze_skills(skills, feature_values)
        
        return result
    
    def _calculate_confidence(self, features: Dict, country: str) -> int:
        """Calculate prediction confidence (50-90%)."""
        confidence = 55  # Base
        
        # Boost for recognized title
        if features.get('job_title_encoded', 0) > 0:
            confidence += 10
        
        # Boost for tech hub location
        if features.get('is_tech_hub', 0) == 1:
            confidence += 8
        
        # Boost for skills
        total_skills = features.get('total_skills', 0)
        if total_skills >= 3:
            confidence += 10
        elif total_skills >= 1:
            confidence += 5
        
        # US data is more robust (larger sample)
        if country == 'US':
            confidence += 7
        
        return min(90, max(50, confidence))
    
    def _get_disclaimer(self, country: str) -> str:
        """Get country-appropriate disclaimer."""
        if country == 'UK':
            return (
                "Estimate based on UK job postings. "
                "Actual salary varies by company size, experience, and negotiation."
            )
        else:
            return (
                "Estimate based on US H1B visa filings. "
                "Actual salary varies by company tier, experience, and negotiation. "
                "Top-tier companies (FAANG) typically pay 50-100% above these estimates."
            )
    
    def _build_factors(self, features: Dict, prediction: float, country: str) -> List[Dict]:
        """Build human-readable factor breakdown."""
        factors = []
        
        currency = self.CURRENCY_CONFIG[country]
        
        # Seniority
        seniority = features.get('seniority_level', 3)
        seniority_label = features.get('_seniority_label', 'Mid-level')
        
        impact = 'positive' if seniority > 3 else ('negative' if seniority < 3 else 'neutral')
        factors.append({
            'factor': 'Seniority Level',
            'description': seniority_label,
            'impact': impact,
            'value': f'Level {seniority}/10'
        })
        
        # Location
        is_tech_hub = features.get('is_tech_hub', 0)
        location = features.get('_location', 'Unknown')
        
        if is_tech_hub:
            factors.append({
                'factor': 'Location',
                'description': f'Tech hub ({location})',
                'impact': 'positive',
                'value': f"COL: {features.get('cost_of_living', 100)}"
            })
        else:
            factors.append({
                'factor': 'Location',
                'description': location,
                'impact': 'neutral',
                'value': f"COL: {features.get('cost_of_living', 100)}"
            })
        
        # Role type
        role_types = []
        if features.get('is_scientist'): role_types.append('Scientist')
        if features.get('is_engineer'): role_types.append('Engineer')
        if features.get('is_analyst'): role_types.append('Analyst')
        if features.get('is_manager'): role_types.append('Manager')
        
        if role_types:
            high_value = {'Scientist', 'Manager'}
            has_high = bool(set(role_types) & high_value)
            factors.append({
                'factor': 'Role Type',
                'description': ', '.join(role_types),
                'impact': 'positive' if has_high else 'neutral',
                'value': role_types[0]
            })
        
        # Senior engineer combo
        if features.get('senior_engineer', 0) == 1:
            factors.append({
                'factor': 'Senior Engineer',
                'description': 'Senior-level engineering role',
                'impact': 'positive',
                'value': 'Yes'
            })
        
        # Skills
        total_skills = features.get('total_skills', 0)
        if total_skills > 0:
            factors.append({
                'factor': 'Technical Skills',
                'description': f'{total_skills} relevant skill(s) matched',
                'impact': 'positive' if total_skills >= 3 else 'neutral',
                'value': f'{total_skills} skills'
            })
        
        # Company tier
        tier = features.get('company_tier_encoded', 1)
        tier_labels = {4: 'Tier 1 (FAANG)', 3: 'Tier 2 (Top Tech)', 2: 'Tier 3 (Enterprise)', 1: 'Standard', 0: 'Consulting'}
        if tier >= 3:
            factors.append({
                'factor': 'Company Tier',
                'description': tier_labels.get(tier, 'Standard'),
                'impact': 'positive',
                'value': f'Tier {5 - tier}'
            })
        
        return factors
    
    def _analyze_skills(self, user_skills: List[str], features: Dict) -> Dict:
        """Analyze user's skills vs high-value skills."""
        all_skills = self.feature_builder.tech_skills
        
        # First 8 skills are typically highest impact
        high_value = all_skills[:8]
        
        matched = []
        missing = []
        
        for skill in high_value:
            skill_key = f'has_{skill}'
            display = skill.replace('_', ' ').title()
            
            if features.get(skill_key, 0) == 1:
                matched.append(display)
            else:
                missing.append(display)
        
        return {
            'matched_high_value_skills': matched[:5],
            'suggested_skills_to_learn': missing[:5],
            'total_matched': features.get('total_skills', 0),
            'note': 'Skills ranked by salary correlation across UK and US markets'
        }
    
    def get_model_info(self) -> Dict:
        """Return model metadata."""
        metrics = self.metadata.get('metrics', {})
        training = self.metadata.get('training_samples', {})
        
        return {
            'model_type': 'XGBoost Regressor',
            'version': self.metadata.get('model_version', '3.0_multi_region'),
            'description': self.metadata.get('description', 'Multi-region salary predictor'),
            'supported_countries': self.metadata.get('countries', ['US', 'UK']),
            'metrics': {
                'overall_r2': metrics.get('overall_r2'),
                'overall_rmse': metrics.get('overall_rmse'),
            },
            'training_samples': training,
            'feature_count': len(self.feature_builder.feature_names),
            'skill_count': len(self.feature_builder.tech_skills),
            'limitations': [
                'UK data is smaller (9,663 vs 270,923 US records)',
                'Does not include stock/equity compensation',
                'Company-specific variations not fully captured',
                'Individual negotiation not accounted for'
            ]
        }
    
    def health_check(self) -> Dict:
        """Verify model is working."""
        try:
            # Test US prediction
            us_result = self.predict(
                job_title="Software Engineer",
                country="US",
                location="CA",
                skills=["Python"],
                include_factors=False
            )
            
            # Test UK prediction
            uk_result = self.predict(
                job_title="Software Engineer",
                country="UK",
                location="London",
                skills=["Python"],
                include_factors=False
            )
            
            return {
                'status': 'healthy',
                'model_loaded': True,
                'us_test_prediction': us_result['predicted_salary'],
                'uk_test_prediction': uk_result['predicted_salary'],
                'feature_count': len(self.feature_builder.feature_names),
                'skill_count': len(self.feature_builder.tech_skills)
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }


# Singleton instance
_predictor_instance: Optional[MultiRegionSalaryPredictor] = None


def get_predictor(models_dir: str = "models") -> MultiRegionSalaryPredictor:
    """Get or create singleton predictor instance."""
    global _predictor_instance
    
    if _predictor_instance is None:
        _predictor_instance = MultiRegionSalaryPredictor.load(models_dir)
        logger.info("Multi-region salary predictor initialized")
    
    return _predictor_instance


def reset_predictor():
    """Reset singleton (for testing/reloading)."""
    global _predictor_instance
    _predictor_instance = None
