"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { apiKeysClient } from "@/lib/api-keys-client"
import { elementPayAPI } from "@/lib/utils"
import { CheckCircle, XCircle, Loader2, Globe, TestTube, Webhook } from "lucide-react"
import type { ApiKey } from "@/lib/types"

interface ApiTestResult {
  endpoint: string
  status: "success" | "error" | "loading"
  response?: any
  error?: string
}

export default function ApiTester() {
  const [selectedApiKey, setSelectedApiKey] = useState("")
  const [webhookPayload, setWebhookPayload] = useState<string>("")
  const [testResults, setTestResults] = useState<ApiTestResult[]>([])
  const { data: session } = useSession()
  const { toast } = useToast()

  // Fetch user's API keys (testnet)
  const { data: apiKeys = [] } = useQuery<ApiKey[]>({
    queryKey: ["apiKeys", "testnet"],
    queryFn: async () => {
      if (!session?.elementPayToken) throw new Error("No authentication token available")
      const client = apiKeysClient()
      return client.list("testnet", session.elementPayToken)
    },
    enabled: !!session?.elementPayToken,
  })

  const updateTestResult = (endpoint: string, result: Partial<ApiTestResult>) => {
    setTestResults((prev) => {
      const existing = prev.find((r) => r.endpoint === endpoint)
      if (existing) return prev.map((r) => (r.endpoint === endpoint ? { ...r, ...result } : r))
      return [...prev, { endpoint, status: "loading", ...result }]
    })
  }

  // GET /rates/rates (requires x-api-key)
  const testRatesEndpoint = async () => {
    if (!selectedApiKey) {
      sonnerToast.error("API Key Required", {
        description: "Please select an API key first to test the rates endpoint.",
        duration: 4000,
      })
      return
    }

    updateTestResult("/rates/rates", { status: "loading" })
    try {
      const response = await elementPayAPI.getRates(selectedApiKey)
      const text = await response.text()
      if (response.ok) {
        updateTestResult("/rates/rates", { status: "success", response: { status: response.status, body: text } })
      } else {
        updateTestResult("/rates/rates", { status: "error", error: `${response.status}: ${text}` })
      }
    } catch (err: any) {
      updateTestResult("/rates/rates", { status: "error", error: err.message })
    }
  }

  // POST /webhooks/webhooks/test (requires x-api-key?)
  const testWebhookEndpoint = async () => {
    if (!selectedApiKey) {
      toast({ title: "API Key Required", description: "Select an API key first", type: "destructive" })
      return
    }
    if (!webhookPayload.trim()) {
      toast({ title: "Payload Required", description: "Enter a JSON payload for the webhook test", type: "destructive" })
      return
    }

    let parsed: any
    try {
      parsed = JSON.parse(webhookPayload)
    } catch {
      toast({ title: "Invalid JSON", description: "Webhook payload must be valid JSON", type: "destructive" })
      return
    }

    updateTestResult("/webhooks/webhooks/test", { status: "loading" })
    try {
      const response = await elementPayAPI.testWebhook(parsed, selectedApiKey)
      const text = await response.text()
      if (response.ok) {
        updateTestResult("/webhooks/webhooks/test", { status: "success", response: { status: response.status, body: text } })
      } else {
        updateTestResult("/webhooks/webhooks/test", { status: "error", error: `${response.status}: ${text}` })
      }
    } catch (err: any) {
      updateTestResult("/webhooks/webhooks/test", { status: "error", error: err.message })
    }
  }

  const getStatusIcon = (status: ApiTestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: ApiTestResult["status"]) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-600">Success</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      case "loading":
        return <Badge variant="secondary">Testing...</Badge>
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" /> Element Pay API Tester (Testnet)
        </CardTitle>
        <CardDescription>Run real requests only. No mock data is used.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Select API Key</Label>
          {apiKeys.length > 0 ? (
            <Select value={selectedApiKey} onValueChange={setSelectedApiKey}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an API key" />
              </SelectTrigger>
              <SelectContent>
                {apiKeys.map((key) => (
                  <SelectItem key={key.id} value={key.key}>
                    <div className="flex items-center gap-2">
                      <span>{key.name}</span>
                      <Badge variant="secondary" className="text-xs">{key.environment}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-muted-foreground p-4 border rounded-lg">
              No API keys found. Create a Testnet key first.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button onClick={testRatesEndpoint} variant="outline" className="flex items-center gap-2" disabled={!selectedApiKey}>
            <Globe className="h-4 w-4" /> Test Rates
          </Button>
          <Button onClick={testWebhookEndpoint} className="flex items-center gap-2" disabled={!selectedApiKey || !webhookPayload.trim()}>
            <Webhook className="h-4 w-4" /> Test Webhook
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Webhook JSON Payload</Label>
          <Textarea
            value={webhookPayload}
            onChange={(e) => setWebhookPayload(e.target.value)}
            placeholder='{"event":"test","timestamp":"2025-08-08T00:00:00Z"}'
            rows={6}
          />
          <p className="text-xs text-muted-foreground">Enter the exact JSON you want to POST to /webhooks/webhooks/test</p>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Results</h3>
            <div className="space-y-3">
              {testResults.map((r) => (
                <div key={r.endpoint} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(r.status)}
                      <span className="font-mono text-sm">{r.endpoint}</span>
                    </div>
                    {getStatusBadge(r.status)}
                  </div>
                  {r.response && (
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(r.response, null, 2)}</pre>
                  )}
                  {r.error && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{r.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
