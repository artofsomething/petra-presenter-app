// lib/utils/helpers.dart
import 'package:flutter/material.dart';

class ColorHelper {
  static Color fromHex(String? hexColor) {
    if (hexColor == null || hexColor.isEmpty) return Colors.transparent;
    try {
      String hex = hexColor.replaceFirst('#', '');
      if (hex.length == 6) hex = 'FF$hex';
      return Color(int.parse(hex, radix: 16));
    } catch (e) {
      return Colors.transparent;
    }
  }

  static String toHex(Color color) {
    return '#${color.value.toRadixString(16).substring(2).toUpperCase()}';
  }
}