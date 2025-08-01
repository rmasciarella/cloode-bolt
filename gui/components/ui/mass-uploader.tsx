"use client"

import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Upload, Download, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Papa from 'papaparse'

interface MassUploaderProps {
  tableName: string
  entityName: string
  sampleData: Record<string, any>
  onUploadComplete?: () => void
  requiredFields?: string[]
  fieldDescriptions?: Record<string, string>
}

type UploadResult = {
  success: number
  errors: Array<{ row: number; error: string; data?: any }>
  warnings: Array<{ row: number; warning: string; data?: any }>
}

export function MassUploader({ 
  tableName, 
  entityName, 
  sampleData, 
  onUploadComplete,
  requiredFields = [],
  fieldDescriptions = {}
}: MassUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const { toast } = useToast()

  const downloadTemplate = () => {
    const headers = Object.keys(sampleData)
    const sampleRow = Object.values(sampleData)
    
    // Create CSV content with headers and sample row
    const csvContent = [
      headers.join(','),
      sampleRow.map(value => {
        if (value === null || value === undefined) return ''
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return String(value)
      }).join(',')
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', `${tableName}_template.csv`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast({
      title: "Template Downloaded",
      description: `CSV template for ${entityName} downloaded successfully`
    })
  }

  const parseCSV = (text: string): Record<string, any>[] => {
    const result = Papa.parse<Record<string, any>>(text, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
      transform: (value: string) => {
        // Convert empty strings to null
        if (value === '') return null
        
        // Convert boolean strings
        if (value.toLowerCase() === 'true') return true
        if (value.toLowerCase() === 'false') return false
        
        // Try to convert numbers (but preserve strings that look like IDs)
        if (!isNaN(Number(value)) && value !== '' && !value.startsWith('0')) {
          return Number(value)
        }
        
        return value
      }
    })

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map(error => 
        `Row ${error.row || 'unknown'}: ${error.message || 'Unknown error'}`
      ).join('; ')
      throw new Error(`CSV parsing errors: ${errorMessages}`)
    }

    if (!result.data || result.data.length === 0) {
      throw new Error('CSV must have at least one data row')
    }

    return result.data
  }

  const validateRow = (row: Record<string, any>, rowIndex: number): string[] => {
    const errors: string[] = []
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!row.hasOwnProperty(field) || row[field] === null || row[field] === '') {
        errors.push(`Missing required field: ${field}`)
      }
    })
    
    return errors
  }

  const handleFileUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadResult(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)
      
      if (rows.length === 0) {
        throw new Error('No data rows found in CSV')
      }

      const result: UploadResult = {
        success: 0,
        errors: [],
        warnings: []
      }

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNumber = i + 2 // +2 because CSV is 1-indexed and has header row
        
        // Validate row
        const validationErrors = validateRow(row, i)
        if (validationErrors.length > 0) {
          result.errors.push({
            row: rowNumber,
            error: validationErrors.join(', '),
            data: row
          })
          continue
        }

        try {
          // Insert into database
          const { error } = await supabase
            .from(tableName)
            .insert([row])

          if (error) {
            result.errors.push({
              row: rowNumber,
              error: error.message,
              data: row
            })
          } else {
            result.success++
          }
        } catch (error: any) {
          result.errors.push({
            row: rowNumber,
            error: error.message || 'Unknown error',
            data: row
          })
        }
      }

      setUploadResult(result)
      
      if (result.success > 0) {
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${result.success} ${entityName.toLowerCase()}${result.success !== 1 ? 's' : ''}${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`
        })
        
        if (onUploadComplete) {
          onUploadComplete()
        }
      } else {
        toast({
          title: "Upload Failed",
          description: `No records were uploaded. Please check the errors below.`,
          variant: "destructive"
        })
      }

    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        title: "Upload Error",
        description: error.message || "Failed to process CSV file",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Mass Upload {entityName}
        </CardTitle>
        <CardDescription>
          Upload multiple {entityName.toLowerCase()}s from a CSV file. Download the template first to see the required format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Download */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Download CSV Template</p>
              <p className="text-sm text-blue-700">Get the correct format with sample data</p>
            </div>
          </div>
          <Button onClick={downloadTemplate} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        {/* Required Fields Info */}
        {requiredFields.length > 0 && (
          <div className="p-4 border rounded-lg bg-amber-50">
            <h4 className="font-medium text-amber-900 mb-2">Required Fields</h4>
            <div className="flex flex-wrap gap-2">
              {requiredFields.map(field => (
                <Badge key={field} variant="secondary" className="bg-amber-100 text-amber-800">
                  {field}
                  {fieldDescriptions[field] && (
                    <span className="ml-1 text-xs">({fieldDescriptions[field]})</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* File Upload */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button 
              onClick={handleFileUpload} 
              disabled={!file || isUploading}
              className="whitespace-nowrap"
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? 'Uploading...' : 'Upload CSV'}
            </Button>
          </div>
          
          {file && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        {/* Upload Results */}
        {uploadResult && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700">
                  {uploadResult.success} Successful
                </span>
              </div>
              {uploadResult.errors.length > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-700">
                    {uploadResult.errors.length} Failed
                  </span>
                </div>
              )}
              {uploadResult.warnings.length > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-700">
                    {uploadResult.warnings.length} Warnings
                  </span>
                </div>
              )}
            </div>

            {/* Error Details */}
            {uploadResult.errors.length > 0 && (
              <div className="border rounded-lg">
                <div className="p-3 bg-red-50 border-b">
                  <h4 className="font-medium text-red-900">Errors</h4>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {uploadResult.errors.map((error, index) => (
                    <div key={index} className="p-3 border-b last:border-b-0">
                      <div className="flex items-start gap-2">
                        <Badge variant="destructive" className="text-xs">
                          Row {error.row}
                        </Badge>
                        <p className="text-sm text-red-700">{error.error}</p>
                      </div>
                      {error.data && (
                        <div className="mt-2 text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
                          {JSON.stringify(error.data, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}