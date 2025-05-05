import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';

class AuthService {
  final _storage = const FlutterSecureStorage();
  static const String _usersKey = 'users_db';
  static const String _currentUserKey = 'current_user';

  // Helper to get all users as a map
  Future<Map<String, dynamic>> _getUsers() async {
    final usersJson = await _storage.read(key: _usersKey);
    if (usersJson == null) return {};
    return jsonDecode(usersJson) as Map<String, dynamic>;
  }

  // Helper to save all users
  Future<void> _saveUsers(Map<String, dynamic> users) async {
    await _storage.write(key: _usersKey, value: jsonEncode(users));
  }

  // Sign up a new user
  Future<void> signUp({
    required String email,
    required String password,
    required String name,
  }) async {
    final users = await _getUsers();
    if (users.containsKey(email)) {
      throw Exception('Email already exists');
    }
    users[email] = {
      'email': email,
      'password': password,
      'name': name,
    };
    await _saveUsers(users);
    await _storage.write(key: _currentUserKey, value: jsonEncode(users[email]));
  }

  // Sign in an existing user
  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    final users = await _getUsers();
    if (!users.containsKey(email)) {
      throw Exception('Invalid email or password');
    }
    final user = users[email];
    if (user['password'] != password) {
      throw Exception('Invalid email or password');
    }
    await _storage.write(key: _currentUserKey, value: jsonEncode(user));
  }

  // Sign out the current user
  Future<void> signOut() async {
    await _storage.delete(key: _currentUserKey);
  }

  // Check if a user is authenticated
  Future<bool> isAuthenticated() async {
    final userJson = await _storage.read(key: _currentUserKey);
    return userJson != null;
  }

  // Get current user info
  Future<Map<String, String?>> getUserInfo() async {
    final userJson = await _storage.read(key: _currentUserKey);
    if (userJson == null) return {'email': null, 'name': null};
    final user = jsonDecode(userJson);
    return {
      'email': user['email'],
      'name': user['name'],
    };
  }
} 