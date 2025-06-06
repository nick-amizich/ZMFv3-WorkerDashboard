import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '24h';
    const component = searchParams.get('component');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    
    // Build query
    let query = supabase.from('bugs').select('*');
    
    // Apply filters
    if (component) query = query.eq('component', component);
    if (severity) query = query.eq('severity', severity);
    if (status) query = query.eq('status', status);
    
    // Apply time range filter for recent bugs
    if (timeRange !== 'all') {
      const dateFilter = {
        '1h': new Date(Date.now() - 60 * 60 * 1000),
        '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      }[timeRange] || new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      query = query.gte('created_at', dateFilter.toISOString());
    }
    
    const { data: bugs, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Get bug summary by component
    const { data: bugSummary, error: summaryError } = await supabase
      .from('bug_summary')
      .select('*');

    if (summaryError) throw summaryError;

    return NextResponse.json({
      bugs,
      summary: bugSummary,
      stats: {
        total: bugs?.length || 0,
        critical: bugs?.filter(b => b.severity === 'critical').length || 0,
        high: bugs?.filter(b => b.severity === 'high').length || 0,
        medium: bugs?.filter(b => b.severity === 'medium').length || 0,
        low: bugs?.filter(b => b.severity === 'low').length || 0,
        open: bugs?.filter(b => b.status === 'open').length || 0,
        inProgress: bugs?.filter(b => b.status === 'in_progress').length || 0,
        resolved: bugs?.filter(b => b.status === 'resolved').length || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching bugs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bugs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Create new bug report
    const { data: bug, error } = await supabase
      .from('bugs')
      .insert({
        title: body.title,
        description: body.description,
        component: body.component,
        severity: body.severity || 'medium',
        status: 'open',
        reported_by: user?.id,
        error_message: body.errorMessage,
        error_stack: body.errorStack,
        user_agent: body.userAgent,
        url: body.url
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ bug });
  } catch (error) {
    console.error('Error creating bug:', error);
    return NextResponse.json(
      { error: 'Failed to create bug report' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Bug ID is required' },
        { status: 400 }
      );
    }

    // Update bug
    const { data: bug, error } = await supabase
      .from('bugs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        resolved_at: updates.status === 'resolved' ? new Date().toISOString() : null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ bug });
  } catch (error) {
    console.error('Error updating bug:', error);
    return NextResponse.json(
      { error: 'Failed to update bug' },
      { status: 500 }
    );
  }
}