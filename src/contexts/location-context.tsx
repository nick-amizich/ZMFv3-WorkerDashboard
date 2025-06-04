'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Location {
  id: string
  name: string
  display_name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  is_active: boolean | null
  capabilities: string[] | null
  created_at: string | null
  updated_at: string | null
}

interface LocationContextType {
  currentLocation: Location | null
  locations: Location[]
  isLoading: boolean
  switchLocation: (locationName: string) => void
  canAccessLocation: (locationName: string) => boolean
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadLocationData()
  }, [])

  async function loadLocationData() {
    try {
      // Get current user and their location
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get worker details
      const { data: worker } = await supabase
        .from('workers')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()

      if (worker) {
        setUserRole(worker.role)
        // Default to 'north' since primary_location field doesn't exist yet
        setUserLocation('north')
      }

      // Get all locations
      const { data: locationsData } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (locationsData) {
        setLocations(locationsData)
        
        // Set current location based on environment or default to 'north'
        const envLocation = process.env.NEXT_PUBLIC_LOCATION_CODE
        const defaultLocation = locationsData.find(
          loc => loc.name === (envLocation || 'north')
        )
        
        if (defaultLocation) {
          setCurrentLocation(defaultLocation)
        }
      }
    } catch (error) {
      console.error('Error loading location data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function canAccessLocation(locationName: string): boolean {
    // Managers can access all locations
    if (userRole === 'manager') return true
    
    // Workers can only access their primary location
    return userLocation === locationName
  }

  function switchLocation(locationName: string) {
    // Check if user can access this location
    if (!canAccessLocation(locationName)) {
      console.error('Access denied to location:', locationName)
      return
    }

    const newLocation = locations.find(loc => loc.name === locationName)
    if (newLocation) {
      setCurrentLocation(newLocation)
      
      // If switching to south location and we're not already there, redirect
      if (locationName === 'south' && !window.location.hostname.includes('south')) {
        window.location.href = process.env.NEXT_PUBLIC_SOUTH_APP_URL || 'https://south.zmfheadphones.com'
      } else if (locationName === 'north' && window.location.hostname.includes('south')) {
        window.location.href = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://app.zmfheadphones.com'
      }
    }
  }

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        locations,
        isLoading,
        switchLocation,
        canAccessLocation
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}