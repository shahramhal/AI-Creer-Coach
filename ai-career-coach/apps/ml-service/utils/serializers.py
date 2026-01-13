"""
Utility functions for serializing MongoDB data types
"""

from bson import ObjectId
from typing import Any, Dict, List


def serialize_objectid(data: Any) -> Any:
    """
    Recursively convert MongoDB ObjectId to string in dictionaries and lists

    Args:
        data: Data structure that may contain ObjectIds

    Returns:
        Data structure with ObjectIds converted to strings
    """
    if isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, dict):
        return {key: serialize_objectid(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [serialize_objectid(item) for item in data]
    else:
        return data
