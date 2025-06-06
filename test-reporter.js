// Custom Jest reporter to send test results to our API
class TestReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  async onRunComplete(contexts, results) {
    const { numFailedTests, numPassedTests, numTotalTests, testResults } = results;
    
    // Extract coverage data if available
    const coverage = results.coverageMap ? this.extractCoverage(results.coverageMap) : null;
    
    // Format test results
    const formattedResults = testResults.flatMap(suite => 
      suite.testResults.map(test => ({
        testName: test.title,
        testPath: test.ancestorTitles.join(' > '),
        suiteName: suite.testFilePath,
        status: test.status,
        duration: test.duration,
        errorMessage: test.failureMessages?.[0],
        errorStack: test.failureMessages?.join('\n'),
      }))
    );

    // Send results to our API with fallback port detection
    const testData = {
      branch: process.env.GIT_BRANCH || 'main',
      commitSha: process.env.GIT_COMMIT || 'local',
      totalTests: numTotalTests,
      passedTests: numPassedTests,
      failedTests: numFailedTests,
      skippedTests: numTotalTests - numPassedTests - numFailedTests,
      coveragePercentage: coverage?.overall || null,
      status: numFailedTests > 0 ? 'failed' : 'passed',
      testResults: formattedResults,
      coverage: coverage?.files || [],
    };

    // Try multiple ports in case the dev server is running on a different port
    const ports = [
      process.env.PORT,
      process.env.NEXT_PUBLIC_PORT,
      '3000',
      '3001',
      '3002'
    ].filter(Boolean);

    let sent = false;
    for (const port of ports) {
      if (sent) break;
      
      try {
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
        const response = await fetch(`${apiUrl}/api/testing/test-runs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testData),
          // Short timeout to quickly try next port
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok) {
          sent = true;
          console.log(`Test results sent successfully to port ${port}`);
        }
      } catch (error) {
        // Silently continue to next port
        continue;
      }
    }

    if (!sent) {
      console.error('Failed to send test results to any available port');
    }
  }

  extractCoverage(coverageMap) {
    const files = [];
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;

    for (const [filePath, fileCoverage] of Object.entries(coverageMap.data)) {
      const summary = fileCoverage.toSummary().data;
      
      files.push({
        filePath,
        statements: summary.statements,
        branches: summary.branches,
        functions: summary.functions,
        lines: summary.lines,
      });

      totalStatements += summary.statements.total;
      coveredStatements += summary.statements.covered;
      totalBranches += summary.branches.total;
      coveredBranches += summary.branches.covered;
      totalFunctions += summary.functions.total;
      coveredFunctions += summary.functions.covered;
      totalLines += summary.lines.total;
      coveredLines += summary.lines.covered;
    }

    const overall = totalStatements > 0 
      ? (coveredStatements / totalStatements) * 100 
      : 0;

    return { files, overall };
  }
}

module.exports = TestReporter;