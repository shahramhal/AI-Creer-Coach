"""
Database connections module
"""

from .mongodb import get_mongodb_connection

__all__ = ['get_mongodb_connection']