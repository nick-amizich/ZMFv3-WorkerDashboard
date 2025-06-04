'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useLocation } from '@/contexts/location-context'

export function useLocationTasks(status?: string) {
  const { currentLocation } = useLocation()
  const supabase = createClient()

  return useQuery({
    queryKey: ['tasks', currentLocation?.id, status],
    queryFn: async () => {
      if (!currentLocation) return []

      let query = supabase
        .from('work_tasks')
        .select(`
          *,
          assigned_to:workers!work_tasks_assigned_to_fkey(
            id,
            name,
            auth_user_id
          ),
          batch:work_batches(
            id,
            batch_number,
            manufacturing_location
          )
        `)
        .eq('location_id', currentLocation.id)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    enabled: !!currentLocation,
  })
}

export function useLocationProductionStatus() {
  const { currentLocation } = useLocation()
  const supabase = createClient()

  return useQuery({
    queryKey: ['production-status', currentLocation?.id],
    queryFn: async () => {
      if (!currentLocation) return null

      const { data, error } = await supabase
        .from('location_production_status')
        .select('*')
        .eq('location_id', currentLocation.id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!currentLocation,
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}