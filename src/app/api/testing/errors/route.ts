import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '24h';
    const component = searchParams.get('component');
    const severity = searchParams.get('severity');
    
    // Calculate the date filter based on time range
    const dateFilter = {
      '1h': new Date(Date.now() - 60 * 60 * 1000),
      '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
      '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    }[timeRange] || new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Build query
    let query = supabase
      .from('error_logs')
      .select('*')
      .gte('created_at', dateFilter.toISOString());
    
    // Apply filters
    if (component) query = query.eq('component', component);
    if (severity) query = query.eq('severity', severity);
    
    const { data: errors, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Get error summary by component
    const { data: errorSummary, error: summaryError } = await supabase
      .from('error_summary')
      .select('*');

    if (summaryError) throw summaryError;

    // Calculate error trends
    const trends = errorSummary?.map(summary => {
      const current = summary.errors_last_hour || 0;
      const previous = summary.errors_last_24h ? (summary.errors_last_24h - current) / 23 : 0;
      
      return {
        component: summary.component,
        errors: current,
        trend: current > previous * 1.2 ? 'up' : current < previous * 0.8 ? 'down' : 'stable'
      };
    });

    return NextResponse.json({
      errors,
      summary: errorSummary,
      trends,
      stats: {
        total: errors?.length || 0,
        fatal: errors?.filter(e => e.severity === 'fatal').length || 0,
        error: errors?.filter(e => e.severity === 'error').length || 0,
        warning: errors?.filter(e => e.severity === 'warning').length || 0,
        info: errors?.filter(e => e.severity === 'info').length || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching errors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
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
    
    // Log the error
    const { data: errorLog, error } = await supabase
      .from('error_logs')
      .insert({
        error_type: body.errorType || 'Error',
        error_message: body.errorMessage,
        error_stack: body.errorStack,
        component: body.component,
        user_id: user?.id || body.userId,
        session_id: body.sessionId,
        url: body.url,
        user_agent: body.userAgent,
        ip_address: body.ipAddress,
        severity: body.severity || 'error',
        environment: body.environment || process.env.NODE_ENV || 'production',
        additional_data: body.additionalData
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-create bug report for critical errors
    if (body.severity === 'fatal' || body.severity === 'critical') {
      await supabase
        .from('bugs')
        .insert({
          title: `Auto-reported: ${body.errorMessage}`,
          description: `Automatically reported ${body.severity} error`,
          component: body.component || 'Unknown',
          severity: 'critical',
          status: 'open',
          reported_by: user?.id,
          error_message: body.errorMessage,
          error_stack: body.errorStack,
          user_agent: body.userAgent,
          url: body.url
        });
    }

    return NextResponse.json({ errorLog });
  } catch (error) {
    console.error('Error logging error:', error);
    return NextResponse.json(
      { error: 'Failed to log error' },
      { status: 500 }
    );
  }
}