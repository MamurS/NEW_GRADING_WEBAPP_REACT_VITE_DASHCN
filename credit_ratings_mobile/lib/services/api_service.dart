import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart';
import 'dart:io';

class ApiService {
  final Dio _dio;
  final _storage = const FlutterSecureStorage();
  static const String baseUrl = 'https://176.97.67.69';
  static const String _token = "39b5130b-ba84-4041-8574-2bb59dddf995";

  ApiService() : _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  )) {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'auth_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
    ));

    // Configure Dio to accept self-signed certificates
    (_dio.httpClientAdapter as IOHttpClientAdapter).onHttpClientCreate = 
      (HttpClient client) {
        client.badCertificateCallback = (X509Certificate cert, String host, int port) => true;
        return client;
      };
  }

  Future<Map<String, dynamic>> getAmqpConnection() async {
    try {
      final response = await _dio.post(
        '/get_amqp_connection',
        data: {
          'value': _token
        },
      );
      return response.data;
    } catch (e) {
      throw Exception('Failed to get AMQP connection: $e');
    }
  }

  Future<Map<String, dynamic>> prepareInformation({
    required Map<String, dynamic> amqpData,
    required Map<String, dynamic> formData,
  }) async {
    try {
      final countryNumbers = {
        'Russia': 170,
      };

      final amqpConnect = {
        "username": amqpData['data']['username'] ?? '',
        "password": amqpData['data']['password'] ?? '',
        "queuename": amqpData['data']['queuename'] ?? ''
      };

      final requestBody = {
        "amqp_connect": amqpConnect,
        "request": {
          "country": countryNumbers[formData['country']] ?? 170,
          "identifier": formData['companyCode'],
          "with_group": formData['isGroup']
        },
        "token": {
          "value": _token
        }
      };

      final response = await _dio.post('/prepare_information', data: requestBody);
      return response.data;
    } catch (e) {
      throw Exception('Failed to prepare information: $e');
    }
  }

  Future<String> prepareReport({
    required Map<String, dynamic> amqpData,
    required Map<String, dynamic> formData,
  }) async {
    try {
      final countryNumbers = {
        'Russia': 170,
      };

      final amqpConnect = {
        "username": amqpData['data']['username'] ?? '',
        "password": amqpData['data']['password'] ?? '',
        "queuename": amqpData['data']['queuename'] ?? ''
      };

      final decisionCurrency = formData['creditLimitDecisionCurrency'] == 'ORIGINAL CURRENCY'
          ? 'ORIGINAL'
          : formData['creditLimitDecisionCurrency'];

      final requestedLimit = formData['requestedLimitAmount']?.toString().replaceAll(',', '') ?? '0';

      final requestBody = {
        "amqp_connect": amqpConnect,
        "request": {
          "country": countryNumbers[formData['country']] ?? 170,
          "identifier": formData['companyCode'],
          "with_group": formData['isGroup']
        },
        "token": {
          "value": _token
        }
      };

      final queryParams = {
        'currency_requested_limit': formData['requestedLimitCurrency'] ?? '',
        'requested_limit': requestedLimit,
        'language': formData['language'] ?? '',
        'currency': decisionCurrency
      };

      final response = await _dio.post(
        '/prepare_report',
        data: requestBody,
        queryParameters: queryParams,
      );
      
      if (response.data['status'] == true && response.data['data'] != null) {
        return response.data['data']['file_uuid'];
      } else {
        throw Exception('Failed to prepare report: ${response.data['msg']}');
      }
    } catch (e) {
      throw Exception('Failed to prepare report: $e');
    }
  }

  Future<Map<String, dynamic>> getFile(String fileUuid) async {
    const maxRetries = 5;
    const retryDelay = Duration(seconds: 10);
    var retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        print('Attempt ${retryCount + 1} of $maxRetries');
        print('Request URL: $baseUrl/get_file?file_uuid=$fileUuid');
        print('Request Headers:');
        print('  Content-Type: application/json');
        print('  Accept: application/json');
        print('Request Body:');
        print('  {"value": "$_token"}');

        final response = await _dio.post(
          '/get_file',
          data: {
            'value': _token
          },
          queryParameters: {
            'file_uuid': fileUuid
          },
          options: Options(
            responseType: ResponseType.bytes,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          ),
        );

        print('Response Status Code: ${response.statusCode}');
        print('Response Headers:');
        response.headers.forEach((name, values) {
          print('  $name: ${values.join(", ")}');
        });

        // Check if we received binary data with PDF headers
        if (response.headers.value('content-type') == 'application/octet-stream' ||
            response.headers.value('content-disposition')?.contains('filename=') == true) {
          print('Received binary PDF data');
          return {
            'status': response.statusCode,
            'headers': response.headers.map,
            'body': response.data,
            'isBinary': true,
            'contentType': 'application/pdf',
          };
        }

        // Try to parse as JSON
        try {
          final jsonResponse = json.decode(utf8.decode(response.data));
          print('Parsed JSON response: $jsonResponse');
          
          if (jsonResponse['Download_file'] != null) {
            print('Found download URL: ${jsonResponse['Download_file']}');
            return {
              'status': response.statusCode,
              'headers': response.headers.map,
              'body': jsonResponse,
              'isBinary': false,
              'downloadUrl': jsonResponse['Download_file'],
            };
          }
        } catch (e) {
          print('Response is not JSON, waiting for binary data...');
        }

        // If we didn't get binary data or a download URL, retry
        if (retryCount < maxRetries - 1) {
          print('No binary data or download URL available yet. Waiting ${retryDelay.inSeconds} seconds before retry...');
          await Future.delayed(retryDelay);
          retryCount++;
          continue;
        }
      } catch (e) {
        print('Error occurred: $e');
        if (retryCount < maxRetries - 1) {
          print('Waiting ${retryDelay.inSeconds} seconds before retry...');
          await Future.delayed(retryDelay);
          retryCount++;
          continue;
        }
        throw Exception('Failed to get file: $e');
      }
    }
    throw Exception('Failed to get file after $maxRetries attempts');
  }
} 