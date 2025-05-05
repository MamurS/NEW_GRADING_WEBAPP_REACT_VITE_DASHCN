import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_file/open_file.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:io';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'pages/auth_page.dart';
import 'package:dio/dio.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Credit Ratings',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const AuthWrapper(),
        '/home': (context) => const MyHomePage(title: 'Credit Ratings'),
      },
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  final _authService = AuthService();
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final isAuthenticated = await _authService.isAuthenticated();
    if (mounted) {
      setState(() {
        _isLoading = false;
      });
      if (isAuthenticated) {
        Navigator.of(context).pushReplacementNamed('/home');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }
    return const AuthPage();
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  final _formKey = GlobalKey<FormState>();
  final _apiService = ApiService();
  final _authService = AuthService();
  bool _isLoading = false;
  String? _errorMessage;
  String? _downloadUrl;
  Map<String, dynamic>? _responseDetails;

  final TextEditingController _companyCodeController = TextEditingController();
  final TextEditingController _requestedLimitController = TextEditingController();
  bool _isGroup = false;
  String _selectedCountry = 'Russia';
  String _selectedCurrency = 'RUB';
  String _selectedLanguage = 'English';
  String _selectedReportCurrency = 'ORIGINAL';

  final List<String> _currencies = ['RUB', 'EUR', 'USD', 'GBP'];
  final List<String> _languages = ['English', 'Russian', 'German', 'French'];
  final List<String> _reportCurrencies = ['ORIGINAL', 'EUR', 'USD', 'GBP', 'RUB'];
  final List<String> _countries = ['Russia', 'Germany', 'France', 'United Kingdom', 'United States'];

  String _formatNumber(String value) {
    if (value.isEmpty) return '';
    final number = int.tryParse(value.replaceAll(',', ''));
    if (number == null) return value;
    return number.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
  }

  @override
  void initState() {
    super.initState();
    // Add listener for number formatting
    _requestedLimitController.addListener(() {
      final text = _requestedLimitController.text;
      final formattedText = _formatNumber(text.replaceAll(',', ''));
      if (text != formattedText) {
        _requestedLimitController.value = TextEditingValue(
          text: formattedText,
          selection: TextSelection.collapsed(offset: formattedText.length),
        );
      }
    });
  }

  @override
  void dispose() {
    _companyCodeController.dispose();
    _requestedLimitController.dispose();
    super.dispose();
  }

  Future<void> _handleLogout() async {
    await _authService.signOut();
    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/');
    }
  }

  Future<void> _generateReport() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _downloadUrl = null;
      _responseDetails = null;
    });

    try {
      // Step 1: Get AMQP connection
      final amqpData = await _apiService.getAmqpConnection();
      setState(() {
        _responseDetails = {
          'status': 200,
          'headers': {'step': 'get_amqp_connection'},
          'body': 'AMQP connection established'
        };
      });

      // Step 2: Prepare information
      final formData = {
        'companyCode': _companyCodeController.text,
        'isGroup': _isGroup,
        'country': _selectedCountry,
      };

      await _apiService.prepareInformation(
        amqpData: amqpData,
        formData: formData,
      );
      setState(() {
        _responseDetails = {
          'status': 200,
          'headers': {'step': 'prepare_information'},
          'body': 'Information prepared successfully'
        };
      });

      // Step 3: Prepare report
      final reportFormData = {
        'companyCode': _companyCodeController.text,
        'isGroup': _isGroup,
        'country': _selectedCountry,
        'creditLimitDecisionCurrency': _selectedReportCurrency,
        'requestedLimitAmount': _requestedLimitController.text,
        'requestedLimitCurrency': _selectedCurrency,
        'language': _selectedLanguage,
      };

      final fileUuid = await _apiService.prepareReport(
        amqpData: amqpData,
        formData: reportFormData,
      );

      setState(() {
        _responseDetails = {
          'status': 200,
          'headers': {'step': 'prepare_report'},
          'body': 'Report prepared successfully'
        };
      });

      // Step 4: Get file
      int attempts = 0;
      while (attempts < 10) {
        final response = await _apiService.getFile(fileUuid);
        setState(() {
          _responseDetails = response;
        });

        if (response['isBinary'] == true) {
          // Save PDF file from binary data
          final bytes = response['body'] as List<int>;
          final directory = await getApplicationDocumentsDirectory();
          final file = File('${directory.path}/report.pdf');
          
          // Write the bytes to the file
          await file.writeAsBytes(bytes, flush: true);
          
          // Verify the file was written correctly
          if (await file.exists() && await file.length() > 0) {
            setState(() {
              _downloadUrl = file.path;
              _isLoading = false;
            });
            break;
          }
        } else if (response['downloadUrl'] != null) {
          // Handle download URL
          final downloadUrl = response['downloadUrl'] as String;
          print('Downloading file from URL: $downloadUrl');
          
          try {
            final downloadResponse = await Dio().get(
              downloadUrl,
              options: Options(
                responseType: ResponseType.bytes,
                headers: {
                  'Accept': 'application/pdf',
                },
              ),
            );
            
            if (downloadResponse.statusCode == 200 && downloadResponse.data is List<int>) {
              final bytes = downloadResponse.data as List<int>;
              final directory = await getApplicationDocumentsDirectory();
              final file = File('${directory.path}/report.pdf');
              
              await file.writeAsBytes(bytes, flush: true);
              
              if (await file.exists() && await file.length() > 0) {
                setState(() {
                  _downloadUrl = file.path;
                  _isLoading = false;
                });
                break;
              }
            }
          } catch (e) {
            print('Error downloading file from URL: $e');
          }
        }

        await Future.delayed(const Duration(seconds: 5));
        attempts++;
      }

      if (attempts >= 10) {
        setState(() {
          _errorMessage = 'Failed to generate report after multiple attempts';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final lavenderColor = Color(0xFFE6E6FA);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: lavenderColor,
        title: Text(widget.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _companyCodeController,
                decoration: const InputDecoration(
                  labelText: 'COMPANY CODE',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a company code';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              CheckboxListTile(
                title: const Text('GROUP'),
                value: _isGroup,
                onChanged: (bool? value) {
                  setState(() {
                    _isGroup = value ?? false;
                  });
                },
                controlAffinity: ListTileControlAffinity.leading,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedCountry,
                decoration: const InputDecoration(
                  labelText: 'COUNTRY',
                  border: OutlineInputBorder(),
                ),
                items: _countries.map((String country) {
                  return DropdownMenuItem<String>(
                    value: country,
                    child: Text(country),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  if (newValue != null) {
                    setState(() {
                      _selectedCountry = newValue;
                    });
                  }
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedCurrency,
                decoration: const InputDecoration(
                  labelText: 'REQUESTED LIMIT CURRENCY',
                  border: OutlineInputBorder(),
                ),
                items: _currencies.map((String currency) {
                  return DropdownMenuItem<String>(
                    value: currency,
                    child: Text(currency),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  if (newValue != null) {
                    setState(() {
                      _selectedCurrency = newValue;
                    });
                  }
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _requestedLimitController,
                decoration: const InputDecoration(
                  labelText: 'REQUESTED LIMIT AMOUNT',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter an amount';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedLanguage,
                decoration: const InputDecoration(
                  labelText: 'LANGUAGE',
                  border: OutlineInputBorder(),
                ),
                items: _languages.map((String language) {
                  return DropdownMenuItem<String>(
                    value: language,
                    child: Text(language),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  if (newValue != null) {
                    setState(() {
                      _selectedLanguage = newValue;
                    });
                  }
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedReportCurrency,
                decoration: const InputDecoration(
                  labelText: 'LIMIT DECISION CURRENCY',
                  border: OutlineInputBorder(),
                ),
                items: _reportCurrencies.map((String currency) {
                  return DropdownMenuItem<String>(
                    value: currency,
                    child: Text(currency),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  if (newValue != null) {
                    setState(() {
                      _selectedReportCurrency = newValue;
                    });
                  }
                },
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : _generateReport,
                style: ElevatedButton.styleFrom(
                  backgroundColor: lavenderColor,
                  minimumSize: const Size(double.infinity, 48),
                ),
                child: _isLoading
                    ? const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(),
                          ),
                          SizedBox(width: 10),
                          Text('Processing...'),
                        ],
                      )
                    : const Text('Generate Report'),
              ),
              if (_downloadUrl != null)
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: ElevatedButton(
                    onPressed: () async {
                      if (_downloadUrl != null) {
                        final result = await OpenFile.open(_downloadUrl!);
                        if (result.type != ResultType.done) {
                          setState(() {
                            _errorMessage = 'Failed to open file: ${result.message}';
                          });
                        }
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: lavenderColor,
                      minimumSize: const Size(double.infinity, 48),
                    ),
                    child: const Text('Open Report'),
                  ),
                ),
              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
} 