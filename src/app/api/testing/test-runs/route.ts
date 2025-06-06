import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '24h';
    
    // Calculate the date filter based on time range
    const dateFilter = {
      '1h': new Date(Date.now() - 60 * 60 * 1000),
      '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
      '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    }[timeRange] || new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get test runs
    const { data: testRuns, error: testRunsError } = await supabase
      .from('test_runs')
      .select('*')
      .gte('created_at', dateFilter.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (testRunsError) throw testRunsError;

    // Get latest test run details
    const latestRun = testRuns?.[0];
    let testResults = null;
    
    if (latestRun) {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_run_id', latestRun.id);
      
      if (!error) testResults = data;
    }

    // Calculate test coverage
    const { data: coverage } = await supabase
      .from('test_coverage')
      .select('*')
      .eq('test_run_id', latestRun?.id || '');

    return NextResponse.json({
      testRuns,
      latestRun,
      testResults,
      coverage,
      summary: {
        totalRuns: testRuns?.length || 0,
        averagePassRate: testRuns?.reduce((acc, run) => {
          const total = run.total_tests || 1;
          const passed = run.passed_tests || 0;
          return acc + (passed / total);
        }, 0) / (testRuns?.length || 1) * 100,
      }
    });
  } catch (error) {
    console.error('Error fetching test runs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test runs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Create new test run
    const { data: testRun, error: testRunError } = await supabase
      .from('test_runs')
      .insert({
        branch: body.branch || 'main',
        commit_sha: body.commitSha,
        total_tests: body.totalTests || 0,
        passed_tests: body.passedTests || 0,
        failed_tests: body.failedTests || 0,
        skipped_tests: body.skippedTests || 0,
        coverage_percentage: body.coveragePercentage,
        status: body.status || 'running'
      })
      .select()
      .single();

    if (testRunError) throw testRunError;

    // Insert individual test results if provided
    if (body.testResults && body.testResults.length > 0) {
      const testResultsData = body.testResults.map((result: any) => ({
        test_run_id: testRun.id,
        test_name: result.testName,
        test_path: result.testPath,
        suite_name: result.suiteName,
        status: result.status,
        duration_ms: result.duration,
        error_message: result.errorMessage,
        error_stack: result.errorStack
      }));

      const { error: resultsError } = await supabase
        .from('test_results')
        .insert(testResultsData);

      if (resultsError) throw resultsError;
    }

    // Insert coverage data if provided
    if (body.coverage && body.coverage.length > 0) {
      const coverageData = body.coverage.map((cov: any) => ({
        test_run_id: testRun.id,
        file_path: cov.filePath,
        statements_total: cov.statements?.total || 0,
        statements_covered: cov.statements?.covered || 0,
        branches_total: cov.branches?.total || 0,
        branches_covered: cov.branches?.covered || 0,
        functions_total: cov.functions?.total || 0,
        functions_covered: cov.functions?.covered || 0,
        lines_total: cov.lines?.total || 0,
        lines_covered: cov.lines?.covered || 0
      }));

      const { error: coverageError } = await supabase
        .from('test_coverage')
        .insert(coverageData);

      if (coverageError) throw coverageError;
    }

    return NextResponse.json({ testRun });
  } catch (error) {
    console.error('Error creating test run:', error);
    return NextResponse.json(
      { error: 'Failed to create test run' },
      { status: 500 }
    );
  }
}