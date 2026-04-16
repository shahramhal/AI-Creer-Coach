"""
Tests for database/mongodb.py - MongoDBConnection class
"""
import pytest
from unittest.mock import MagicMock, patch, PropertyMock


class TestMongoDBConnectionInit:
    def test_initial_state_has_no_client(self):
        from database.mongodb import MongoDBConnection
        conn = MongoDBConnection()
        assert conn.client is None
        assert conn.db is None
        assert conn.collection is None


class TestMongoDBConnectionConnect:
    def _make_client(self):
        """Build a fully-mocked MongoClient."""
        client = MagicMock()
        collection = MagicMock()
        collection.create_index = MagicMock()
        db = MagicMock()
        db.__getitem__ = MagicMock(return_value=collection)
        client.__getitem__ = MagicMock(return_value=db)
        client.admin.command = MagicMock(return_value={'ok': 1})
        return client, db, collection

    def test_connect_returns_true_on_success(self):
        from database.mongodb import MongoDBConnection
        client, db, collection = self._make_client()

        with patch('database.mongodb.MongoClient', return_value=client):
            conn = MongoDBConnection()
            result = conn.connect()

        assert result is True
        assert conn.client is client

    def test_connect_pings_admin(self):
        from database.mongodb import MongoDBConnection
        client, db, collection = self._make_client()

        with patch('database.mongodb.MongoClient', return_value=client):
            conn = MongoDBConnection()
            conn.connect()

        client.admin.command.assert_called_once_with('ping')

    def test_connect_returns_false_on_exception(self):
        from database.mongodb import MongoDBConnection

        with patch('database.mongodb.MongoClient', side_effect=Exception('Connection refused')):
            conn = MongoDBConnection()
            result = conn.connect()

        assert result is False
        assert conn.client is None

    def test_connect_creates_user_id_index(self):
        from database.mongodb import MongoDBConnection
        client, db, collection = self._make_client()

        with patch('database.mongodb.MongoClient', return_value=client):
            conn = MongoDBConnection()
            conn.connect()

        index_calls = [call[0][0] for call in collection.create_index.call_args_list]
        assert any('user_id' in str(c) for c in index_calls)

    def test_connect_uses_env_uri(self):
        from database.mongodb import MongoDBConnection
        client, db, collection = self._make_client()

        with patch('database.mongodb.MongoClient', return_value=client) as mock_mc, \
             patch('database.mongodb.os.getenv', side_effect=lambda k, d='': {
                 'MONGODB_URI': 'mongodb://custom-host:27017/',
                 'MONGODB_DB_NAME': 'test_db',
             }.get(k, d)):
            conn = MongoDBConnection()
            conn.connect()

        mock_mc.assert_called_once_with('mongodb://custom-host:27017/')


class TestSaveParsedCV:
    def _connected_conn(self):
        from database.mongodb import MongoDBConnection
        conn = MongoDBConnection()
        conn.collection = MagicMock()
        conn.collection.insert_one.return_value = MagicMock(inserted_id='507f1f77bcf86cd799439011')
        return conn

    def test_save_returns_string_id(self):
        conn = self._connected_conn()
        result = conn.save_parsed_cv('user-1', {'skills': ['Python']})
        assert isinstance(result, str)
        assert result == '507f1f77bcf86cd799439011'

    def test_save_appends_user_id_to_document(self):
        conn = self._connected_conn()
        conn.save_parsed_cv('user-42', {'name': 'Alice'})
        inserted_doc = conn.collection.insert_one.call_args[0][0]
        assert inserted_doc['user_id'] == 'user-42'

    def test_save_does_not_mutate_original_data(self):
        conn = self._connected_conn()
        original = {'name': 'Bob'}
        conn.save_parsed_cv('user-1', original)
        assert 'user_id' not in original

    def test_save_returns_none_when_collection_unavailable_after_reconnect(self):
        from database.mongodb import MongoDBConnection
        conn = MongoDBConnection()
        conn.collection = None

        with patch.object(conn, 'connect', side_effect=lambda: None):
            result = conn.save_parsed_cv('user-1', {'data': 'x'})

        assert result is None

    def test_save_triggers_connect_when_collection_is_none(self):
        from database.mongodb import MongoDBConnection
        conn = MongoDBConnection()
        conn.collection = None

        def fake_connect():
            conn.collection = MagicMock()
            conn.collection.insert_one.return_value = MagicMock(inserted_id='abc123')

        with patch.object(conn, 'connect', side_effect=fake_connect):
            result = conn.save_parsed_cv('user-1', {'x': 1})

        assert result == 'abc123'


class TestGetCVByUser:
    def _connected_conn(self, cv_doc=None):
        from database.mongodb import MongoDBConnection
        conn = MongoDBConnection()
        conn.collection = MagicMock()
        conn.collection.find_one.return_value = cv_doc
        return conn

    def test_returns_none_when_no_cv_found(self):
        conn = self._connected_conn(cv_doc=None)
        result = conn.get_cv_by_user('user-999')
        assert result is None

    def test_queries_by_user_id(self):
        conn = self._connected_conn(cv_doc={'user_id': 'user-1', 'skills': []})
        conn.get_cv_by_user('user-1')
        call_filter = conn.collection.find_one.call_args[0][0]
        assert call_filter == {'user_id': 'user-1'}

    def test_sorts_by_parsed_at_descending(self):
        conn = self._connected_conn(cv_doc={'user_id': 'user-1'})
        conn.get_cv_by_user('user-1')
        call_kwargs = conn.collection.find_one.call_args[1]
        assert call_kwargs.get('sort') == [('parsed_at', -1)]

    def test_returns_none_when_collection_unavailable_after_reconnect(self):
        from database.mongodb import MongoDBConnection
        conn = MongoDBConnection()
        conn.collection = None

        with patch.object(conn, 'connect', side_effect=lambda: None):
            result = conn.get_cv_by_user('user-1')

        assert result is None

    def test_triggers_connect_when_collection_is_none(self):
        from database.mongodb import MongoDBConnection
        conn = MongoDBConnection()
        conn.collection = None

        def fake_connect():
            conn.collection = MagicMock()
            conn.collection.find_one.return_value = None

        with patch.object(conn, 'connect', side_effect=fake_connect):
            result = conn.get_cv_by_user('user-1')

        assert result is None


class TestClose:
    def test_close_calls_client_close(self):
        from database.mongodb import MongoDBConnection
        conn = MongoDBConnection()
        conn.client = MagicMock()
        conn.close()
        conn.client.close.assert_called_once()

    def test_close_is_safe_when_client_is_none(self):
        from database.mongodb import MongoDBConnection
        conn = MongoDBConnection()
        conn.client = None
        conn.close()  # should not raise


class TestGetMongoDBConnection:
    def test_returns_mongodb_connection_instance(self):
        from database.mongodb import get_mongodb_connection, MongoDBConnection
        instance = get_mongodb_connection()
        assert isinstance(instance, MongoDBConnection)

    def test_returns_same_singleton_each_time(self):
        from database.mongodb import get_mongodb_connection
        assert get_mongodb_connection() is get_mongodb_connection()
