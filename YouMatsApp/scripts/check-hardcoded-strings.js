#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to detect hardcoded strings in React Native screens
 * that should be using translation keys
 */

class HardcodedStringDetector {
  constructor() {
    this.hardcodedStrings = [];
    this.suspiciousPatterns = [
      // Text component content
      /<Text[^>]*>([^<{]*[A-Za-z]{3,}[^<{]*)<\/Text>/g,
      
      // Alert.alert calls with hardcoded strings
      /Alert\.alert\s*\(\s*['"`]([^'"`]+)['"`]/g,
      
      // TextInput placeholder without t()
      /placeholder\s*=\s*['"`]([^'"`{]+)['"`]/g,
      
      // Button titles without t()
      /title\s*=\s*['"`]([^'"`{]+)['"`]/g,
      
      // Direct string literals in JSX (not in t() calls)
      />\s*['"`]([A-Z][^'"`]*[a-z][^'"`]*)['"`]\s*</g,
      
      // String props that might need translation
      /(?:label|title|placeholder|message|text)\s*=\s*['"`]([A-Z][^'"`]*[a-z][^'"`]*)['"`]/g,
    ];
  }

  /**
   * Scan a file for hardcoded strings
   */
  scanFile(filePath) {
    const fileName = path.basename(filePath);
    console.log(`\n🔍 Scanning: ${fileName}`);
    console.log('=' .repeat(50));

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const results = this.detectHardcodedStrings(content, fileName);
      
      if (results.length === 0) {
        console.log('✅ No hardcoded strings found!');
      } else {
        console.log(`❌ Found ${results.length} potential hardcoded strings:\n`);
        results.forEach((result, index) => {
          console.log(`${index + 1}. Line ${result.line}: "${result.text}"`);
          console.log(`   Context: ${result.context}`);
          console.log(`   Suggested key: ${result.suggestedKey}`);
          console.log('');
        });
      }
      
      return results;
    } catch (error) {
      console.error(`❌ Error reading file: ${error.message}`);
      return [];
    }
  }

  /**
   * Detect hardcoded strings in content
   */
  detectHardcodedStrings(content, fileName) {
    const lines = content.split('\n');
    const results = [];

    lines.forEach((line, lineIndex) => {
      const lineNumber = lineIndex + 1;
      
      // Skip lines that already use translation functions
      if (line.includes('t(') || line.includes('i18nT(')) {
        return;
      }
      
      // Skip comments and imports
      if (line.trim().startsWith('//') || 
          line.trim().startsWith('/*') || 
          line.trim().startsWith('*') ||
          line.includes('import ') ||
          line.includes('from ')) {
        return;
      }

      this.suspiciousPatterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        
        while ((match = regex.exec(line)) !== null) {
          const text = match[1];
          
          // Skip if it's likely not user-facing text
          if (this.shouldSkipText(text)) {
            continue;
          }

          results.push({
            line: lineNumber,
            text: text,
            context: line.trim(),
            suggestedKey: this.generateSuggestedKey(text),
            pattern: pattern.source
          });
        }
      });
    });

    return results;
  }

  /**
   * Check if text should be skipped (likely not user-facing)
   */
  shouldSkipText(text) {
    const skipPatterns = [
      /^[a-z]+$/, // All lowercase (likely props)
      /^\d+$/, // Only numbers
      /^[A-Z_]+$/, // All caps (likely constants)
      /^(true|false|null|undefined)$/, // Boolean/null values
      /^(flex|row|column|center|stretch|baseline)$/, // Style values
      /^(ios|android|web|default)$/, // Platform values
      /^(small|medium|large|xl|xs)$/, // Size values
      /^#[0-9a-fA-F]+$/, // Color codes
      /^\w+\.\w+$/, // Object properties
      /^[a-z][a-zA-Z]*Icon$/, // Icon names
      /^(onPress|onSubmit|onFocus|onBlur)$/, // Event handlers
      /^(width|height|margin|padding)/, // Style properties
      /^(horizontal|vertical)$/, // Orientation values
      /^(TextInput|TouchableOpacity|ScrollView)$/, // Component names
    ];

    return skipPatterns.some(pattern => pattern.test(text)) || text.length < 3;
  }

  /**
   * Generate a suggested translation key
   */
  generateSuggestedKey(text) {
    // Convert to camelCase and remove special characters
    const cleaned = text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map((word, index) => {
        if (index === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('');

    // Suggest a category based on content
    let category = 'general';
    if (text.toLowerCase().includes('error') || text.toLowerCase().includes('fail')) {
      category = 'errors';
    } else if (text.toLowerCase().includes('success') || text.toLowerCase().includes('complete')) {
      category = 'success';
    } else if (text.toLowerCase().includes('login') || text.toLowerCase().includes('password') || text.toLowerCase().includes('email')) {
      category = 'auth';
    } else if (text.toLowerCase().includes('button') || text.toLowerCase().includes('submit') || text.toLowerCase().includes('continue')) {
      category = 'actions';
    }

    return `${category}.${cleaned}`;
  }

  /**
   * Scan multiple files
   */
  scanFiles(filePaths) {
    console.log('🚀 Starting hardcoded string detection...\n');
    
    const allResults = [];
    
    filePaths.forEach(filePath => {
      const results = this.scanFile(filePath);
      allResults.push({ file: filePath, results });
    });

    // Summary
    console.log('\n📊 SUMMARY');
    console.log('=' .repeat(50));
    
    const totalIssues = allResults.reduce((sum, file) => sum + file.results.length, 0);
    
    if (totalIssues === 0) {
      console.log('🎉 All files are clean! No hardcoded strings found.');
    } else {
      console.log(`⚠️  Total potential issues found: ${totalIssues}\n`);
      
      allResults.forEach(file => {
        if (file.results.length > 0) {
          console.log(`📁 ${path.basename(file.file)}: ${file.results.length} issues`);
        }
      });
      
      console.log('\n💡 Recommendations:');
      console.log('1. Replace hardcoded strings with t("key") calls');
      console.log('2. Add the English text to src/i18n/locales/en.json');
      console.log('3. Add translations to other language files');
      console.log('4. Test the app in different languages');
    }

    return allResults;
  }
}

// Main execution
if (require.main === module) {
  const detector = new HardcodedStringDetector();
  
  // Check if file path is provided as argument
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Default: scan AuthScreensSupabase
    const authFile = path.join(__dirname, '..', 'AuthScreensSupabase.tsx');
    detector.scanFiles([authFile]);
  } else {
    // Scan provided files
    const filePaths = args.map(arg => path.resolve(arg));
    detector.scanFiles(filePaths);
  }
}

module.exports = HardcodedStringDetector;
