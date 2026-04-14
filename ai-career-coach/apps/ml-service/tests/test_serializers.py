"""
Tests for utils/serializers.py - serialize_objectid function.
"""

import json
import pytest
from bson import ObjectId

from utils.serializers import serialize_objectid


class TestSerializeObjectId:
    def test_converts_objectid_to_string(self):
        oid = ObjectId("507f1f77bcf86cd799439011")
        result = serialize_objectid(oid)
        assert result == "507f1f77bcf86cd799439011"
        assert isinstance(result, str)

    def test_serializes_dict_with_objectid_value(self):
        doc = {"_id": ObjectId("507f1f77bcf86cd799439011"), "name": "Alice"}
        result = serialize_objectid(doc)
        assert result["_id"] == "507f1f77bcf86cd799439011"
        assert result["name"] == "Alice"

    def test_serializes_nested_dict_with_objectid(self):
        nested = {
            "user": {
                "_id": ObjectId("507f1f77bcf86cd799439012"),
                "profile": {"ref": ObjectId("507f1f77bcf86cd799439013")},
            }
        }
        result = serialize_objectid(nested)
        assert result["user"]["_id"] == "507f1f77bcf86cd799439012"
        assert result["user"]["profile"]["ref"] == "507f1f77bcf86cd799439013"

    def test_serializes_list_of_objectids(self):
        id_list = [
            ObjectId("507f1f77bcf86cd799439011"),
            ObjectId("507f1f77bcf86cd799439012"),
        ]
        result = serialize_objectid(id_list)
        assert result == ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]

    def test_serializes_list_of_dicts_with_objectids(self):
        docs = [
            {"_id": ObjectId("507f1f77bcf86cd799439011"), "val": 1},
            {"_id": ObjectId("507f1f77bcf86cd799439012"), "val": 2},
        ]
        result = serialize_objectid(docs)
        assert result[0]["_id"] == "507f1f77bcf86cd799439011"
        assert result[1]["_id"] == "507f1f77bcf86cd799439012"

    def test_passes_through_plain_strings_unchanged(self):
        plain_string = "not_an_objectid"
        result = serialize_objectid(plain_string)
        assert result == "not_an_objectid"

    def test_passes_through_integers_unchanged(self):
        result = serialize_objectid(42)
        assert result == 42

    def test_passes_through_none_unchanged(self):
        result = serialize_objectid(None)
        assert result is None

    def test_passes_through_booleans_unchanged(self):
        assert serialize_objectid(True) is True
        assert serialize_objectid(False) is False

    def test_passes_through_floats_unchanged(self):
        result = serialize_objectid(3.14)
        assert result == 3.14

    def test_output_is_json_serializable_for_flat_doc(self):
        doc = {"_id": ObjectId("507f1f77bcf86cd799439011"), "score": 95}
        result = serialize_objectid(doc)
        serialized = json.dumps(result)
        parsed = json.loads(serialized)
        assert parsed["_id"] == "507f1f77bcf86cd799439011"
        assert parsed["score"] == 95

    def test_output_is_json_serializable_for_nested_doc(self):
        doc = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "refs": [ObjectId("507f1f77bcf86cd799439012")],
            "meta": {"parent": ObjectId("507f1f77bcf86cd799439013")},
        }
        result = serialize_objectid(doc)
        serialized = json.dumps(result)
        assert "507f1f77bcf86cd799439011" in serialized
        assert "507f1f77bcf86cd799439012" in serialized
        assert "507f1f77bcf86cd799439013" in serialized

    def test_empty_dict_returned_unchanged(self):
        result = serialize_objectid({})
        assert result == {}

    def test_empty_list_returned_unchanged(self):
        result = serialize_objectid([])
        assert result == []

    def test_mixed_list_with_objectid_and_primitives(self):
        mixed = [ObjectId("507f1f77bcf86cd799439011"), "hello", 42, None]
        result = serialize_objectid(mixed)
        assert result == ["507f1f77bcf86cd799439011", "hello", 42, None]
