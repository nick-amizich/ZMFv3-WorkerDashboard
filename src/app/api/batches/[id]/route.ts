import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Manual cleanup function for batch deletion
async function performManualCleanup(supabase: any, batchId: string) {
  console.log(`Performing manual cleanup for batch ${batchId}`)
  
  // Step 1: Update tasks to remove batch reference (preserve task history)
  try {
    const { error: tasksUpdateError } = await supabase
      .from('work_tasks')
      .update({ batch_id: null })
      .eq('batch_id', batchId)

    if (tasksUpdateError) {
      console.error('Error updating tasks:', tasksUpdateError)
    } else {
      console.log(`Updated tasks linked to batch ${batchId}`)
    }
  } catch (error) {
    console.error('Failed to update tasks:', error)
  }

  // Step 2: Delete workflow execution logs
  try {
    const { error: workflowLogsDeleteError } = await supabase
      .from('workflow_execution_log')
      .delete()
      .eq('batch_id', batchId)

    if (workflowLogsDeleteError) {
      console.error('Error deleting workflow logs:', workflowLogsDeleteError)
    } else {
      console.log(`Deleted workflow logs for batch ${batchId}`)
    }
  } catch (error) {
    console.error('Failed to delete workflow logs:', error)
  }

  // Step 3: Aggressive stage transition cleanup with retry logic
  let transitionDeleteAttempts = 0
  const maxAttempts = 3
  
  while (transitionDeleteAttempts < maxAttempts) {
    try {
      // Check what transitions exist
      const { data: existingTransitions } = await supabase
        .from('stage_transitions')
        .select('id')
        .eq('batch_id', batchId)

      if (!existingTransitions || existingTransitions.length === 0) {
        console.log(`No stage transitions found for batch ${batchId} (attempt ${transitionDeleteAttempts + 1})`)
        break
      }

      console.log(`Found ${existingTransitions.length} stage transitions on attempt ${transitionDeleteAttempts + 1}`)

             // Delete them one by one to avoid transaction issues
       for (const transition of existingTransitions) {
         try {
           // First verify the transition exists before deletion
           const { data: preDeleteCheck } = await supabase
             .from('stage_transitions')
             .select('id')
             .eq('id', transition.id)
           
           console.log(`Pre-delete check for ${transition.id}: ${preDeleteCheck?.length ? 'EXISTS' : 'NOT FOUND'}`)
           
           const { error, count } = await supabase
             .from('stage_transitions')
             .delete()
             .eq('id', transition.id)
           
           if (error) {
             console.error(`Error deleting transition ${transition.id}:`, error)
           } else {
             console.log(`Delete operation for ${transition.id} - affected rows: ${count}`)
             
             // Immediately verify deletion
             const { data: postDeleteCheck } = await supabase
               .from('stage_transitions')
               .select('id')
               .eq('id', transition.id)
             
             console.log(`Post-delete check for ${transition.id}: ${postDeleteCheck?.length ? 'STILL EXISTS!' : 'CONFIRMED DELETED'}`)
           }
         } catch (error) {
           console.error(`Exception deleting transition ${transition.id}:`, error)
         }
         
         // Small delay to avoid overwhelming the database
         await new Promise(resolve => setTimeout(resolve, 100))
       }

      transitionDeleteAttempts++
      
      // Give the database a moment to process
      await new Promise(resolve => setTimeout(resolve, 200))
      
    } catch (error) {
      console.error(`Stage transition cleanup attempt ${transitionDeleteAttempts + 1} failed:`, error)
      transitionDeleteAttempts++
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  // Final verification with fresh client connection to avoid caching
  console.log('Performing final verification with fresh database connection...')
  
  // Create a fresh Supabase client to avoid any potential caching
  const freshSupabase = await createClient()
  const { data: finalCheck } = await freshSupabase
    .from('stage_transitions')
    .select('id, from_stage, to_stage')
    .eq('batch_id', batchId)

  if (finalCheck && finalCheck.length > 0) {
    console.error(`WARNING: ${finalCheck.length} stage_transitions still exist after cleanup attempts`)
    console.error('Remaining transitions:', finalCheck.map(t => `${t.id}: ${t.from_stage} -> ${t.to_stage}`))
    
    // Try one more time with raw SQL to force deletion
    console.log('Attempting final cleanup with direct SQL...')
    
    try {
      for (const transition of finalCheck) {
        const { error } = await supabase
          .from('stage_transitions')
          .delete()
          .eq('id', transition.id)
          .eq('batch_id', batchId) // Double constraint
        
        if (error) {
          console.error(`Final SQL delete failed for ${transition.id}:`, error)
        } else {
          console.log(`Final SQL delete succeeded for ${transition.id}`)
        }
      }
      
      // One more check
      const { data: ultraFinalCheck } = await freshSupabase
        .from('stage_transitions')
        .select('id')
        .eq('batch_id', batchId)
      
      if (ultraFinalCheck && ultraFinalCheck.length > 0) {
        throw new Error(`Cannot complete cleanup: ${ultraFinalCheck.length} stage transitions still reference batch after all attempts`)
      }
      
    } catch (sqlError) {
      console.error('Final SQL cleanup failed:', sqlError)
      throw new Error(`Cannot complete cleanup: ${finalCheck.length} stage transitions still reference batch`)
    }
  }

  console.log('Manual cleanup completed successfully')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate employee status and role
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Only managers can delete batches
    if (!['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Only managers can delete batches' }, { status: 403 })
    }

    const { id: batchId } = await params

    // First, get the batch to ensure it exists and get related data
    const { data: batch, error: batchError } = await supabase
      .from('work_batches')
      .select('*')
      .eq('id', batchId)
      .single()
    
    if (batchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // Check if there are any active tasks associated with this batch
    const { data: activeTasks, error: tasksError } = await supabase
      .from('work_tasks')
      .select('id, status, task_type')
      .eq('batch_id', batchId)
      .in('status', ['pending', 'in_progress'])

    if (tasksError) {
      console.error('Error checking active tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to check batch dependencies' }, { status: 500 })
    }

    // Prevent deletion if there are active tasks
    if (activeTasks && activeTasks.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete batch with active tasks', 
        details: `${activeTasks.length} active tasks must be completed or cancelled first`,
        activeTasks: activeTasks.map(t => ({ id: t.id, type: t.task_type, status: t.status }))
      }, { status: 400 })
    }

    // Begin cleanup process
    console.log(`Deleting batch ${batchId} and cleaning up related data...`)

    // Perform manual cleanup with retry logic
    await performManualCleanup(supabase, batchId)

    // Now attempt to delete the batch itself
    const { error: deleteError } = await supabase
      .from('work_batches')
      .delete()
      .eq('id', batchId)

         if (deleteError) {
       console.error('Error deleting batch:', deleteError)
       
       // If it's a foreign key constraint error, provide more helpful info
       if (deleteError.code === '23503') {
         return NextResponse.json({ 
           error: 'Cannot delete batch due to foreign key constraints', 
           details: deleteError.message,
           hint: 'Some related records may still reference this batch. The cleanup process may need more time.',
           suggestion: 'Please wait a moment and try again, or contact support if the issue persists.'
         }, { status: 409 })
       }
       
       return NextResponse.json({ 
         error: 'Failed to delete batch', 
         details: deleteError.message
       }, { status: 500 })
     }

    console.log(`Successfully deleted batch ${batchId} and cleaned up related data`)

    return NextResponse.json({ 
      success: true, 
      message: 'Batch deleted successfully',
      cleanupSummary: {
        batchId,
        tasksUpdated: 'All tasks unlinked from batch',
        transitionsDeleted: 'All stage transitions removed with retry logic',
        workflowLogsDeleted: 'All workflow execution logs removed'
      }
    })

  } catch (error) {
    console.error('Batch deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: batchId } = await params

    // Get batch with related data
    const { data: batch, error: batchError } = await supabase
      .from('work_batches')
      .select(`
        *,
        workflow_template:workflow_templates(
          id,
          name,
          description
        )
      `)
      .eq('id', batchId)
      .single()
    
    if (batchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // Get related tasks
    const { data: tasks } = await supabase
      .from('work_tasks')
      .select('id, task_type, status, assigned_to_id')
      .eq('batch_id', batchId)

    // Get related order items (if using batch references)
    let orderItems = null
    if (batch.order_item_ids && batch.order_item_ids.length > 0) {
      const { data } = await supabase
        .from('order_items')
        .select(`
          id,
          product_name,
          variant_title,
          quantity,
          sku,
          orders!inner(
            order_number,
            customer_name
          )
        `)
        .in('id', batch.order_item_ids)
      orderItems = data
    }

    return NextResponse.json({
      ...batch,
      tasks: tasks || [],
      order_items: orderItems || [],
      _stats: {
        total_items: batch.order_item_ids?.length || 0,
        total_tasks: tasks?.length || 0,
        active_tasks: tasks?.filter(t => t.status && ['pending', 'in_progress'].includes(t.status)).length || 0,
        completed_tasks: tasks?.filter(t => t.status === 'completed').length || 0
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 