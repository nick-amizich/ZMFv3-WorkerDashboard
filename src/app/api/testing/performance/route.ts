import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '24h';
    const metricType = searchParams.get('type');
    
    // Calculate the date filter based on time range
    const dateFilter = {
      '1h': new Date(Date.now() - 60 * 60 * 1000),
      '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
      '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    }[timeRange] || new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get performance summary
    const { data: performanceSummary, error: summaryError } = await supabase
      .from('performance_summary')
      .select('*');

    if (summaryError) throw summaryError;

    // Get raw metrics for detailed analysis
    let metricsQuery = supabase
      .from('performance_metrics')
      .select('*')
      .gte('timestamp', dateFilter.toISOString());
    
    if (metricType) {
      metricsQuery = metricsQuery.eq('metric_type', metricType);
    }
    
    const { data: metrics, error: metricsError } = await metricsQuery
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (metricsError) throw metricsError;

    // Calculate performance stats
    const stats = {
      totalRequests: metrics?.length || 0,
      avgResponseTime: metrics?.reduce((acc, m) => acc + m.duration_ms, 0) / (metrics?.length || 1),
      slowRequests: metrics?.filter(m => m.duration_ms > 1000).length || 0,
      errorRate: metrics?.filter(m => m.status_code >= 400).length / (metrics?.length || 1) * 100,
    };

    return NextResponse.json({
      summary: performanceSummary,
      metrics,
      stats
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Get current user if available
    const { data: { user } } = await supabase.auth.getUser();
    
    // Log performance metric
    const { data: metric, error } = await supabase
      .from('performance_metrics')
      .insert({
        metric_type: body.metricType || 'api',
        endpoint: body.endpoint,
        method: body.method,
        duration_ms: body.duration,
        status_code: body.statusCode,
        user_id: user?.id || body.userId,
        session_id: body.sessionId
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ metric });
  } catch (error) {
    console.error('Error logging performance metric:', error);
    return NextResponse.json(
      { error: 'Failed to log performance metric' },
      { status: 500 }
    );
  }
}