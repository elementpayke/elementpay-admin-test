"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { apiKeysClient } from "@/lib/api-keys-client"
import type { ApiKey } from "@/lib/types"
import type { Environment as ApiConfigEnvironment } from "@/lib/api-config"
import { CreateApiKeyDialog } from "./enhanced-create-api-key-dialog"
import { ApiKeyTable } from "./enhanced-api-key-table"
import { toast as sonnerToast } from "sonner"
import { ApiKeyRevealModal } from "./api-key-reveal-modal"
import { ApiKeyViewModal } from "./api-key-view-modal"
import { ApiKeyEditModal } from "./api-key-edit-modal"
import { useEnvironment } from "@/hooks/use-environment"
import { EnvironmentToggle } from "@/components/ui/environment-toggle"

// Helper function to convert api-config environment to types.ts environment
const convertEnvironment = (env: ApiConfigEnvironment): "testnet" | "mainnet" => {
  return env === 'sandbox' ? 'testnet' : 'mainnet'
}

export default function EnhancedApiKeyManager() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { environment: apiConfigEnvironment, isSandbox } = useEnvironment()

  const client = useMemo(() => apiKeysClient(), [])
  const token = session?.elementPayToken as string | undefined

  // Convert to types.ts environment format
  const environment = convertEnvironment(apiConfigEnvironment)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newKeyForReveal, setNewKeyForReveal] = useState<{
    name: string
    key: string
    environment: "testnet" | "mainnet"
    webhookUrl?: string
    webhookSecret?: string
  } | null>(null)
  const [viewingApiKey, setViewingApiKey] = useState<ApiKey | null>(null)
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null)

  const apiKeysQuery = useQuery<ApiKey[]>({
    queryKey: ["apiKeys", environment],
    enabled: !!token,
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated")
      return client.list(environment, token)
    },
  })

  const createKey = useMutation({
    mutationFn: async ({
      name,
      environment: env,
      rotate_existing,
      webhook_url,
      webhook_secret
    }: {
      name: string
      environment?: "testnet" | "mainnet"
      rotate_existing?: boolean
      webhook_url?: string
      webhook_secret?: string
    }) => {
      console.log('createKey mutation starting with:', { name, env, rotate_existing, webhook_url, webhook_secret: webhook_secret ? '[REDACTED]' : undefined })
      if (!token) {
        console.error('No token available')
        throw new Error("Not authenticated")
      }
      console.log('Token available, calling client.create')
      try {
        const result = await client.create({
          name,
          environment: env || environment,
          rotateExisting: rotate_existing,
          webhookUrl: webhook_url,
          webhookSecret: webhook_secret
        }, token)
        console.log('client.create succeeded:', JSON.stringify(result, null, 2))
        return result
      } catch (error) {
        console.error('client.create failed:', error)
        throw error
      }
    },
    onSuccess: (created) => {
      console.log('createKey onSuccess - created object:', JSON.stringify(created, null, 2))
      console.log('created keys exist?', { name: !!created?.name, key: !!created?.key, env: !!created?.environment })
      
      queryClient.invalidateQueries({ queryKey: ["apiKeys", environment] })
      
      // Safety check - ensure we have the required fields (name is required, key can be empty)
      if (!created || !created.name) {
        console.error('Created API key is missing required fields:', created)
        sonnerToast.success("API Key Created", {
          description: "API key was created but details couldn't be loaded for display.",
          duration: 5000,
        })
        setIsCreateOpen(false)
        return
      }
      
      // Log if key is empty but still show modal
      if (!created.key || created.key.trim() === '') {
        console.warn('Created API key has empty key field - will show modal with message')
      }
      
      // Open one-time reveal modal with full key if provided; fallback to preview
      const keyForReveal = {
        name: created.name,
        key: created.key,
        environment: created.environment || 'testnet',
        webhookUrl: created.webhookUrl,
        webhookSecret: created.webhookSecret,
      }
      console.log('Setting newKeyForReveal to:', JSON.stringify(keyForReveal, null, 2))
      setNewKeyForReveal(keyForReveal)
      setIsCreateOpen(false)
      
      // Determine the key type for better messaging
      const hasWebhook = created.webhookUrl || created.webhookSecret
      const keyType = hasWebhook ? 'WebSocket' : 'REST'
      
      sonnerToast.success(`${keyType} API Key Created Successfully`, {
        description: `"${created.name}" has been generated and is ready to use${hasWebhook ? ' with webhook configuration' : ''}.`,
        duration: 5000,
      })
    },
    onError: (err: any) => {
      console.error('createKey onError:', err)
      console.error('Error details:', { message: err?.message, stack: err?.stack, cause: err?.cause })
      
      // Handle specific error cases
      const errorMessage = err?.message || "Unknown error occurred"
      
      // Check for KYC requirement error
      if (errorMessage.includes("KYC") || errorMessage.includes("complete KYC")) {
        sonnerToast.error("KYC Verification Required", {
          description: "You must complete KYC verification before creating API keys. Our team has been notified and will contact you soon.",
          duration: 12000,
          action: {
            label: "Contact Support",
            onClick: () => window.open("mailto:support@elementpay.net?subject=KYC%20Verification%20Request", "_blank")
          }
        })
        return
      }
      
      // Check for 403 Forbidden errors
      if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
        sonnerToast.error("Access Denied", {
          description: "You don't have permission to create API keys. Please contact support if you believe this is an error.",
          duration: 10000,
          action: {
            label: "Contact Support",
            onClick: () => window.open("mailto:support@elementpay.net?subject=API%20Key%20Access%20Issue", "_blank")
          }
        })
        return
      }
      
      // Check for authentication errors
      if (errorMessage.includes("authenticated") || errorMessage.includes("401")) {
        sonnerToast.error("Authentication Required", {
          description: "Please log in again to create API keys.",
          duration: 8000,
          action: {
            label: "Sign In",
            onClick: () => window.location.href = "/auth/login"
          }
        })
        return
      }
      
      // Check for rate limiting
      if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
        sonnerToast.error("Rate Limited", {
          description: "You're creating API keys too quickly. Please wait a few minutes and try again.",
          duration: 8000,
        })
        return
      }
      
      // Check for server errors
      if (errorMessage.includes("500") || errorMessage.includes("Internal Server Error")) {
        sonnerToast.error("Service Unavailable", {
          description: "API key service is temporarily down. Please try again in a few minutes.",
          duration: 10000,
          action: {
            label: "Retry",
            onClick: () => setIsCreateOpen(true)
          }
        })
        return
      }
      
      // Generic error fallback
      sonnerToast.error("Failed to Create API Key", {
        description: errorMessage,
        duration: 8000,
        action: {
          label: "Try Again",
          onClick: () => setIsCreateOpen(true)
        }
      })
    },
  })

  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      if (!token) throw new Error("Not authenticated")
      return client.delete(id, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys", environment] })
      sonnerToast.success("API Key Deleted", {
        description: "The API key has been permanently removed from your account.",
        duration: 4000,
      })
    },
    onError: (err: any) => {
      console.error('deleteKey onError:', err)
      const errorMessage = err?.message || "Unknown error occurred"

      if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
        sonnerToast.error("Delete Permission Denied", {
          description: "You don't have permission to delete this API key.",
          duration: 6000,
        })
      } else if (errorMessage.includes("404") || errorMessage.includes("not found")) {
        sonnerToast.error("API Key Not Found", {
          description: "The API key you're trying to delete no longer exists.",
          duration: 6000,
        })
      } else {
        sonnerToast.error("Delete Failed", {
          description: errorMessage,
          duration: 6000,
          action: {
            label: "Try Again",
            onClick: () => queryClient.invalidateQueries({ queryKey: ["apiKeys", environment] })
          }
        })
      }
    },
  })

  const updateWebhook = useMutation({
    mutationFn: async ({ id, webhookUrl, webhookSecret }: {
      id: string
      webhookUrl?: string
      webhookSecret?: string
    }) => {
      if (!token) throw new Error("Not authenticated")
      return client.updateWebhook(id, { webhookUrl, webhookSecret }, token)
    },
    onSuccess: (updatedKey) => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys", environment] })
      sonnerToast.success("Webhook Updated", {
        description: "Webhook configuration has been updated successfully.",
        duration: 4000,
      })
    },
    onError: (err: any) => {
      console.error('updateWebhook onError:', err)
      const errorMessage = err?.message || "Unknown error occurred"

      if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
        sonnerToast.error("Update Permission Denied", {
          description: "You don't have permission to update this API key.",
          duration: 6000,
        })
      } else if (errorMessage.includes("404") || errorMessage.includes("not found")) {
        sonnerToast.error("API Key Not Found", {
          description: "The API key you're trying to update no longer exists.",
          duration: 6000,
        })
      } else {
        sonnerToast.error("Update Failed", {
          description: errorMessage,
          duration: 6000,
          action: {
            label: "Try Again",
            onClick: () => queryClient.invalidateQueries({ queryKey: ["apiKeys", environment] })
          }
        })
      }
    },
  })

  // Unsupported operations in Element Pay API: regenerate/revoke. We surface helpful errors.
  const regenerateKey = useMutation({
    mutationFn: async (_id: string) => {
      throw new Error("Regenerate is not supported; create a new key instead.")
    },
  onError: (err: any) => toast({ title: "Not supported", description: err.message, type: "destructive" }),
  })

  // Handler functions for modal actions
  const handleViewApiKey = (apiKey: ApiKey) => {
    setViewingApiKey(apiKey)
  }

  const handleEditApiKey = (apiKey: ApiKey) => {
    setEditingApiKey(apiKey)
  }

  const handleUpdateWebhook = async (apiKeyId: string, webhookUrl: string, webhookSecret: string) => {
    await updateWebhook.mutateAsync({
      id: apiKeyId,
      webhookUrl: webhookUrl || undefined,
      webhookSecret: webhookSecret || undefined
    })
    setEditingApiKey(null)
  }

  // Debug logging - moved here after all variables are declared
  console.log('EnhancedApiKeyManager render - session:', !!session)
  console.log('Token available:', !!token)
  console.log('Token preview:', token ? `${token.substring(0, 20)}...` : 'none')
  console.log('createKey.isPending:', createKey.isPending)
  console.log('createKey.isError:', createKey.isError)
  console.log('createKey.isSuccess:', createKey.isSuccess)
  console.log('newKeyForReveal:', newKeyForReveal)
  console.log('viewingApiKey:', viewingApiKey?.name)
  console.log('editingApiKey:', editingApiKey?.name)

  useEffect(() => {
    if (!token) return
    // warm cache
    queryClient.prefetchQuery({ queryKey: ["apiKeys", environment], queryFn: () => client.list(environment, token) })
  }, [token, environment, client, queryClient])

  // Invalidate queries when environment changes
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["apiKeys"] })
  }, [environment, queryClient])

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Sign in to view and manage your keys.</CardDescription>
        </CardHeader>
        <CardContent>You must be logged in.</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 rounded-lg border border-indigo-200/50 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  API Keys
                  <Badge variant="secondary" className={isSandbox ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-green-100 text-green-700 border-green-200"}>
                    {isSandbox ? 'Sandbox' : 'Live'}
                  </Badge>
                </h2>
                <p className="text-gray-600">Manage your ElementPay {isSandbox ? 'sandbox' : 'live'} integration keys</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
          
            
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New API Key
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Card className="border-none shadow-none   ">
        <CardContent className="p-0 shadow-none border-none">
          {apiKeysQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">Loading your API keys...</span>
              </div>
            </div>
          ) : apiKeysQuery.isError ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load API keys</h3>
              <p className="text-red-600 mb-4">{(apiKeysQuery.error as any)?.message || "An error occurred while loading your keys"}</p>
              <Button 
                variant="outline" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["apiKeys", environment] })}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <ApiKeyTable
              apiKeys={apiKeysQuery.data || []}
              environment={environment}
              onRegenerate={(id) => regenerateKey.mutate(id)}
              onRevoke={(id) => deleteKey.mutate(id)}
              onDelete={(id) => deleteKey.mutate(id)}
              onView={handleViewApiKey}
              onEdit={handleEditApiKey}
              isRegenerating={regenerateKey.isPending}
              isDeleting={deleteKey.isPending}
            />
          )}
        </CardContent>
      </Card>
      <CreateApiKeyDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={({ name, environment, rotate_existing, webhook_url, webhook_secret }) => {
          console.log('CreateApiKeyDialog onCreate called with:', { name, environment, rotate_existing, webhook_url, webhook_secret: webhook_secret ? '[REDACTED]' : undefined })
          console.log('createKey object:', createKey)
          console.log('createKey.mutate exists:', typeof createKey.mutate === 'function')
          console.log('About to call createKey.mutate')
          try {
            createKey.mutate({
              name,
              environment,
              rotate_existing,
              webhook_url,
              webhook_secret
            })
            console.log('createKey.mutate called successfully')
          } catch (error) {
            console.error('Error calling createKey.mutate:', error)
          }
        }}
        isCreating={createKey.isPending}
        defaultEnvironment={environment as "testnet" | "mainnet"}
      />

      <ApiKeyRevealModal
        isOpen={!!newKeyForReveal}
        onClose={() => setNewKeyForReveal(null)}
        apiKey={newKeyForReveal}
      />

      <ApiKeyViewModal
        isOpen={!!viewingApiKey}
        onClose={() => setViewingApiKey(null)}
        onEdit={handleEditApiKey}
        apiKey={viewingApiKey}
      />

      <ApiKeyEditModal
        isOpen={!!editingApiKey}
        onClose={() => setEditingApiKey(null)}
        onSave={handleUpdateWebhook}
        apiKey={editingApiKey}
        isLoading={updateWebhook.isPending}
      />
    </div>
  )
}
