"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  Pause,
  Camera,
  CheckCircle,
  MessageSquare,
  History,
  FileText,
  AlertTriangle,
  Clock,
} from "lucide-react"
import { MagnifyingGlassIcon, PlusIcon } from "@radix-ui/react-icons"

export default function TechnicianInterface() {
  const [currentTime, setCurrentTime] = useState("1h 23m")
  const [checklist, setChecklist] = useState([
    { id: 1, task: "Visual inspection complete", completed: true },
    { id: 2, task: "Cable continuity tested", completed: true },
    { id: 3, task: "Driver resistance measured", completed: false },
    { id: 4, task: "Solder joints inspected", completed: false },
  ])

  const recentParts = [
    { name: "50mm Beryllium Driver", available: true, stock: 12 },
    { name: "4-pin Mini XLR Jack", available: true, stock: 8 },
    { name: "Cup Gasket Set", available: true, stock: 3, lowStock: true },
  ]

  const toggleChecklistItem = (id: number) => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)))
  }

  const completedTasks = checklist.filter((item) => item.completed).length
  const progressPercentage = (completedTasks / checklist.length) * 100

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
        <div>
          <h1 className="text-lg font-bold">🔧 My Repair Queue</h1>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            T
          </div>
          <span className="text-sm font-medium">Tony</span>
        </div>
      </div>

      {/* Current Repair */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current Repair</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="font-semibold">REP-2024-0134</div>
            <div className="text-sm text-muted-foreground">Verite Closed - Sapele</div>
            <Badge variant="destructive" className="mt-1">
              🔴 Rush Priority
            </Badge>
          </div>

          <div>
            <div className="text-sm font-medium">Issue: Driver cutting out</div>
            <div className="flex items-center space-x-2 mt-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Time Elapsed: {currentTime}</span>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button size="sm" variant="outline" className="flex-1">
              <Pause className="mr-1 h-3 w-3" />
              Pause
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <Camera className="mr-1 h-3 w-3" />
              Photo
            </Button>
            <Button size="sm" className="flex-1">
              <CheckCircle className="mr-1 h-3 w-3" />
              Complete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diagnosis Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Diagnosis Checklist</CardTitle>
          <Progress value={progressPercentage} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <Checkbox
                id={`task-${item.id}`}
                checked={item.completed}
                onCheckedChange={() => toggleChecklistItem(item.id)}
              />
              <label
                htmlFor={`task-${item.id}`}
                className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}
              >
                {item.task}
              </label>
            </div>
          ))}

          <Button size="sm" variant="outline" className="w-full mt-3">
            <PlusIcon className="mr-1 h-3 w-3" />
            Add Finding
          </Button>
        </CardContent>
      </Card>

      {/* Parts Needed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parts Needed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search parts inventory" className="pl-10" size={32} />
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Recently Used:</div>
            <div className="space-y-2">
              {recentParts.map((part, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span>• {part.name}</span>
                    {part.available ? (
                      <Badge variant="outline" className="text-xs">
                        ✅
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        ❌
                      </Badge>
                    )}
                  </div>
                  {part.lowStock && (
                    <div className="flex items-center space-x-1">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      <span className="text-xs text-orange-600">(Low: {part.stock})</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline">
              <PlusIcon className="mr-1 h-3 w-3" />
              Request Parts
            </Button>
            <Button size="sm" variant="outline">
              <MessageSquare className="mr-1 h-3 w-3" />
              Ask Expert
            </Button>
            <Button size="sm" variant="outline">
              <History className="mr-1 h-3 w-3" />
              View History
            </Button>
            <Button size="sm" variant="outline">
              <FileText className="mr-1 h-3 w-3" />
              Add Notes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
