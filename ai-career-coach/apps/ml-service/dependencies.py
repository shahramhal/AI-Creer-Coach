"""
Shared service singletons for all routers.

Initialised once at import time so every router references the same
model instances (avoids loading the ~90MB sentence-transformer twice).
"""

import os

from cv_parser.parserV2 import CVParser
from job_matcher.matcher import JobMatcher
from cv_analyzer.analyzer import CVAnalyzer
from cv_analyzer.ats_scorer import set_shared_model
from skill_gap.analyzer import SkillGapAnalyzer

cv_parser = CVParser(
    anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY")
)

job_matcher = JobMatcher()

# Share the sentence-transformer model so CVAnalyzer does not reload it.
if hasattr(job_matcher, "model") and job_matcher.model is not None:
    set_shared_model(job_matcher.model)

cv_analyzer = CVAnalyzer()
skill_gap_analyzer = SkillGapAnalyzer()
