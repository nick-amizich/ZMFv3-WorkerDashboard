'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Bug, 
  Zap, 
  Shield, 
  Activity,
  TrendingUp,
  Clock,
  FileWarning,
  Database,
  Server,
  Play,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TestingDashboardPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  const [bugData, setBugData] = useState<any>(null);
  const [errorData, setErrorData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [testRunning, setTestRunning] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [testRes, bugRes, errorRes, perfRes] = await Promise.all([
        fetch(`/api/testing/test-runs?timeRange=${selectedTimeRange}`),
        fetch(`/api/testing/bugs?timeRange=${selectedTimeRange}`),
        fetch(`/api/testing/errors?timeRange=${selectedTimeRange}`),
        fetch(`/api/testing/performance?timeRange=${selectedTimeRange}`)
      ]);

      const [tests, bugs, errors, performance] = await Promise.all([
        testRes.json(),
        bugRes.json(),
        errorRes.json(),
        perfRes.json()
      ]);

      setTestData(tests);
      setBugData(bugs);
      setErrorData(errors);
      setPerformanceData(performance);
      
      // Debug logging
      console.log('Test data fetched:', {
        testRuns: tests?.testRuns?.length || 0,
        latestRun: tests?.latestRun,
        testResults: tests?.testResults?.length || 0
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runTests = async () => {
    setTestRunning(true);
    setTestStatus('Starting test run...');
    
    try {
      const response = await fetch('/api/testing/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverage: true })
      });
      
      if (response.ok) {
        setTestStatus('Tests are running in the background...');
        
        // Poll for completion
        const checkInterval = setInterval(async () => {
          const statusRes = await fetch('/api/testing/run-tests');
          const statusData = await statusRes.json();
          
          if (statusData.status !== 'running') {
            clearInterval(checkInterval);
            setTestRunning(false);
            setTestStatus('Test run completed!');
            
            // Refresh dashboard data
            setTimeout(async () => {
              await fetchDashboardData();
              setTestStatus('Dashboard refreshed with latest results');
              setTimeout(() => setTestStatus(null), 3000);
            }, 2000); // Give the test reporter time to save results
          }
        }, 2000);
        
        // Stop checking after 5 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          setTestRunning(false);
          setTestStatus('Test run timed out');
        }, 300000);
      }
    } catch (error) {
      console.error('Failed to start test run:', error);
      setTestRunning(false);
      setTestStatus('Failed to start test run');
    }
  };

  // Calculate real metrics from data
  const testCoverage = testData?.coverage?.[0] ? {
    overall: Math.round((testData.coverage[0].statements_covered / testData.coverage[0].statements_total) * 100) || 0,
    statements: Math.round((testData.coverage[0].statements_covered / testData.coverage[0].statements_total) * 100) || 0,
    branches: Math.round((testData.coverage[0].branches_covered / testData.coverage[0].branches_total) * 100) || 0,
    functions: Math.round((testData.coverage[0].functions_covered / testData.coverage[0].functions_total) * 100) || 0,
    lines: Math.round((testData.coverage[0].lines_covered / testData.coverage[0].lines_total) * 100) || 0
  } : { overall: 0, statements: 0, branches: 0, functions: 0, lines: 0 };

  const recentBugs = bugData?.bugs?.slice(0, 3).map((bug: any) => ({
    id: bug.id,
    severity: bug.severity,
    component: bug.component,
    message: bug.title,
    time: new Date(bug.created_at).toLocaleString()
  })) || [];

  const testResults = testData?.latestRun ? {
    passed: testData.latestRun.passed_tests || 0,
    failed: testData.latestRun.failed_tests || 0,
    skipped: testData.latestRun.skipped_tests || 0,
    total: testData.latestRun.total_tests || 0
  } : { passed: 0, failed: 0, skipped: 0, total: 0 };

  const errorHotspots = errorData?.trends || [];

  // Calculate system health based on actual metrics
  const calculateSystemHealth = () => {
    const factors = {
      testsPassing: testData?.summary?.averagePassRate >= 90,
      lowErrorRate: performanceData?.stats?.errorRate < 5,
      noCriticalBugs: (bugData?.stats?.critical || 0) === 0,
      goodPerformance: performanceData?.stats?.avgResponseTime < 500,
      recentTestRun: testData?.testRuns?.length > 0 && 
        new Date(testData.testRuns[0].created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
    };
    
    const healthScore = Object.values(factors).filter(Boolean).length;
    
    if (healthScore >= 4) return { status: 'Healthy', color: 'text-green-500', message: 'All systems operational' };
    if (healthScore >= 3) return { status: 'Good', color: 'text-blue-500', message: 'Minor issues detected' };
    if (healthScore >= 2) return { status: 'Warning', color: 'text-yellow-500', message: 'Multiple issues need attention' };
    return { status: 'Critical', color: 'text-red-500', message: 'Immediate attention required' };
  };
  
  const systemHealth = calculateSystemHealth();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Testing & Bug Tracking Dashboard</h1>
        <select 
          value={selectedTimeRange}
          onChange={(e) => setSelectedTimeRange(e.target.value)}
          className="px-4 py-2 border border-border rounded-md bg-background text-foreground"
        >
          <option value="1h">Last Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {/* Health Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${systemHealth.color}`}>{systemHealth.status}</div>
            <p className="text-xs text-muted-foreground">{systemHealth.message}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bugs</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bugData?.stats?.open || 0}</div>
            <p className="text-xs text-muted-foreground">
              {bugData?.stats?.critical || 0} critical, {bugData?.stats?.high || 0} high
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {testData?.summary?.averagePassRate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {testData?.summary?.totalRuns || 0} runs in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData?.stats?.errorRate?.toFixed(2) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {errorData?.stats?.total || 0} errors tracked
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="coverage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="coverage">Test Coverage</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="bugs">Bug Tracking</TabsTrigger>
          <TabsTrigger value="errors">Error Monitoring</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Code Coverage Overview</CardTitle>
              <CardDescription>Percentage of code covered by tests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Overall Coverage</span>
                  <span className="text-sm font-bold">{testCoverage.overall}%</span>
                </div>
                <Progress value={testCoverage.overall} className="h-3" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Statements</span>
                    <span className="text-sm font-medium">{testCoverage.statements}%</span>
                  </div>
                  <Progress value={testCoverage.statements} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Branches</span>
                    <span className="text-sm font-medium">{testCoverage.branches}%</span>
                  </div>
                  <Progress value={testCoverage.branches} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Functions</span>
                    <span className="text-sm font-medium">{testCoverage.functions}%</span>
                  </div>
                  <Progress value={testCoverage.functions} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Lines</span>
                    <span className="text-sm font-medium">{testCoverage.lines}%</span>
                  </div>
                  <Progress value={testCoverage.lines} className="h-2" />
                </div>
              </div>

              {testCoverage.overall < 80 && (
                <Alert className="mt-4">
                  <FileWarning className="h-4 w-4" />
                  <AlertTitle>Coverage Below Target</AlertTitle>
                  <AlertDescription>
                    Current coverage is {testCoverage.overall}%. Target is 80% for production readiness.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Latest Test Run Results</CardTitle>
                  <CardDescription>
                    {testData?.latestRun ? `Last run: ${new Date(testData.latestRun.created_at).toLocaleString()}` : 'No test runs yet'}
                  </CardDescription>
                </div>
                <Button 
                  onClick={runTests} 
                  disabled={testRunning}
                  className="flex items-center gap-2"
                >
                  {testRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running Tests...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Tests
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {testStatus && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{testStatus}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-around items-center py-4">
                <div className="text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500 dark:text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{testResults.passed}</div>
                  <p className="text-sm text-muted-foreground">Passed</p>
                </div>
                <div className="text-center">
                  <XCircle className="h-8 w-8 text-red-500 dark:text-red-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{testResults.failed}</div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-yellow-500 dark:text-yellow-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{testResults.skipped}</div>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </div>
              </div>

              {testData?.testResults && testData.testResults.length > 0 ? (
                <div className="space-y-2 mt-4">
                  {testData.testResults
                    .filter((result: any) => result.status === 'failed')
                    .slice(0, 5)
                    .map((test: any, index: number) => (
                      <div key={test.id || index} className="p-3 bg-red-500/10 dark:bg-red-500/20 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-red-700 dark:text-red-400">
                            Failed: {test.test_name || 'Unknown Test'}
                          </span>
                          <Badge variant="destructive">
                            {test.duration_ms > 5000 ? 'Slow' : 'Failed'}
                          </Badge>
                        </div>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {test.error_message || 'Test failed without error message'}
                        </p>
                        {test.test_path && (
                          <p className="text-xs text-red-500 dark:text-red-300 mt-1 opacity-75">
                            {test.test_path}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              ) : testResults.failed > 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p>No detailed failure information available.</p>
                  <p className="text-sm mt-1">Run tests again to see detailed results.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bugs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bug Tracking Heat Map</CardTitle>
              <CardDescription>Active bugs by component and severity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {['Authentication', 'Task Management', 'QC Submissions', 'Analytics', 'Orders', 'Workers', 'Reports', 'Settings'].map((component) => {
                  const componentBugs = bugData?.summary?.find((s: any) => s.component === component) || { total_bugs: 0, open_bugs: 0 };
                  const bugCount = componentBugs.open_bugs || 0;
                  const severity = bugCount > 5 ? 'bg-red-500 dark:bg-red-600' : bugCount > 2 ? 'bg-yellow-500 dark:bg-yellow-600' : bugCount > 0 ? 'bg-blue-500 dark:bg-blue-600' : 'bg-green-500 dark:bg-green-600';
                  return (
                    <div key={component} className={`p-4 rounded-md text-white text-center ${severity}`}>
                      <div className="font-medium text-sm">{component}</div>
                      <div className="text-2xl font-bold">{bugCount}</div>
                      <div className="text-xs">open bugs</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 space-y-3">
                <h3 className="font-medium">Recent Bug Reports</h3>
                {recentBugs.map((bug) => (
                  <div key={bug.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <Badge variant={bug.severity === 'critical' ? 'destructive' : bug.severity === 'warning' ? 'secondary' : 'outline'}>
                        {bug.severity}
                      </Badge>
                      <div>
                        <p className="font-medium">{bug.component}</p>
                        <p className="text-sm text-muted-foreground">{bug.message}</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{bug.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Error Monitoring</CardTitle>
              <CardDescription>Live error tracking across all components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {errorHotspots.map((hotspot) => (
                  <div key={hotspot.component} className="flex items-center justify-between p-4 border rounded-md">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-red-500/10 dark:bg-red-500/20 rounded-md">
                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium">{hotspot.component}</p>
                        <p className="text-sm text-muted-foreground">{hotspot.errors} errors in {selectedTimeRange}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hotspot.trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500 dark:text-red-400" />}
                      {hotspot.trend === 'down' && <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400 rotate-180" />}
                      {hotspot.trend === 'stable' && <div className="h-4 w-4 bg-muted rounded-full" />}
                      <span className="text-sm font-medium">
                        {hotspot.trend === 'up' ? 'Increasing' : hotspot.trend === 'down' ? 'Decreasing' : 'Stable'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {errorData?.trends?.some((t: any) => t.trend === 'up') && (
                <Alert className="mt-4" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Trend Alert</AlertTitle>
                  <AlertDescription>
                    {errorData.trends.filter((t: any) => t.trend === 'up').length} component(s) showing increased error rates
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Monitoring</CardTitle>
              <CardDescription>API response times and database query performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    API Endpoints
                  </h3>
                  <div className="space-y-2">
                    {performanceData?.summary?.filter((p: any) => p.metric_type === 'api')
                      .slice(0, 5)
                      .map((perf: any) => (
                        <div key={perf.endpoint} className="flex justify-between items-center">
                          <span className="text-sm truncate">{perf.endpoint}</span>
                          <Badge 
                            variant={
                              perf.avg_duration_ms < 200 ? "outline" : 
                              perf.avg_duration_ms < 500 ? "secondary" : 
                              "destructive"
                            }
                          >
                            {perf.avg_duration_ms}ms avg
                          </Badge>
                        </div>
                      )) || (
                      <p className="text-sm text-muted-foreground">No API metrics yet</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Database Queries
                  </h3>
                  <div className="space-y-2">
                    {performanceData?.summary?.filter((p: any) => p.metric_type === 'database')
                      .slice(0, 5)
                      .map((perf: any) => (
                        <div key={perf.endpoint} className="flex justify-between items-center">
                          <span className="text-sm truncate">{perf.endpoint}</span>
                          <Badge 
                            variant={
                              perf.avg_duration_ms < 100 ? "outline" : 
                              perf.avg_duration_ms < 300 ? "secondary" : 
                              "destructive"
                            }
                          >
                            {perf.avg_duration_ms > 1000 
                              ? `${(perf.avg_duration_ms / 1000).toFixed(1)}s avg`
                              : `${perf.avg_duration_ms}ms avg`
                            }
                          </Badge>
                        </div>
                      )) || (
                      <p className="text-sm text-muted-foreground">No database metrics yet</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}