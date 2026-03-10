"""
Test configuration for ml-service pytest suite.

Adds the ml-service root to sys.path so imports like
`from skill_gap.analyzer import SkillGapAnalyzer` resolve correctly
without needing an installed package.
"""

import sys
import os

# Ensure the ml-service root is on the module search path
ML_SERVICE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ML_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, ML_SERVICE_ROOT)
