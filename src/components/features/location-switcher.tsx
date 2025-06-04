'use client'

import { useLocation } from '@/contexts/location-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MapPin, Check, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function LocationSwitcher() {
  const { currentLocation, locations, isLoading, switchLocation, canAccessLocation } = useLocation()

  if (isLoading || !currentLocation) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <MapPin className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <MapPin className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLocation.display_name}</span>
          <span className="sm:hidden">{currentLocation.name.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Location</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locations.map((location) => {
          const canAccess = canAccessLocation(location.name)
          const isCurrent = location.name === currentLocation.name
          
          return (
            <DropdownMenuItem
              key={location.id}
              onClick={() => canAccess && switchLocation(location.name)}
              disabled={!canAccess}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <div>
                    <div className="font-medium">{location.display_name}</div>
                    {location.address && (
                      <div className="text-xs text-muted-foreground">
                        {location.address}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isCurrent && <Check className="h-4 w-4 text-green-600" />}
                  {!canAccess && <Lock className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <div className="text-xs text-muted-foreground">
            Your primary location: <Badge variant="secondary" className="ml-1">{currentLocation.name.toUpperCase()}</Badge>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}