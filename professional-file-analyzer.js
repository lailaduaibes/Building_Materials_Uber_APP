#!/usr/bin/env node
/**
 * Professional File-by-File Usage Analyzer
 * 
 * This tool examines each file individually and provides detailed analysis
 * of where and how it's used throughout the codebase.
 * 
 * Features:
 * - Individual file analysis with detailed usage reports
 * - Import/export tracing
 * - Component usage detection
 * - Safe deletion recommendations with justification
 * - Interactive review process
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class ProfessionalFileAnalyzer {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.allFiles = [];
    this.analysisResults = new Map();
    this.coreDriverFiles = new Set([
      'ProfessionalDriverDashboard.tsx',
      'ProfessionalDriverPaymentDashboard.tsx',
      'DriverLoginScreen.tsx',
      'DriverRegistrationScreen.tsx',
      'DriverService.ts',
      'AuthServiceSupabase.ts',
      'App.tsx',
      'package.json',
      'app.json',
      'index.js',
      'metro.config.js',
      'babel.config.js'
    ]);
  }

  // Initialize the analysis
  async init() {
    console.log('🔍 Professional File Usage Analyzer');
    console.log('=====================================\n');
    
    this.scanAllFiles();
    console.log(`📁 Found ${this.allFiles.length} files to analyze\n`);
    
    await this.analyzeEachFile();
    this.generateReport();
  }

  // Scan all files in the project
  scanAllFiles(dir = this.rootDir, level = 0) {
    if (level > 10) return; // Prevent infinite recursion
    
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(this.rootDir, fullPath);
        
        // Skip node_modules and hidden directories
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            this.scanAllFiles(fullPath, level + 1);
          } else {
            this.allFiles.push({
              path: fullPath,
              relativePath: relativePath,
              name: item,
              extension: path.extname(item),
              size: stat.size
            });
          }
        } catch (error) {
          console.warn(`⚠️  Could not read ${fullPath}: ${error.message}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read directory ${dir}: ${error.message}`);
    }
  }

  // Analyze each file individually
  async analyzeEachFile() {
    console.log('🔍 Analyzing each file individually...\n');
    
    for (let i = 0; i < this.allFiles.length; i++) {
      const file = this.allFiles[i];
      const progress = `(${i + 1}/${this.allFiles.length})`;
      
      console.log(`${progress} Analyzing: ${file.relativePath}`);
      
      const analysis = await this.analyzeIndividualFile(file);
      this.analysisResults.set(file.relativePath, analysis);
    }
  }

  // Detailed analysis of individual file
  async analyzeIndividualFile(file) {
    const analysis = {
      file: file,
      isCore: this.coreDriverFiles.has(file.name),
      isSafePattern: this.matchesSafePattern(file.name),
      imports: [],
      exports: [],
      usedBy: [],
      componentUsage: [],
      content: '',
      recommendation: 'UNKNOWN',
      confidence: 0,
      reasons: []
    };

    try {
      // Read file content for code files
      if (this.isCodeFile(file.extension)) {
        analysis.content = fs.readFileSync(file.path, 'utf8');
        
        // Analyze imports and exports
        analysis.imports = this.extractImports(analysis.content);
        analysis.exports = this.extractExports(analysis.content);
        
        // Find where this file is used
        analysis.usedBy = await this.findUsageInCodebase(file);
        analysis.componentUsage = await this.findComponentUsage(file);
      }

      // Determine recommendation
      this.determineRecommendation(analysis);
      
    } catch (error) {
      analysis.reasons.push(`Error reading file: ${error.message}`);
      analysis.recommendation = 'ERROR';
    }

    return analysis;
  }

  // Check if file matches safe deletion patterns
  matchesSafePattern(fileName) {
    const safePatterns = [
      /.*-old\./,
      /.*-backup\./,
      /.*-test\./,
      /.*\.sql$/,
      /.*\.md$/,
      /debug-.*/,
      /analyze-.*/,
      /check-.*/,
      /fix-.*/,
      /test-.*/,
      /.*_BACKUP.*/,
      /.*_OLD.*/,
      /.*\.bak$/,
      /.*\.tmp$/,
      /.*SUMMARY.*/,
      /.*ANALYSIS.*/,
      /.*GUIDE.*/,
      /.*FIXES.*/
    ];

    return safePatterns.some(pattern => pattern.test(fileName));
  }

  // Check if file is a code file
  isCodeFile(extension) {
    const codeExtensions = ['.tsx', '.ts', '.js', '.jsx', '.json'];
    return codeExtensions.includes(extension);
  }

  // Extract import statements
  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+.*?from\s+['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  // Extract export statements
  extractExports(content) {
    const exports = [];
    
    // Named exports
    const namedExportRegex = /export\s+(?:const|function|class|interface|type)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    // Default exports
    if (content.includes('export default')) {
      exports.push('default');
    }

    return exports;
  }

  // Find where this file is used in the codebase
  async findUsageInCodebase(targetFile) {
    const usedBy = [];
    const fileName = path.parse(targetFile.name).name;
    const relativePath = targetFile.relativePath.replace(/\\/g, '/');

    for (const file of this.allFiles) {
      if (file.path === targetFile.path) continue;
      if (!this.isCodeFile(file.extension)) continue;

      try {
        const content = fs.readFileSync(file.path, 'utf8');
        
        // Check for imports of this file
        const importPatterns = [
          new RegExp(`from\\s+['"\`][^'"\`]*${fileName}[^'"\`]*['"\`]`, 'g'),
          new RegExp(`require\\s*\\(\\s*['"\`][^'"\`]*${fileName}[^'"\`]*['"\`]\\s*\\)`, 'g'),
          new RegExp(`import\\s+.*['"\`][^'"\`]*${relativePath.replace(/\.[^.]+$/, '')}[^'"\`]*['"\`]`, 'g')
        ];

        for (const pattern of importPatterns) {
          if (pattern.test(content)) {
            usedBy.push({
              file: file.relativePath,
              type: 'import'
            });
            break;
          }
        }

      } catch (error) {
        // Skip files that can't be read
      }
    }

    return usedBy;
  }

  // Find component usage (for React components)
  async findComponentUsage(targetFile) {
    const usage = [];
    const fileName = path.parse(targetFile.name).name;

    // Only check for component usage if it's a React file
    if (!targetFile.name.includes('.tsx') && !targetFile.name.includes('.jsx')) {
      return usage;
    }

    for (const file of this.allFiles) {
      if (file.path === targetFile.path) continue;
      if (!this.isCodeFile(file.extension)) continue;

      try {
        const content = fs.readFileSync(file.path, 'utf8');
        
        // Look for component usage as JSX tags
        const componentPattern = new RegExp(`<${fileName}[\\s/>]`, 'g');
        if (componentPattern.test(content)) {
          usage.push({
            file: file.relativePath,
            type: 'component'
          });
        }

      } catch (error) {
        // Skip files that can't be read
      }
    }

    return usage;
  }

  // Determine deletion recommendation
  determineRecommendation(analysis) {
    analysis.confidence = 0;
    analysis.reasons = [];

    // Core files should never be deleted
    if (analysis.isCore) {
      analysis.recommendation = 'KEEP';
      analysis.confidence = 100;
      analysis.reasons.push('Core driver app file');
      return;
    }

    // Files matching safe patterns are likely deletable
    if (analysis.isSafePattern) {
      analysis.recommendation = 'SAFE_DELETE';
      analysis.confidence = 90;
      analysis.reasons.push('Matches safe deletion pattern');
    }

    // Files that are used by other files should be kept
    if (analysis.usedBy.length > 0 || analysis.componentUsage.length > 0) {
      analysis.recommendation = 'KEEP';
      analysis.confidence = 95;
      analysis.reasons.push(`Used by ${analysis.usedBy.length + analysis.componentUsage.length} files`);
      return;
    }

    // Files with exports might be used externally
    if (analysis.exports.length > 0 && !analysis.isSafePattern) {
      analysis.recommendation = 'REVIEW';
      analysis.confidence = 60;
      analysis.reasons.push('Has exports but no detected usage');
      return;
    }

    // Standalone files with no usage
    if (analysis.usedBy.length === 0 && analysis.componentUsage.length === 0) {
      if (analysis.isSafePattern) {
        analysis.recommendation = 'SAFE_DELETE';
        analysis.confidence = 85;
        analysis.reasons.push('No usage detected and matches safe pattern');
      } else {
        analysis.recommendation = 'REVIEW';
        analysis.confidence = 70;
        analysis.reasons.push('No usage detected but uncertain pattern');
      }
    }

    // Default to review for uncertainty
    if (analysis.recommendation === 'UNKNOWN') {
      analysis.recommendation = 'REVIEW';
      analysis.confidence = 50;
      analysis.reasons.push('Requires manual review');
    }
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n🏆 PROFESSIONAL FILE ANALYSIS REPORT');
    console.log('=====================================\n');

    const categories = {
      'SAFE_DELETE': [],
      'KEEP': [],
      'REVIEW': [],
      'ERROR': []
    };

    // Categorize files
    for (const [filePath, analysis] of this.analysisResults) {
      categories[analysis.recommendation].push(analysis);
    }

    // Print summary
    console.log('📊 SUMMARY:');
    console.log(`   Safe to Delete: ${categories.SAFE_DELETE.length} files`);
    console.log(`   Keep: ${categories.KEEP.length} files`);
    console.log(`   Requires Review: ${categories.REVIEW.length} files`);
    console.log(`   Errors: ${categories.ERROR.length} files\n`);

    // Print detailed results for each category
    this.printCategory('🗑️  SAFE TO DELETE', categories.SAFE_DELETE);
    this.printCategory('✅ KEEP (Used Files)', categories.KEEP);
    this.printCategory('⚠️  REQUIRES MANUAL REVIEW', categories.REVIEW);
    
    if (categories.ERROR.length > 0) {
      this.printCategory('❌ ERRORS', categories.ERROR);
    }

    // Generate deletion script
    this.generateDeletionScript(categories.SAFE_DELETE);
  }

  // Print category details
  printCategory(title, files) {
    if (files.length === 0) return;

    console.log(`\n${title} (${files.length} files):`);
    console.log('='.repeat(50));

    files.sort((a, b) => b.confidence - a.confidence);

    for (const analysis of files) {
      console.log(`\n📄 ${analysis.file.relativePath}`);
      console.log(`   Confidence: ${analysis.confidence}%`);
      console.log(`   Reasons: ${analysis.reasons.join(', ')}`);
      
      if (analysis.usedBy.length > 0) {
        console.log(`   Used by: ${analysis.usedBy.map(u => u.file).join(', ')}`);
      }
      
      if (analysis.componentUsage.length > 0) {
        console.log(`   Component used in: ${analysis.componentUsage.map(u => u.file).join(', ')}`);
      }
      
      if (analysis.exports.length > 0) {
        console.log(`   Exports: ${analysis.exports.join(', ')}`);
      }
    }
  }

  // Generate safe deletion script
  generateDeletionScript(safeFiles) {
    const scriptPath = path.join(this.rootDir, 'safe-delete-files.ps1');
    
    let script = `# Auto-generated safe file deletion script
# Generated on ${new Date().toISOString()}
# Total files to delete: ${safeFiles.length}

Write-Host "🗑️  Safe File Deletion Script" -ForegroundColor Green
Write-Host "Files identified as safe to delete with high confidence" -ForegroundColor Yellow
Write-Host ""

$filesToDelete = @(
`;

    safeFiles
      .filter(f => f.confidence >= 85)
      .forEach(analysis => {
        script += `    "${analysis.file.relativePath.replace(/\\/g, '/')}"  # ${analysis.reasons[0]}\n`;
      });

    script += `)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Write-Host "Deleting: $file" -ForegroundColor Red
        Remove-Item $file -Force
    } else {
        Write-Host "File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Safe deletion completed!" -ForegroundColor Green
Write-Host "Deleted $($filesToDelete.Count) files" -ForegroundColor Green
`;

    fs.writeFileSync(scriptPath, script);
    console.log(`\n🎯 Generated deletion script: safe-delete-files.ps1`);
    console.log(`   This script will delete ${safeFiles.filter(f => f.confidence >= 85).length} files with 85%+ confidence`);
  }
}

// Main execution
async function main() {
  const analyzer = new ProfessionalFileAnalyzer(process.cwd());
  await analyzer.init();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProfessionalFileAnalyzer;
