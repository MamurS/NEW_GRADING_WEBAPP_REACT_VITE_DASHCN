import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Credit Ratings Mobile',
      home: Scaffold(
        appBar: AppBar(title: const Text('Credit Ratings Mobile')),
        body: const Center(child: Text('Hello, world!')),
      ),
    );
  }
} 