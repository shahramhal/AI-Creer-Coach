"""
CV Analyzer Package
Provides comprehensive CV analysis without external API calls.
Uses KeyBERT + JobBERT for keyword extraction and rule-based engines for scoring.
"""

from cv_analyzer.analyzer import CVAnalyzer

__all__ = ["CVAnalyzer"]
