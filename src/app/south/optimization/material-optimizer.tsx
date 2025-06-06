'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { 
  Calculator,
  TreePine,
  Package,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  BarChart3,
  Ruler,
  DollarSign
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface OptimizationResult {
  partName: string
  woodSpecies: string
  availableStock: number
  requiredStock: number
  possibleUnits: number
  materialEfficiency: number
  wastePercentage: number
  costPerUnit: number
  totalCost: number
  recommendations: string[]
}

interface MaterialStock {
  id: string
  species: string
  quantity_in_stock: number
  board_feet: number | null
  unit_cost: number | null
  notes: string | null
}

interface PartRequirement {
  id: string
  part_name: string
  part_type: string
  species: string | null
  specifications: any
  material_cost: number | null
  estimated_labor_hours: number | null
}

export function MaterialOptimizer() {
  const [inventory, setInventory] = useState<MaterialStock[]>([])
  const [parts, setParts] = useState<PartRequirement[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [optimizations, setOptimizations] = useState<OptimizationResult[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [inventoryRes, partsRes, requestsRes] = await Promise.all([
        fetch('/api/south/wood-inventory'),
        fetch('/api/south/parts-catalog?is_active=true'),
        fetch('/api/south/production-requests?status=pending&status=in_production')
      ])

      if (!inventoryRes.ok) throw new Error('Failed to fetch inventory')
      if (!partsRes.ok) throw new Error('Failed to fetch parts')
      if (!requestsRes.ok) throw new Error('Failed to fetch requests')

      const { inventory: inventoryData } = await inventoryRes.json()
      const { parts: partsData } = await partsRes.json()
      const { requests: requestsData } = await requestsRes.json()

      // Filter inventory with stock > 0
      const activeInventory = inventoryData.filter((item: any) => item.quantity_in_stock > 0)

      setInventory(activeInventory || [])
      setParts(partsData || [])
      setRequests(requestsData || [])

      // Auto-calculate optimizations on load
      calculateOptimizations(activeInventory || [], partsData || [], requestsData || [])
    } catch (error) {
      logError(error as Error, 'MATERIAL_OPTIMIZER', { action: 'load_data' })
      toast({
        title: 'Error',
        description: 'Failed to load optimization data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function calculateOptimizations(
    inventoryData: MaterialStock[],
    partsData: PartRequirement[],
    requestsData: any[]
  ) {
    setCalculating(true)
    const results: OptimizationResult[] = []

    // Group requests by part
    const requestsByPart = requestsData.reduce((acc, req) => {
      if (!req.part_id) return acc
      if (!acc[req.part_id]) acc[req.part_id] = []
      acc[req.part_id].push(req)
      return acc
    }, {} as Record<string, any[]>)

    // Calculate optimization for each part with pending requests
    Object.entries(requestsByPart).forEach(([partId, partRequests]) => {
      const part = partsData.find(p => p.id === partId)
      if (!part) return

      const totalQuantityNeeded = partRequests.reduce((sum, req) => 
        sum + (req.quantity_ordered - (req.quantity_completed || 0)), 0
      )

      // Find suitable wood inventory
      inventoryData.forEach(stock => {
        // Simple size compatibility check
        const isCompatible = checkMaterialCompatibility(part, stock)
        if (!isCompatible) return

        // Calculate how many parts can be made from this stock
        const partsPerStock = calculatePartsPerStock(part, stock)
        const possibleUnits = Math.floor(stock.quantity * partsPerStock)
        
        // Calculate efficiency
        const materialEfficiency = partsPerStock * 100 // Simplified efficiency
        const wastePercentage = 100 - materialEfficiency

        // Calculate costs
        const costPerUnit = (stock.unit_cost || 0) / partsPerStock
        const totalCost = costPerUnit * Math.min(possibleUnits, totalQuantityNeeded)

        // Generate recommendations
        const recommendations: string[] = []
        if (materialEfficiency > 80) {
          recommendations.push('Excellent material efficiency')
        } else if (materialEfficiency > 60) {
          recommendations.push('Good material efficiency')
        } else {
          recommendations.push('Consider alternative stock sizes')
        }

        if (possibleUnits >= totalQuantityNeeded) {
          recommendations.push('Sufficient stock available')
        } else {
          recommendations.push(`Can produce ${possibleUnits}/${totalQuantityNeeded} units`)
        }

        if (wastePercentage > 30) {
          recommendations.push('High waste - consider nesting optimization')
        }

        results.push({
          partName: part.part_name,
          woodSpecies: stock.species,
          availableStock: stock.quantity_in_stock,
          requiredStock: Math.ceil(totalQuantityNeeded / partsPerStock),
          possibleUnits,
          materialEfficiency,
          wastePercentage,
          costPerUnit,
          totalCost,
          recommendations
        })
      })
    })

    // Sort by efficiency
    results.sort((a, b) => b.materialEfficiency - a.materialEfficiency)
    
    setOptimizations(results)
    setCalculating(false)

    logBusiness('Material optimization calculated', 'MATERIAL_OPTIMIZER', {
      totalOptimizations: results.length,
      averageEfficiency: results.reduce((sum, r) => sum + r.materialEfficiency, 0) / results.length
    })
  }

  function checkMaterialCompatibility(part: PartRequirement, stock: MaterialStock): boolean {
    // Check if part species matches stock species (if specified)
    if (part.species && part.species !== stock.species) return false
    
    // Check if stock has sufficient board feet for the part type
    if (part.part_type === 'cup' && (stock.board_feet || 0) < 2) return false
    if (part.part_type === 'baffle' && (stock.board_feet || 0) < 1) return false
    
    return true
  }

  function calculatePartsPerStock(part: PartRequirement, stock: MaterialStock): number {
    // Calculate based on board feet and part type
    const boardFeet = stock.board_feet || 1
    
    if (part.part_type === 'cup') {
      // Cups require approximately 0.5 board feet each
      return Math.floor(boardFeet / 0.5)
    } else if (part.part_type === 'baffle') {
      // Baffles require approximately 0.25 board feet each
      return Math.floor(boardFeet / 0.25)
    } else if (part.part_type === 'driver_mount') {
      // Driver mounts require approximately 0.3 board feet each
      return Math.floor(boardFeet / 0.3)
    }
    return Math.floor(boardFeet) // Default to 1 part per board foot
  }

  const totalPotentialSavings = optimizations.reduce((sum, opt) => {
    const standardCost = opt.totalCost * 1.2 // Assume 20% savings vs standard
    return sum + (standardCost - opt.totalCost)
  }, 0)

  const averageEfficiency = optimizations.length > 0
    ? optimizations.reduce((sum, opt) => sum + opt.materialEfficiency, 0) / optimizations.length
    : 0

  const highEfficiencyCount = optimizations.filter(opt => opt.materialEfficiency > 80).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading optimization data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageEfficiency.toFixed(1)}%</div>
            <Progress value={averageEfficiency} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Efficiency Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{highEfficiencyCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              &gt;80% efficiency
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requiring optimization
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalPotentialSavings.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              vs standard cutting
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Results */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="by-part">By Part</TabsTrigger>
          <TabsTrigger value="by-material">By Material</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
              <CardDescription>
                Best material allocation options sorted by efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calculating ? (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 mx-auto mb-4 animate-pulse" />
                  <p>Calculating optimizations...</p>
                </div>
              ) : optimizations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active production requests to optimize</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {optimizations.slice(0, 10).map((opt, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{opt.partName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Using {opt.woodSpecies}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={opt.materialEfficiency > 80 ? 'default' : 
                                    opt.materialEfficiency > 60 ? 'secondary' : 'destructive'}
                          >
                            {opt.materialEfficiency.toFixed(0)}% Efficient
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Available</p>
                          <p className="font-medium">{opt.availableStock} units</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Can Produce</p>
                          <p className="font-medium">{opt.possibleUnits} parts</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cost/Unit</p>
                          <p className="font-medium">${opt.costPerUnit.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Waste</p>
                          <p className="font-medium">{opt.wastePercentage.toFixed(0)}%</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1">
                        {opt.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {rec.includes('Excellent') || rec.includes('Good') ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : rec.includes('High waste') || rec.includes('Consider') ? (
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                            ) : (
                              <Zap className="h-4 w-4 text-blue-600" />
                            )}
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button size="sm">
                          Apply Optimization
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-part" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization by Part</CardTitle>
              <CardDescription>
                Material options grouped by part type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {parts.map(part => {
                  const partOpts = optimizations.filter(opt => opt.partName === part.part_name)
                  if (partOpts.length === 0) return null

                  return (
                    <div key={part.id} className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {part.part_name}
                      </h4>
                      <div className="grid gap-2 ml-6">
                        {partOpts.map((opt, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">{opt.woodSpecies}</span>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">
                                {opt.materialEfficiency.toFixed(0)}% efficient
                              </span>
                              <span className="font-medium">
                                ${opt.costPerUnit.toFixed(2)}/unit
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-material" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization by Material</CardTitle>
              <CardDescription>
                Part options grouped by wood species
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {inventory.map(stock => {
                  const stockOpts = optimizations.filter(opt => opt.woodSpecies === stock.species)
                  if (stockOpts.length === 0) return null

                  return (
                    <div key={stock.id} className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <TreePine className="h-4 w-4" />
                        {stock.species}
                        <Badge variant="outline" className="ml-2">
                          {stock.quantity_in_stock} available
                        </Badge>
                      </h4>
                      <div className="grid gap-2 ml-6">
                        {stockOpts.map((opt, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">{opt.partName}</span>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">
                                Can produce {opt.possibleUnits} units
                              </span>
                              <Badge 
                                variant={opt.materialEfficiency > 80 ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {opt.materialEfficiency.toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}