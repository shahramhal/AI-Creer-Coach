"""
Tests for salary_prediction/predictor.py - MultiRegionSalaryPredictor.
Mocks joblib.load and the XGBoost model's predict method.
"""

import numpy as np
import pytest
from unittest.mock import patch, MagicMock
from sklearn.preprocessing import LabelEncoder, StandardScaler

from salary_prediction.feature_builder import MultiRegionFeatureBuilder


def make_test_feature_builder():
    """Build a minimal MultiRegionFeatureBuilder for testing."""
    titles = ["software engineer", "data scientist", "product manager", "other"]
    countries = ["UK", "US"]
    tech_skills = ["python", "javascript", "sql", "aws", "docker"]

    title_encoder = LabelEncoder()
    title_encoder.fit(titles)

    country_encoder = LabelEncoder()
    country_encoder.fit(countries)

    base_feature_names = [
        "job_title_encoded", "country_encoded", "seniority_level",
        "is_manager", "is_engineer", "is_analyst", "is_scientist",
        "cost_of_living", "is_tech_hub", "company_tier_encoded",
        "total_skills", "country_seniority", "country_manager", "senior_engineer",
    ]
    skill_feature_names = [f"has_{skill}" for skill in tech_skills]
    feature_names = base_feature_names + skill_feature_names

    scaler = StandardScaler()
    dummy_data = np.zeros((2, len(feature_names)))
    dummy_data[1] = 1.0
    scaler.fit(dummy_data)

    return MultiRegionFeatureBuilder(
        title_encoder=title_encoder,
        country_encoder=country_encoder,
        scaler=scaler,
        feature_names=feature_names,
        tech_skills=tech_skills,
    )


def make_test_predictor(predicted_log_salary=11.5):
    """Build a MultiRegionSalaryPredictor with a mock XGBoost model."""
    from salary_prediction.predictor import MultiRegionSalaryPredictor

    # Use a plain MagicMock rather than spec=xgb.XGBRegressor so that the
    # xgboost sys.modules stub does not restrict attribute access on the mock.
    mock_xgb_model = MagicMock()
    mock_xgb_model.predict.return_value = np.array([predicted_log_salary])

    feature_builder = make_test_feature_builder()

    metadata = {
        "model_version": "3.0_multi_region",
        "countries": ["UK", "US"],
        "metrics": {"overall_r2": 0.85, "overall_rmse": 5000},
        "training_samples": {"US": 270923, "UK": 9663},
    }

    predictor = MultiRegionSalaryPredictor(
        model=mock_xgb_model,
        feature_builder=feature_builder,
        metadata=metadata,
    )
    return predictor, mock_xgb_model


class TestMultiRegionSalaryPredictorPredict:
    def test_returns_dict_with_required_keys(self):
        predictor, _ = make_test_predictor()
        result = predictor.predict("Software Engineer", "US", "CA", skills=["Python"])
        required_keys = {
            "predicted_salary", "salary_range", "confidence",
            "country", "currency", "currency_symbol",
            "formatted_salary", "formatted_range",
            "data_source", "disclaimer",
        }
        assert required_keys.issubset(set(result.keys()))

    def test_predicted_salary_is_positive_integer(self):
        predictor, _ = make_test_predictor(predicted_log_salary=11.5)
        result = predictor.predict("Software Engineer", "US", "CA")
        assert isinstance(result["predicted_salary"], int)
        assert result["predicted_salary"] > 0

    def test_salary_range_min_less_than_max(self):
        predictor, _ = make_test_predictor()
        result = predictor.predict("Software Engineer", "US", "CA")
        assert result["salary_range"]["min"] < result["salary_range"]["max"]

    def test_salary_min_is_85_percent_of_prediction(self):
        predictor, _ = make_test_predictor(predicted_log_salary=11.0)
        result = predictor.predict("Software Engineer", "US", "CA", include_factors=False)
        # The source computes salary_min = int(float(np.exp(log_salary)) * 0.85)
        # using the raw float, not the rounded integer, so we replicate that here.
        raw_prediction = float(np.exp(11.0))
        expected_min = int(raw_prediction * 0.85)
        assert result["salary_range"]["min"] == expected_min

    def test_salary_max_is_115_percent_of_prediction(self):
        predictor, _ = make_test_predictor(predicted_log_salary=11.0)
        result = predictor.predict("Software Engineer", "US", "CA", include_factors=False)
        raw_prediction = float(np.exp(11.0))
        expected_max = int(raw_prediction * 1.15)
        assert result["salary_range"]["max"] == expected_max

    def test_us_prediction_uses_usd_currency(self):
        predictor, _ = make_test_predictor()
        result = predictor.predict("Software Engineer", "US", "CA")
        assert result["currency"] == "USD"
        assert result["currency_symbol"] == "$"

    def test_uk_prediction_uses_gbp_currency(self):
        predictor, _ = make_test_predictor()
        result = predictor.predict("Software Engineer", "UK", "London")
        assert result["currency"] == "GBP"
        assert result["currency_symbol"] == "£"

    def test_formatted_salary_starts_with_currency_symbol(self):
        predictor, _ = make_test_predictor()
        us_result = predictor.predict("Software Engineer", "US", "CA")
        assert us_result["formatted_salary"].startswith("$")

        uk_result = predictor.predict("Software Engineer", "UK", "London")
        assert uk_result["formatted_salary"].startswith("£")

    def test_raises_value_error_for_unsupported_country(self):
        predictor, _ = make_test_predictor()
        with pytest.raises(ValueError, match="Unsupported country"):
            predictor.predict("Software Engineer", "DE", "Berlin")

    def test_factors_included_when_include_factors_true(self):
        predictor, _ = make_test_predictor()
        result = predictor.predict("Software Engineer", "US", "CA", include_factors=True)
        assert "factors" in result
        assert "skill_analysis" in result

    def test_factors_excluded_when_include_factors_false(self):
        predictor, _ = make_test_predictor()
        result = predictor.predict("Software Engineer", "US", "CA", include_factors=False)
        assert "factors" not in result
        assert "skill_analysis" not in result

    def test_model_predict_called_once_per_request(self):
        predictor, mock_model = make_test_predictor()
        predictor.predict("Software Engineer", "US", "CA")
        mock_model.predict.assert_called_once()

    def test_country_normalized_to_uppercase(self):
        predictor, _ = make_test_predictor()
        result_lower = predictor.predict("Software Engineer", "us", "CA")
        result_upper = predictor.predict("Software Engineer", "US", "CA")
        assert result_lower["country"] == "US"
        assert result_upper["country"] == "US"

    def test_data_source_mentions_h1b_for_us(self):
        predictor, _ = make_test_predictor()
        result = predictor.predict("Software Engineer", "US", "CA")
        assert "H1B" in result["data_source"]

    def test_data_source_mentions_adzuna_for_uk(self):
        predictor, _ = make_test_predictor()
        result = predictor.predict("Software Engineer", "UK", "London")
        assert "Adzuna" in result["data_source"]


class TestMultiRegionSalaryPredictorConfidence:
    def test_confidence_is_between_50_and_90(self):
        predictor, _ = make_test_predictor()
        _, feature_values = predictor.feature_builder.build_features(
            "Software Engineer", "US", "CA", skills=["Python", "SQL", "AWS"]
        )
        confidence = predictor._calculate_confidence(feature_values, "US")
        assert 50 <= confidence <= 90

    def test_us_confidence_higher_than_uk_confidence_for_same_role(self):
        predictor, _ = make_test_predictor()
        _, us_features = predictor.feature_builder.build_features("Software Engineer", "US", "CA")
        _, uk_features = predictor.feature_builder.build_features("Software Engineer", "UK", "London")
        us_confidence = predictor._calculate_confidence(us_features, "US")
        uk_confidence = predictor._calculate_confidence(uk_features, "UK")
        assert us_confidence >= uk_confidence

    def test_more_skills_increase_confidence(self):
        predictor, _ = make_test_predictor()
        _, few_skills_features = predictor.feature_builder.build_features(
            "Software Engineer", "US", "CA", skills=[]
        )
        _, many_skills_features = predictor.feature_builder.build_features(
            "Software Engineer", "US", "CA", skills=["Python", "SQL", "AWS", "Docker"]
        )
        few_confidence = predictor._calculate_confidence(few_skills_features, "US")
        many_confidence = predictor._calculate_confidence(many_skills_features, "US")
        assert many_confidence >= few_confidence


class TestMultiRegionSalaryPredictorGetModelInfo:
    def test_get_model_info_returns_expected_structure(self):
        predictor, _ = make_test_predictor()
        info = predictor.get_model_info()
        assert "model_type" in info
        assert "supported_countries" in info
        assert "feature_count" in info
        assert "skill_count" in info
        assert "limitations" in info

    def test_supported_countries_contains_uk_and_us(self):
        predictor, _ = make_test_predictor()
        info = predictor.get_model_info()
        assert "UK" in info["supported_countries"]
        assert "US" in info["supported_countries"]


class TestGetPredictorSingleton:
    def test_get_predictor_raises_file_not_found_when_models_missing(self):
        from salary_prediction.predictor import get_predictor, reset_predictor
        reset_predictor()
        with pytest.raises(FileNotFoundError):
            get_predictor(models_dir="/nonexistent/path")
        reset_predictor()

    def test_reset_predictor_clears_singleton(self):
        from salary_prediction.predictor import get_predictor, reset_predictor
        reset_predictor()
        from salary_prediction import predictor as predictor_module
        assert predictor_module._predictor_instance is None
