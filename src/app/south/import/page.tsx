'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AvailableTable {
  name: string
  displayName: string
  description: string
  csvFile: string
  oneTime: boolean
}

export default function ImportAirtablePage() {
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  
  const [availableTables, setAvailableTables] = useState<AvailableTable[]>([])
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set())
  const [clearExisting, setClearExisting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<Record<string, { success: boolean; recordsImported?: number; error?: string }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    fetchAvailableTables()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: worker } = await supabase
      .from('workers')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker || worker.role !== 'manager') {
      router.push('/unauthorized')
    }
  }

  async function fetchAvailableTables() {
    try {
      const response = await fetch('/api/south/import-airtable')
      if (!response.ok) throw new Error('Failed to fetch tables')
      
      const data = await response.json()
      setAvailableTables(data.tables)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load available tables',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  function toggleTableSelection(tableName: string) {
    const newSelection = new Set(selectedTables)
    if (newSelection.has(tableName)) {
      newSelection.delete(tableName)
    } else {
      newSelection.add(tableName)
    }
    setSelectedTables(newSelection)
  }

  async function handleImport() {
    if (selectedTables.size === 0) {
      toast({
        title: 'No tables selected',
        description: 'Please select at least one table to import',
        variant: 'destructive'
      })
      return
    }

    setImporting(true)
    setImportResults({})

    for (const tableName of selectedTables) {
      try {
        const response = await fetch('/api/south/import-airtable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableName, clearExisting })
        })

        const result = await response.json()

        if (response.ok) {
          setImportResults(prev => ({
            ...prev,
            [tableName]: { success: true, recordsImported: result.recordsImported }
          }))
        } else {
          setImportResults(prev => ({
            ...prev,
            [tableName]: { success: false, error: result.error }
          }))
        }
      } catch (error) {
        setImportResults(prev => ({
          ...prev,
          [tableName]: { success: false, error: 'Network error' }
        }))
      }
    }

    setImporting(false)
    
    toast({
      title: 'Import completed',
      description: 'Check the results below for details'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import Airtable Data</h1>
        <p className="text-gray-600">
          Import data from Airtable CSV exports into the machine shop database
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Available Tables
          </CardTitle>
          <CardDescription>
            Select the tables you want to import. One-time imports should only be run once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableTables.map((table) => (
            <div
              key={table.name}
              className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50"
            >
              <Checkbox
                id={table.name}
                checked={selectedTables.has(table.name)}
                onCheckedChange={() => toggleTableSelection(table.name)}
                disabled={importing}
              />
              <div className="flex-1">
                <label
                  htmlFor={table.name}
                  className="text-sm font-medium cursor-pointer"
                >
                  {table.displayName}
                  {table.oneTime && (
                    <Badge variant="outline" className="ml-2">One-time</Badge>
                  )}
                </label>
                <p className="text-sm text-gray-600 mt-1">{table.description}</p>
                <p className="text-xs text-gray-500 mt-1">Source: {table.csvFile}</p>
                
                {importResults[table.name] && (
                  <div className="mt-2">
                    {importResults[table.name].success ? (
                      <div className="flex items-center text-green-600 text-sm">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Imported {importResults[table.name].recordsImported} records
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {importResults[table.name].error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="border-t pt-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="clearExisting"
                checked={clearExisting}
                onCheckedChange={(checked) => setClearExisting(checked as boolean)}
                disabled={importing}
              />
              <div>
                <label
                  htmlFor="clearExisting"
                  className="text-sm font-medium cursor-pointer"
                >
                  Clear existing data before import
                </label>
                <p className="text-sm text-gray-600">
                  Warning: This will delete all existing records in the selected tables
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          onClick={handleImport}
          disabled={importing || selectedTables.size === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Import Selected Tables
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={() => router.push('/south')}
          disabled={importing}
        >
          Back to Dashboard
        </Button>
      </div>

      {clearExisting && (
        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-900">
                  Clear existing data is enabled
                </p>
                <p className="text-sm text-orange-800 mt-1">
                  All existing records in the selected tables will be deleted before importing new data.
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}