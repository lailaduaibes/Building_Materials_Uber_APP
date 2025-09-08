#!/usr/bin/env node
// File Usage Analyzer for Driver App Cleanup
// This script analyzes which files are actually used in the codebase

const fs = require('fs');
const path = require('path');

// Core driver app files that should NEVER be deleted
const CORE_DRIVER_FILES = [
  'ProfessionalDriverDashboard.tsx',
  'ProfessionalDriverPaymentDashboard.tsx',
  'DriverLoginScreen.tsx',
  'DriverRegistrationScreen.tsx',
  'DriverService.ts',
  'AuthServiceSupabase.ts',
  'App.tsx',
  'package.json',
  'app.json'
];

// File extensions to analyze for imports
const CODE_EXTENSIONS = ['.tsx', '.ts', '.js', '.jsx'];

// Patterns that are likely safe to delete
const SAFE_DELETE_PATTERNS = [
  /.*-old\./,
  /.*-backup\./,
  /.*-test\./,
  /.*\.sql$/,
  /.*\.md$/,
  /debug-.*/,
  /analyze-.*/,
  /check-.*/,
  /fix-.*/,
  /test-.*/
];

class FileUsageAnalyzer {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.allFiles = [];
    this.importMap = new Map();
    this.usedFiles = new Set();
    this.coreFiles = new Set(CORE_DRIVER_FILES);
  }

  // Scan all files in the project
  scanAllFiles(dir = this.rootDir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        this.scanAllFiles(fullPath);
      } else if (stat.isFile()) {
        const relativePath = path.relative(this.rootDir, fullPath);
        this.allFiles.push(relativePath);
      }
    }
  }

  // Analyze imports in code files
  analyzeImports() {
    const codeFiles = this.allFiles.filter(file => 
      CODE_EXTENSIONS.some(ext => file.endsWith(ext))
    );

    for (const file of codeFiles) {
      try {
        const content = fs.readFileSync(path.join(this.rootDir, file), 'utf8');
        const imports = this.extractImports(content);
        this.importMap.set(file, imports);
      } catch (error) {
        console.log(`Warning: Could not read ${file}`);
      }
    }
  }

  // Extract import statements from file content
  extractImports(content) {
    const imports = [];
    
    // Match various import patterns
    const importPatterns = [
      /import.*from\s+['"`]([^'"`]+)['"`]/g,
      /require\(['"`]([^'"`]+)['"`]\)/g,
      /import\(['"`]([^'"`]+)['"`]\)/g
    ];

    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }

    return imports;
  }

  // Trace which files are actually used starting from core files
  traceUsedFiles() {
    // Start with core files
    for (const coreFile of this.coreFiles) {
      const fullPath = this.allFiles.find(f => f.includes(coreFile));
      if (fullPath) {
        this.markAsUsed(fullPath);
      }
    }

    // Also mark package.json, app.json etc as used
    this.allFiles.forEach(file => {
      if (file.includes('package.json') || file.includes('app.json') || file.includes('expo')) {
        this.markAsUsed(file);
      }
    });

    // Iteratively mark imported files as used
    let changed = true;
    while (changed) {
      changed = false;
      for (const [file, imports] of this.importMap) {
        if (this.usedFiles.has(file)) {
          for (const importPath of imports) {
            const resolvedFile = this.resolveImport(importPath, file);
            if (resolvedFile && !this.usedFiles.has(resolvedFile)) {
              this.markAsUsed(resolvedFile);
              changed = true;
            }
          }
        }
      }
    }
  }

  // Mark a file as used
  markAsUsed(file) {
    this.usedFiles.add(file);
  }

  // Resolve import path to actual file
  resolveImport(importPath, fromFile) {
    // Skip external packages
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }

    const fromDir = path.dirname(fromFile);
    let resolved = path.normalize(path.join(fromDir, importPath));

    // Try different extensions
    const candidates = [
      resolved,
      resolved + '.ts',
      resolved + '.tsx',
      resolved + '.js',
      resolved + '.jsx',
      path.join(resolved, 'index.ts'),
      path.join(resolved, 'index.tsx'),
      path.join(resolved, 'index.js')
    ];

    for (const candidate of candidates) {
      if (this.allFiles.some(f => f === candidate || f === candidate.replace(/\\/g, '/'))) {
        return this.allFiles.find(f => f === candidate || f === candidate.replace(/\\/g, '/'));
      }
    }

    return null;
  }

  // Generate cleanup report
  generateReport() {
    const unused = this.allFiles.filter(file => !this.usedFiles.has(file));
    const potentiallySafe = unused.filter(file => 
      SAFE_DELETE_PATTERNS.some(pattern => pattern.test(file))
    );
    const needsReview = unused.filter(file => 
      !SAFE_DELETE_PATTERNS.some(pattern => pattern.test(file))
    );

    return {
      total: this.allFiles.length,
      used: this.usedFiles.size,
      unused: unused.length,
      potentiallySafe,
      needsReview,
      coreFiles: Array.from(this.coreFiles)
    };
  }

  // Run full analysis
  analyze() {
    console.log('🔍 Scanning files...');
    this.scanAllFiles();
    
    console.log('📝 Analyzing imports...');
    this.analyzeImports();
    
    console.log('🔗 Tracing dependencies...');
    this.traceUsedFiles();
    
    return this.generateReport();
  }
}

// Run the analysis
const analyzer = new FileUsageAnalyzer('.');
const report = analyzer.analyze();

console.log('\n📊 FILE USAGE ANALYSIS REPORT');
console.log('================================');
console.log(`Total files: ${report.total}`);
console.log(`Used files: ${report.used}`);
console.log(`Unused files: ${report.unused}`);

console.log('\n✅ LIKELY SAFE TO DELETE:');
console.log('(SQL, MD, debug files, etc.)');
report.potentiallySafe.forEach(file => console.log(`  - ${file}`));

console.log('\n⚠️  NEEDS MANUAL REVIEW:');
console.log('(Check these carefully before deleting)');
report.needsReview.slice(0, 20).forEach(file => console.log(`  - ${file}`));
if (report.needsReview.length > 20) {
  console.log(`  ... and ${report.needsReview.length - 20} more`);
}

console.log('\n🔒 CORE FILES (NEVER DELETE):');
report.coreFiles.forEach(file => console.log(`  - ${file}`));

// Save detailed report to file
fs.writeFileSync('cleanup-report.json', JSON.stringify(report, null, 2));
console.log('\n📄 Detailed report saved to: cleanup-report.json');
