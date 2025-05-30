"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Clock, 
  Wrench, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react'
import type { Database } from '@/types/database.types'

type RepairOrder = Database['public']['Tables']['repair_orders']['Row'] & {
  repair_issues: Database['public']['Tables']['repair_issues']['Row'][]
  repair_actions: Database['public']['Tables']['repair_actions']['Row'][]
}

interface RepairWorkerDashboardProps {
  repairs: RepairOrder[]
  workerId: string
  workerName: string
}

export default function RepairWorkerDashboard({ repairs, workerId, workerName }: RepairWorkerDashboardProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState('assigned')

  // Filter repairs based on search
  const filteredRepairs = repairs.filter(repair => 
    searchTerm === '' ||
    repair.repair_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repair.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repair.headphone_model?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Separate repairs by status
  const assignedRepairs = filteredRepairs.filter(r => r.status === 'assigned' || r.status === 'diagnosed')
  const inProgressRepairs = filteredRepairs.filter(r => r.status === 'in_progress')
  const testingRepairs = filteredRepairs.filter(r => r.status === 'testing')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-800'
      case 'diagnosed':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-purple-100 text-purple-800'
      case 'testing':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    return priority === 'rush' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const handleStartRepair = (repairId: string) => {
    router.push(`/worker/repairs/${repairId}`)
  }

  const renderRepairCard = (repair: RepairOrder) => (
    <Card key={repair.id} className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">{repair.repair_number}</h3>
            <p className="text-sm text-muted-foreground">
              {repair.headphone_model} | {repair.customer_name}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(repair.status)}>
              {repair.status.replace('_', ' ')}
            </Badge>
            <Badge className={getPriorityColor(repair.priority)}>
              {repair.priority}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            Received: {new Date(repair.created_at).toLocaleDateString()}
          </div>
          {repair.estimated_minutes && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              Estimated: {formatTime(repair.estimated_minutes)}
            </div>
          )}
          {repair.total_time_minutes > 0 && (
            <div className="flex items-center text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 mr-2" />
              Time spent: {formatTime(repair.total_time_minutes)}
            </div>
          )}
        </div>

        {repair.repair_issues.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-1">Issues:</p>
            <div className="space-y-1">
              {repair.repair_issues.slice(0, 2).map(issue => (
                <p key={issue.id} className="text-sm text-muted-foreground">
                  • {issue.specific_issue}
                </p>
              ))}
              {repair.repair_issues.length > 2 && (
                <p className="text-sm text-muted-foreground">
                  ... and {repair.repair_issues.length - 2} more
                </p>
              )}
            </div>
          </div>
        )}

        <Button 
          className="w-full" 
          onClick={() => handleStartRepair(repair.id)}
        >
          {repair.status === 'in_progress' ? (
            <>
              <Clock className="mr-2 h-4 w-4" />
              Continue Repair
            </>
          ) : (
            <>
              <Wrench className="mr-2 h-4 w-4" />
              Start Repair
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Repairs</h1>
          <p className="text-muted-foreground">
            <User className="inline h-4 w-4 mr-1" />
            {workerName}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search repairs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned to Me</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedRepairs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressRepairs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Testing</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testingRepairs.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Repairs List */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assigned">
            Assigned ({assignedRepairs.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress ({inProgressRepairs.length})
          </TabsTrigger>
          <TabsTrigger value="testing">
            Testing ({testingRepairs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="mt-6">
          {assignedRepairs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">No repairs assigned</p>
                <p className="text-muted-foreground">
                  Check back later for new repair assignments
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedRepairs.map(renderRepairCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          {inProgressRepairs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">No repairs in progress</p>
                <p className="text-muted-foreground">
                  Start working on an assigned repair to see it here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressRepairs.map(renderRepairCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="testing" className="mt-6">
          {testingRepairs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">No repairs in testing</p>
                <p className="text-muted-foreground">
                  Completed repairs will appear here for final testing
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testingRepairs.map(renderRepairCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}