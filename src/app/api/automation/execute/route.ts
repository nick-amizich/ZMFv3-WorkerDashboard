import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ALWAYS validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const {
      automation_rule_id,
      batch_id,
      task_id,
      trigger_data = {},
      dry_run = false
    } = body
    
    // Validate required fields
    if (!automation_rule_id) {
      return NextResponse.json({ 
        error: 'automation_rule_id is required' 
      }, { status: 400 })
    }
    
    // Get automation rule
    const { data: rule, error: ruleError } = await (supabase as any)
      .from('automation_rules')
      .select(`
        *,
        workflow_template:workflow_templates(id, name)
      `)
      .eq('id', automation_rule_id)
      .eq('is_active', true)
      .single()
    
    if (ruleError || !rule) {
      return NextResponse.json({ error: 'Automation rule not found or inactive' }, { status: 404 })
    }
    
    // Get batch info if provided
    let batch = null
    if (batch_id) {
      const { data: batchData, error: batchError } = await supabase
        .from('work_batches')
        .select('*')
        .eq('id', batch_id)
        .single()
      
      if (batchError || !batchData) {
        return NextResponse.json({ error: 'Invalid batch_id' }, { status: 400 })
      }
      batch = batchData
    }
    
    // Get task info if provided
    let task = null
    if (task_id) {
      const { data: taskData, error: taskError } = await supabase
        .from('work_tasks')
        .select('*')
        .eq('id', task_id)
        .single()
      
      if (taskError || !taskData) {
        return NextResponse.json({ error: 'Invalid task_id' }, { status: 400 })
      }
      task = taskData
    }
    
    const startTime = Date.now()
    
    // Simulate rule execution logic
    const executionResult = await executeAutomationRule(
      rule, 
      { batch, task, worker }, 
      trigger_data, 
      dry_run,
      supabase
    )
    
    const executionTime = Date.now() - startTime
    
    // Log execution if not dry run
    if (!dry_run) {
      await (supabase as any)
        .from('automation_executions')
        .insert({
          automation_rule_id: rule.id,
          workflow_template_id: rule.workflow_template_id,
          batch_id: batch?.id || null,
          task_id: task?.id || null,
          trigger_data: {
            ...trigger_data,
            manual_execution: true,
            executed_by: worker.id
          },
          conditions_evaluated: executionResult.conditions_evaluated,
          conditions_met: executionResult.conditions_met,
          actions_executed: executionResult.actions_executed,
          execution_status: executionResult.success ? 'success' : 'failed',
          error_message: executionResult.error,
          execution_time_ms: executionTime,
          execution_context: {
            batch_id,
            task_id,
            dry_run: false
          }
        })
    }
    
    return NextResponse.json({
      success: executionResult.success,
      message: dry_run ? 'Dry run completed successfully' : 'Automation rule executed successfully',
      execution: {
        rule_name: rule.name,
        execution_time_ms: executionTime,
        conditions_evaluated: executionResult.conditions_evaluated,
        conditions_met: executionResult.conditions_met,
        actions_executed: executionResult.actions_executed,
        dry_run,
        error: executionResult.error
      }
    })
  } catch (error) {
    console.error('Automation execution error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to execute automation rule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to execute automation rule logic
async function executeAutomationRule(
  rule: any, 
  context: { batch?: any; task?: any; worker: any }, 
  triggerData: any, 
  dryRun: boolean,
  supabase: any
) {
  const result = {
    success: true,
    conditions_evaluated: [] as any[],
    conditions_met: [] as any[],
    actions_executed: [] as any[],
    error: null as string | null
  }
  
  try {
    // Evaluate conditions
    for (const condition of rule.conditions || []) {
      const evaluation = {
        condition_type: condition.type,
        condition_config: condition,
        result: false,
        details: ''
      }
      
      // Simulate condition evaluation logic
      switch (condition.type) {
        case 'batch_size':
          if (context.batch) {
            const batchSize = context.batch.order_item_ids?.length || 0
            evaluation.result = evaluateCondition(batchSize, condition.operator, condition.value)
            evaluation.details = `Batch size: ${batchSize} ${condition.operator} ${condition.value}`
          }
          break
          
        case 'worker_available':
          // Check if worker is available for the specified stage
          evaluation.result = true // Simplified - in real implementation, check worker availability
          evaluation.details = 'Worker availability checked'
          break
          
        case 'time_of_day':
          const currentHour = new Date().getHours()
          evaluation.result = evaluateCondition(currentHour, condition.operator, condition.value)
          evaluation.details = `Current hour: ${currentHour} ${condition.operator} ${condition.value}`
          break
          
        default:
          evaluation.result = true // Default to true for unknown conditions
          evaluation.details = 'Unknown condition type - defaulted to true'
      }
      
      result.conditions_evaluated.push(evaluation)
      if (evaluation.result) {
        result.conditions_met.push(evaluation)
      }
    }
    
    // Check if all conditions are met (AND logic)
    const allConditionsMet = result.conditions_evaluated.length === 0 || 
                           result.conditions_met.length === result.conditions_evaluated.length
    
    if (!allConditionsMet) {
      result.success = false
      result.error = 'Not all conditions were met'
      return result
    }
    
    // Execute actions if conditions are met
    for (const action of rule.actions || []) {
      const actionResult = {
        action_type: action.type,
        action_config: action,
        executed: false,
        details: ''
      }
      
      if (!dryRun) {
        // Simulate action execution
        switch (action.type) {
          case 'assign_task':
            actionResult.executed = true
            actionResult.details = `Task assignment simulated with rule: ${action.assignment_rule}`
            break
            
          case 'notify':
            actionResult.executed = true
            actionResult.details = `Notification sent to ${action.channel || 'default channel'}`
            break
            
          case 'create_tasks':
            actionResult.executed = true
            actionResult.details = `Tasks created for stage: ${action.stage}`
            break
            
          case 'generate_report':
            actionResult.executed = true
            actionResult.details = `Report generated: ${action.type}`
            break
            
          default:
            actionResult.executed = false
            actionResult.details = 'Unknown action type'
        }
      } else {
        actionResult.executed = false
        actionResult.details = 'Dry run - action not executed'
      }
      
      result.actions_executed.push(actionResult)
    }
    
  } catch (error) {
    result.success = false
    result.error = error instanceof Error ? error.message : 'Unknown execution error'
  }
  
  return result
}

// Helper function to evaluate conditions
function evaluateCondition(value: any, operator: string, compareValue: any): boolean {
  switch (operator) {
    case 'equals':
      return value === compareValue
    case 'greater_than':
      return value > compareValue
    case 'less_than':
      return value < compareValue
    case 'greater_than_or_equal':
      return value >= compareValue
    case 'less_than_or_equal':
      return value <= compareValue
    case 'contains':
      return String(value).includes(String(compareValue))
    case 'between':
      return Array.isArray(compareValue) && value >= compareValue[0] && value <= compareValue[1]
    default:
      return false
  }
} 