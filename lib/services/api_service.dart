import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  final Dio _dio = Dio();
  final _storage = const FlutterSecureStorage();
  final String baseUrl = 'http://localhost:3000';

  ApiService() {
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 60);
    _dio.options.receiveTimeout = const Duration(seconds: 60);
  }

  Future<String> getAmqpConnection() async {
    try {
      final response = await _dio.post('/get_amqp_connection');
      return response.data['connection_id'];
    } catch (e) {
      throw Exception('Failed to get AMQP connection: $e');
    }
  }

  Future<Map<String, dynamic>> prepareInformation() async {
    try {
      final response = await _dio.post('/prepare_information');
      return response.data;
    } catch (e) {
      throw Exception('Failed to prepare information: $e');
    }
  }

  Future<String> prepareReport({
    required String currencyRequestedLimit,
    required String requestedLimit,
    required String language,
    required String currency,
  }) async {
    try {
      final response = await _dio.post(
        '/prepare_report',
        queryParameters: {
          'currency_requested_limit': currencyRequestedLimit,
          'requested_limit': requestedLimit,
          'language': language,
          'currency': currency,
        },
      );
      return response.data['file_uuid'];
    } catch (e) {
      throw Exception('Failed to prepare report: $e');
    }
  }

  Future<Map<String, dynamic>> getFile(String fileUuid) async {
    try {
      final response = await _dio.post(
        '/get_file',
        queryParameters: {'file_uuid': fileUuid},
      );
      return {
        'status': response.statusCode,
        'headers': response.headers.map,
        'body': response.data,
      };
    } catch (e) {
      if (e is DioException && e.response != null) {
        return {
          'status': e.response?.statusCode,
          'headers': e.response?.headers.map,
          'body': e.response?.data,
        };
      }
      throw Exception('Failed to get file: $e');
    }
  }
} 