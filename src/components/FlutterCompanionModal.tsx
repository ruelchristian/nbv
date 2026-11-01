import React, { useState } from 'react';
import { X, Copy, Check, Code, FileText, Download } from 'lucide-react';

interface FlutterCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlutterCompanionModal: React.FC<FlutterCompanionModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pubspec' | 'main' | 'options' | 'service'>('pubspec');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const codeSnippets = {
    pubspec: `name: nails_by_vril
description: "A Web-Based Online Appointment and Client Management System for Nails By Vril"
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.3.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^3.1.0
  cloud_firestore: ^5.0.1
  firebase_auth: ^5.1.0
  provider: ^6.1.2
  google_fonts: ^6.2.1
  table_calendar: ^3.1.2
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true`,

    options: `// Generated FlutterFire options for endless-oath-1c70r
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    return web;
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBBzFqVYjAtwibL7dv1bBGJ-1T_Zys_BqI',
    appId: '1:627336521817:web:de15e145b1d102250c2948',
    messagingSenderId: '627336521817',
    projectId: 'endless-oath-1c70r',
    authDomain: 'endless-oath-1c70r.firebaseapp.com',
    storageBucket: 'endless-oath-1c70r.firebasestorage.app',
  );
}`,

    main: `import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const NailsByVrilFlutterApp());
}

class NailsByVrilFlutterApp extends StatelessWidget {
  const NailsByVrilFlutterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nails By Vril - Appointment System',
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFFFAF7F4),
        primaryColor: const Color(0xFF8B3A56),
      ),
      home: const Scaffold(
        body: Center(
          child: Text('Nails by Vril - Online Appointment System'),
        ),
      ),
    );
  }
}`,

    service: `// Atomic Booking Service preventing double bookings in Flutter Web
import 'package:cloud_firestore/cloud_firestore.dart';

class BookingService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<void> bookSlotAtomically({
    required String appointmentId,
    required String date,
    required String time,
    required Map<String, dynamic> appointmentData,
  }) async {
    final cleanTime = time.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '');
    final lockId = 'lock_\${date}_\$cleanTime';

    final lockRef = _firestore.collection('slot_locks').doc(lockId);
    final apptRef = _firestore.collection('appointments').doc(appointmentId);

    await _firestore.runTransaction((transaction) async {
      final lockSnap = await transaction.get(lockRef);
      if (lockSnap.exists && lockSnap.data()?['status'] == 'reserved') {
        throw Exception('This time slot has already been booked by another customer.');
      }

      transaction.set(lockRef, {
        'slotKey': lockId,
        'appointmentDate': date,
        'startTime': time,
        'appointmentId': appointmentId,
        'status': 'reserved',
        'updatedAt': DateTime.now().toIso8601String(),
      });

      transaction.set(apptRef, appointmentData);
    });
  }
}`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF7F4] rounded-2xl max-w-3xl w-full border border-[#F3B8C3] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EFE8E9] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <Code className="w-5 h-5 text-[#8B3A56]" />
            <div>
              <h3 className="font-serif font-bold text-lg text-[#231F20]">
                Flutter Web / Dart Companion Source
              </h3>
              <p className="text-xs text-[#7A6E74]">
                Exportable code files ready for your local VS Code workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7A6E74] hover:text-[#231F20] rounded-lg hover:bg-[#F5EFF1]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="px-6 pt-3 border-b border-[#EFE8E9] flex gap-2 bg-[#FDF6F7]">
          <button
            onClick={() => setActiveTab('pubspec')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pubspec'
                ? 'bg-white text-[#8B3A56] border-t border-x border-[#EFE8E9]'
                : 'text-[#7A6E74] hover:text-[#231F20]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>pubspec.yaml</span>
          </button>
          <button
            onClick={() => setActiveTab('options')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'options'
                ? 'bg-white text-[#8B3A56] border-t border-x border-[#EFE8E9]'
                : 'text-[#7A6E74] hover:text-[#231F20]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>firebase_options.dart</span>
          </button>
          <button
            onClick={() => setActiveTab('main')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'main'
                ? 'bg-white text-[#8B3A56] border-t border-x border-[#EFE8E9]'
                : 'text-[#7A6E74] hover:text-[#231F20]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>lib/main.dart</span>
          </button>
          <button
            onClick={() => setActiveTab('service')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'service'
                ? 'bg-white text-[#8B3A56] border-t border-x border-[#EFE8E9]'
                : 'text-[#7A6E74] hover:text-[#231F20]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>booking_service.dart</span>
          </button>
        </div>

        {/* Code Content */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs bg-[#1E1E1E] text-[#D4D4D4] rounded-b-xl relative">
          <button
            onClick={handleCopy}
            className="absolute top-4 right-4 px-3 py-1.5 rounded-md bg-[#2D2D2D] hover:bg-[#3D3D3D] text-[#E0E0E0] text-xs font-sans flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
          <pre className="whitespace-pre-wrap">{codeSnippets[activeTab]}</pre>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-white border-t border-[#EFE8E9] flex items-center justify-between text-xs text-[#7A6E74]">
          <span>
            Connected to Cloud Firestore Project: <strong>endless-oath-1c70r</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#8B3A56] hover:bg-[#722A42] text-white rounded-lg font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
