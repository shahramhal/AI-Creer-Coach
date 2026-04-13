"""
Tests for salary_prediction/feature_builder.py - MultiRegionFeatureBuilder.
"""

import numpy as np
import pytest
from unittest.mock import MagicMock, patch
from sklearn.preprocessing import LabelEncoder, StandardScaler


def make_feature_builder(
    titles=None,
    countries=None,
    feature_names=None,
    tech_skills=None,
):
    """Build a MultiRegionFeatureBuilder with minimal fitted encoders for testing."""
    titles = titles or ["software engineer", "data scientist", "product manager", "other"]
    countries = countries or ["UK", "US"]
    tech_skills = tech_skills or ["python", "javascript", "sql", "aws", "docker"]

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
    feature_names = feature_names or (base_feature_names + skill_feature_names)

    scaler = StandardScaler()
    dummy_data = np.zeros((2, len(feature_names)))
    dummy_data[1] = 1.0
    scaler.fit(dummy_data)

    from salary_prediction.feature_builder import MultiRegionFeatureBuilder
    return MultiRegionFeatureBuilder(
        title_encoder=title_encoder,
        country_encoder=country_encoder,
        scaler=scaler,
        feature_names=feature_names,
        tech_skills=tech_skills,
    )


@pytest.fixture
def feature_builder():
    return make_feature_builder()


class TestBuildFeatures:
    def test_returns_tuple_of_scaled_array_and_dict(self, feature_builder):
        scaled, raw = feature_builder.build_features(
            job_title="Software Engineer",
            country="US",
            location="CA",
            skills=["Python", "SQL"],
        )
        assert isinstance(scaled, np.ndarray)
        assert isinstance(raw, dict)

    def test_scaled_array_shape_matches_feature_count(self, feature_builder):
        expected_feature_count = len(feature_builder.feature_names)
        scaled, _ = feature_builder.build_features("Software Engineer", "US", "CA")
        assert scaled.shape == (1, expected_feature_count)

    def test_senior_title_gives_high_seniority_level(self, feature_builder):
        _, raw = feature_builder.build_features("Senior Software Engineer", "US", "CA")
        assert raw["seniority_level"] == 4

    def test_junior_title_gives_low_seniority_level(self, feature_builder):
        _, raw = feature_builder.build_features("Junior Software Engineer", "US", "CA")
        assert raw["seniority_level"] == 1

    def test_default_seniority_for_unrecognized_title(self, feature_builder):
        _, raw = feature_builder.build_features("Software Engineer", "US", "CA")
        assert raw["seniority_level"] == 3

    def test_engineer_in_title_sets_is_engineer_flag(self, feature_builder):
        _, raw = feature_builder.build_features("Backend Engineer", "US", "NY")
        assert raw["is_engineer"] == 1

    def test_manager_in_title_sets_is_manager_flag(self, feature_builder):
        _, raw = feature_builder.build_features("Engineering Manager", "US", "CA")
        assert raw["is_manager"] == 1

    def test_analyst_in_title_sets_is_analyst_flag(self, feature_builder):
        _, raw = feature_builder.build_features("Business Analyst", "UK", "London")
        assert raw["is_analyst"] == 1

    def test_scientist_in_title_sets_is_scientist_flag(self, feature_builder):
        _, raw = feature_builder.build_features("Data Scientist", "UK", "London")
        assert raw["is_scientist"] == 1

    def test_known_skill_sets_has_skill_flag_to_1(self, feature_builder):
        _, raw = feature_builder.build_features(
            "Software Engineer", "US", "CA", skills=["Python"]
        )
        assert raw.get("has_python") == 1

    def test_missing_skill_leaves_has_skill_flag_at_0(self, feature_builder):
        _, raw = feature_builder.build_features(
            "Software Engineer", "US", "CA", skills=["Java"]
        )
        assert raw.get("has_python") == 0

    def test_total_skills_counts_matched_skills_only(self, feature_builder):
        _, raw = feature_builder.build_features(
            "Software Engineer", "US", "CA", skills=["Python", "SQL"]
        )
        assert raw["total_skills"] >= 2

    def test_country_interaction_features_are_computed(self, feature_builder):
        _, raw = feature_builder.build_features("Senior Manager", "US", "CA")
        assert "country_seniority" in raw
        assert "country_manager" in raw
        assert "senior_engineer" in raw

    def test_senior_engineer_interaction_flag_set_correctly(self, feature_builder):
        _, raw = feature_builder.build_features("Senior Software Engineer", "US", "CA")
        assert raw["senior_engineer"] == 1

    def test_no_skills_gives_zero_total_skills(self, feature_builder):
        _, raw = feature_builder.build_features("Software Engineer", "US", "CA", skills=[])
        assert raw["total_skills"] == 0

    def test_meta_fields_added_to_raw_dict(self, feature_builder):
        _, raw = feature_builder.build_features("Software Engineer", "US", "CA")
        assert "_country" in raw
        assert "_location" in raw
        assert "_seniority_label" in raw


class TestGetCostOfLiving:
    def test_london_uk_returns_high_col(self, feature_builder):
        col = feature_builder._get_cost_of_living("London", "UK")
        assert col == 142

    def test_california_us_returns_high_col(self, feature_builder):
        col = feature_builder._get_cost_of_living("CA", "US")
        assert col == 142

    def test_unknown_uk_location_returns_100(self, feature_builder):
        col = feature_builder._get_cost_of_living("Unknown City", "UK")
        assert col == 100

    def test_unknown_us_state_returns_100(self, feature_builder):
        col = feature_builder._get_cost_of_living("ZZ", "US")
        assert col == 100

    def test_empty_location_returns_100(self, feature_builder):
        col = feature_builder._get_cost_of_living("", "US")
        assert col == 100


class TestIsTechHub:
    def test_london_is_uk_tech_hub(self, feature_builder):
        assert feature_builder._is_tech_hub("London", "UK") == 1

    def test_california_is_us_tech_hub(self, feature_builder):
        assert feature_builder._is_tech_hub("CA", "US") == 1

    def test_unknown_location_is_not_tech_hub(self, feature_builder):
        assert feature_builder._is_tech_hub("Rural Village", "UK") == 0

    def test_empty_location_is_not_tech_hub(self, feature_builder):
        assert feature_builder._is_tech_hub("", "US") == 0


class TestGetCompanyTier:
    def test_google_is_tier_1(self, feature_builder):
        tier = feature_builder._get_company_tier("Google")
        assert tier == 4

    def test_amazon_is_tier_1(self, feature_builder):
        tier = feature_builder._get_company_tier("Amazon")
        assert tier == 4

    def test_unknown_company_defaults_to_tier_4_encoding_1(self, feature_builder):
        tier = feature_builder._get_company_tier("LocalStartup Ltd")
        assert tier == 1

    def test_none_company_defaults_to_tier_4_encoding_1(self, feature_builder):
        tier = feature_builder._get_company_tier(None)
        assert tier == 1

    def test_consulting_firm_maps_to_tier_5(self, feature_builder):
        tier = feature_builder._get_company_tier("Accenture")
        assert tier == 0


class TestNormalizeUSState:
    def test_two_letter_code_passed_through_uppercase(self, feature_builder):
        assert feature_builder._normalize_us_state("ca") == "CA"

    def test_california_full_name_maps_to_ca(self, feature_builder):
        assert feature_builder._normalize_us_state("california") == "CA"

    def test_city_state_format_extracts_state(self, feature_builder):
        assert feature_builder._normalize_us_state("San Francisco, CA") == "CA"

    def test_unknown_location_returns_unknown(self, feature_builder):
        assert feature_builder._normalize_us_state("some unknown place xyz") == "UNKNOWN"


class TestExtractSeniority:
    @pytest.mark.parametrize("title,expected_level", [
        ("intern developer", 0),
        ("junior software engineer", 1),
        ("associate engineer", 2),
        ("software engineer", 3),
        ("senior software engineer", 4),
        ("lead engineer", 5),
        ("staff engineer", 6),
        ("principal engineer", 7),
        ("director of engineering", 8),
        ("vp of engineering", 9),
        ("chief technology officer", 10),
    ])
    def test_seniority_extracted_from_title(self, feature_builder, title, expected_level):
        level = feature_builder._extract_seniority(title)
        assert level == expected_level


class TestGetInfo:
    def test_get_info_returns_expected_structure(self, feature_builder):
        info = feature_builder.get_info()
        assert "version" in info
        assert "total_features" in info
        assert "skill_count" in info
        assert "supported_countries" in info
        assert "UK" in info["supported_countries"]
        assert "US" in info["supported_countries"]
