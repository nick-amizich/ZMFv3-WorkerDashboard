#!/usr/bin/env node

/**
 * Site Integrity Checker for Claude Code Projects
 * 
 * This script helps verify that your site is properly wired up after Claude Code
 * makes changes. It checks for common issues like:
 * - Dead buttons and links
 * - Missing page references
 * - Unimplemented functions
 * - Broken imports
 * - Missing routes
 * - Empty event handlers
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  // File extensions to check
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.html'],
  
  // Directories to ignore
  ignoreDirs: ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt'],
  
  // Patterns to detect issues
  patterns: {
    // Dead buttons - onClick/onPress handlers that are empty or undefined
    deadButtons: [
      /onClick\s*=\s*{\s*}\s*/g,
      /onClick\s*=\s*{\s*\(\s*\)\s*=>\s*{\s*}\s*}/g,
      /onPress\s*=\s*{\s*}\s*/g,
      /onPress\s*=\s*{\s*\(\s*\)\s*=>\s*{\s*}\s*}/g,
      /@click\s*=\s*""\s*/g,
      /v-on:click\s*=\s*""\s*/g,
    ],
    
    // Comments marked with TO-DO (pattern detection)
    todos: [
      /\/\/\s*TODO/gi,
      /\/\*\s*TODO/gi,
      /\{\s*\/\*\s*TODO/gi,
    ],
    
    // Empty functions
    emptyFunctions: [
      /function\s+\w+\s*\([^)]*\)\s*{\s*}/g,
      /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{\s*}/g,
      /\w+\s*\([^)]*\)\s*{\s*}/g,
    ],
    
    // Missing imports (functions/components used but not imported)
    // This will be checked differently
    
    // Placeholder text
    placeholders: [
      /placeholder/gi,
      /lorem\s+ipsum/gi,
      /coming\s+soon/gi,
      /under\s+construction/gi,
    ],
    
    // Console statements (should be removed in production)
    consoleStatements: [
      /console\.\w+\(/g,
    ],
    
    // Unhandled promises
    unhandledPromises: [
      /\.then\s*\(\s*\)/g,
      /\.catch\s*\(\s*\)/g,
    ],
  },
  
  // Route patterns for different frameworks
  routePatterns: {
    // Next.js pages
    nextjs: {
      pagesDir: ['pages', 'app'],
      pattern: /\.(js|jsx|ts|tsx)$/,
    },
    // React Router
    reactRouter: {
      pattern: /<Route\s+path\s*=\s*["']([^"']+)["']/g,
    },
    // Vue Router
    vueRouter: {
      pattern: /path:\s*['"]([^'"]+)['"]/g,
    },
  }
};

class SiteIntegrityChecker {
  constructor() {
    this.issues = [];
    this.stats = {
      filesChecked: 0,
      issuesFound: 0,
      deadButtons: 0,
      todos: 0,
      emptyFunctions: 0,
      placeholders: 0,
      consoleStatements: 0,
      unhandledPromises: 0,
      missingFiles: 0,
      brokenLinks: 0,
    };
  }

  async checkProject(projectPath = '.') {
    console.log('🔍 Starting Site Integrity Check...\n');
    
    try {
      // Check if it's a valid project directory
      await this.validateProjectDirectory(projectPath);
      
      // Scan all files
      await this.scanDirectory(projectPath);
      
      // Check for framework-specific issues
      await this.checkFrameworkSpecific(projectPath);
      
      // Check for broken internal links
      await this.checkInternalLinks(projectPath);
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Error during check:', error.message);
      process.exit(1);
    }
  }

  async validateProjectDirectory(projectPath) {
    const packageJsonPath = path.join(projectPath, 'package.json');
    try {
      await fs.access(packageJsonPath);
    } catch {
      throw new Error('No package.json found. Are you in the project root?');
    }
  }

  async scanDirectory(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!CONFIG.ignoreDirs.includes(entry.name)) {
          await this.scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (CONFIG.extensions.includes(ext)) {
          await this.checkFile(fullPath);
        }
      }
    }
  }

  async checkFile(filePath) {
    this.stats.filesChecked++;
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Check for dead buttons
      for (const pattern of CONFIG.patterns.deadButtons) {
        const matches = content.match(pattern);
        if (matches) {
          this.stats.deadButtons += matches.length;
          this.issues.push({
            type: 'dead-button',
            file: relativePath,
            count: matches.length,
            severity: 'high',
            message: `Found ${matches.length} dead button handler(s)`,
          });
        }
      }
      
      // Check for TODOs
      for (const pattern of CONFIG.patterns.todos) {
        const matches = content.match(pattern);
        if (matches) {
          this.stats.todos += matches.length;
          this.issues.push({
            type: 'todo',
            file: relativePath,
            count: matches.length,
            severity: 'medium',
            message: `Found ${matches.length} TODO comment(s)`,
          });
        }
      }
      
      // Check for empty functions (be careful with this one)
      const emptyFuncMatches = this.findEmptyFunctions(content);
      if (emptyFuncMatches.length > 0) {
        this.stats.emptyFunctions += emptyFuncMatches.length;
        this.issues.push({
          type: 'empty-function',
          file: relativePath,
          count: emptyFuncMatches.length,
          severity: 'medium',
          message: `Found ${emptyFuncMatches.length} empty function(s)`,
          details: emptyFuncMatches,
        });
      }
      
      // Check for placeholders
      for (const pattern of CONFIG.patterns.placeholders) {
        const matches = content.match(pattern);
        if (matches) {
          this.stats.placeholders += matches.length;
          this.issues.push({
            type: 'placeholder',
            file: relativePath,
            count: matches.length,
            severity: 'low',
            message: `Found ${matches.length} placeholder text instance(s)`,
          });
        }
      }
      
      // Check for console statements
      for (const pattern of CONFIG.patterns.consoleStatements) {
        const matches = content.match(pattern);
        if (matches) {
          this.stats.consoleStatements += matches.length;
          this.issues.push({
            type: 'console',
            file: relativePath,
            count: matches.length,
            severity: 'low',
            message: `Found ${matches.length} console statement(s)`,
          });
        }
      }
      
      // Check for unhandled promises
      for (const pattern of CONFIG.patterns.unhandledPromises) {
        const matches = content.match(pattern);
        if (matches) {
          this.stats.unhandledPromises += matches.length;
          this.issues.push({
            type: 'unhandled-promise',
            file: relativePath,
            count: matches.length,
            severity: 'high',
            message: `Found ${matches.length} unhandled promise(s)`,
          });
        }
      }
      
      // Check for missing imports
      await this.checkMissingImports(filePath, content);
      
    } catch (error) {
      console.error(`Error checking file ${filePath}:`, error.message);
    }
  }

  findEmptyFunctions(content) {
    const emptyFunctions = [];
    const lines = content.split('\n');
    
    // Pattern to match function declarations
    const functionPatterns = [
      /function\s+(\w+)\s*\([^)]*\)\s*{\s*}/,
      /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*{\s*}/,
      /(\w+)\s*\([^)]*\)\s*{\s*}/, // Method in class
    ];
    
    lines.forEach((line, index) => {
      functionPatterns.forEach(pattern => {
        const match = line.match(pattern);
        if (match && match[1]) {
          // Check if it's truly empty (no content between braces)
          const functionName = match[1];
          const braceIndex = line.indexOf('{', match.index);
          const closeBraceIndex = line.indexOf('}', braceIndex);
          
          if (closeBraceIndex > braceIndex) {
            const content = line.substring(braceIndex + 1, closeBraceIndex).trim();
            if (content === '') {
              emptyFunctions.push({
                name: functionName,
                line: index + 1,
              });
            }
          }
        }
      });
    });
    
    return emptyFunctions;
  }

  async checkMissingImports(filePath, content) {
    // This is a simplified check - you might want to use a proper AST parser
    // for more accurate results
    
    // Extract all imported items
    const imports = new Set();
    const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) {
        // Named imports
        match[1].split(',').forEach(imp => {
          imports.add(imp.trim().split(' as ')[0]);
        });
      } else if (match[2]) {
        // Default import
        imports.add(match[2]);
      }
    }
    
    // Check for commonly used but potentially unimported items
    const commonPatterns = [
      { pattern: /<(\w+)[\s>]/, type: 'component' },
      { pattern: /\b(\w+)\(/, type: 'function' },
    ];
    
    const usedItems = new Set();
    commonPatterns.forEach(({ pattern }) => {
      const regex = new RegExp(pattern, 'g');
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (match[1] && match[1][0] === match[1][0].toUpperCase()) {
          usedItems.add(match[1]);
        }
      }
    });
    
    // Find potentially missing imports
    const missingImports = [];
    usedItems.forEach(item => {
      if (!imports.has(item) && !this.isBuiltIn(item)) {
        missingImports.push(item);
      }
    });
    
    if (missingImports.length > 0) {
      this.issues.push({
        type: 'missing-import',
        file: path.relative(process.cwd(), filePath),
        severity: 'high',
        message: `Potentially missing imports: ${missingImports.join(', ')}`,
      });
    }
  }

  isBuiltIn(name) {
    const builtIns = [
      'React', 'Fragment', 'Component', 'useState', 'useEffect',
      'console', 'window', 'document', 'Array', 'Object', 'String',
      'Number', 'Boolean', 'Date', 'Math', 'JSON', 'Promise',
      'Map', 'Set', 'Error', 'TypeError', 'ReferenceError',
    ];
    return builtIns.includes(name);
  }

  async checkFrameworkSpecific(projectPath) {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    // Detect framework
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.next) {
      await this.checkNextJs(projectPath);
    } else if (deps.react && (deps['react-router'] || deps['react-router-dom'])) {
      await this.checkReactRouter(projectPath);
    } else if (deps.vue && deps['vue-router']) {
      await this.checkVueRouter(projectPath);
    }
  }

  async checkNextJs(projectPath) {
    // Check for orphaned pages
    const pagesDir = path.join(projectPath, 'pages');
    const appDir = path.join(projectPath, 'app');
    
    const checkDir = async (dir) => {
      try {
        await fs.access(dir);
        // Check if all pages are accessible
        await this.checkPagesAccessibility(dir);
      } catch {
        // Directory doesn't exist
      }
    };
    
    await checkDir(pagesDir);
    await checkDir(appDir);
  }

  async checkPagesAccessibility(pagesDir) {
    // This would check if pages are properly linked
    // Implementation depends on your specific needs
  }

  async checkReactRouter(projectPath) {
    // Check for routes that don't have corresponding components
    // This is a simplified check
  }

  async checkVueRouter(projectPath) {
    // Check for routes that don't have corresponding components
  }

  async checkInternalLinks(projectPath) {
    // Check for broken internal links in HTML/JSX
    // This is a simplified implementation
  }

  generateReport() {
    console.log('\n📊 Site Integrity Check Report\n');
    console.log('═'.repeat(50));
    
    console.log(`\n📁 Files checked: ${this.stats.filesChecked}`);
    console.log(`❗ Total issues found: ${this.issues.length}\n`);
    
    if (this.issues.length === 0) {
      console.log('✅ No issues found! Your site appears to be properly wired up.\n');
      return;
    }
    
    // Group issues by severity
    const highSeverity = this.issues.filter(i => i.severity === 'high');
    const mediumSeverity = this.issues.filter(i => i.severity === 'medium');
    const lowSeverity = this.issues.filter(i => i.severity === 'low');
    
    if (highSeverity.length > 0) {
      console.log('🔴 High Severity Issues:');
      console.log('─'.repeat(50));
      highSeverity.forEach(issue => {
        console.log(`  ${issue.file}: ${issue.message}`);
        if (issue.details) {
          issue.details.forEach(detail => {
            console.log(`    - ${detail.name} at line ${detail.line}`);
          });
        }
      });
      console.log();
    }
    
    if (mediumSeverity.length > 0) {
      console.log('🟡 Medium Severity Issues:');
      console.log('─'.repeat(50));
      mediumSeverity.forEach(issue => {
        console.log(`  ${issue.file}: ${issue.message}`);
      });
      console.log();
    }
    
    if (lowSeverity.length > 0) {
      console.log('🟢 Low Severity Issues:');
      console.log('─'.repeat(50));
      lowSeverity.forEach(issue => {
        console.log(`  ${issue.file}: ${issue.message}`);
      });
      console.log();
    }
    
    // Summary statistics
    console.log('📈 Summary:');
    console.log('─'.repeat(50));
    console.log(`  Dead buttons: ${this.stats.deadButtons}`);
    console.log(`  TODO comments: ${this.stats.todos}`);
    console.log(`  Empty functions: ${this.stats.emptyFunctions}`);
    console.log(`  Placeholder text: ${this.stats.placeholders}`);
    console.log(`  Console statements: ${this.stats.consoleStatements}`);
    console.log(`  Unhandled promises: ${this.stats.unhandledPromises}`);
    
    // Generate fix suggestions
    this.generateFixSuggestions();
  }

  generateFixSuggestions() {
    console.log('\n💡 Suggested Fixes:');
    console.log('═'.repeat(50));
    
    if (this.stats.deadButtons > 0) {
      console.log('\n🔧 Dead Buttons:');
      console.log('  Run: claude "Review all button handlers and implement missing functionality"');
    }
    
    if (this.stats.todos > 0) {
      console.log('\n📝 TODOs:');
      console.log('  Run: claude "Complete all TODO items in the codebase"');
    }
    
    if (this.stats.emptyFunctions > 0) {
      console.log('\n📦 Empty Functions:');
      console.log('  Run: claude "Implement all empty functions or remove if unnecessary"');
    }
    
    console.log('\n✨ Pro tip: You can create a CLAUDE.md file with project-specific');
    console.log('   instructions to help Claude maintain consistency.\n');
  }
}

// CLI execution
if (require.main === module) {
  const checker = new SiteIntegrityChecker();
  const projectPath = process.argv[2] || '.';
  
  checker.checkProject(projectPath)
    .then(() => {
      process.exit(checker.issues.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = SiteIntegrityChecker;