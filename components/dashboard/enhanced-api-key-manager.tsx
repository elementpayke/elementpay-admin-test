"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useElementPayAuth } from "@/components/providers/elementpay-auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, TestTube } from "lucide-react"
import { ApiKeyTable } from "./enhanced-api-key-table"
import { CreateApiKeyDialog } from "./enhanced-create-api-key-dialog"
import type { ApiKey, Environment } from "@/lib/types"

export default function EnhancedApiKeyManager() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { tokens } = useElementPayAuth()
  // For now, only support testnet
  const [currentEnvironment] = useState<Environment>("testnet")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const {
    data: apiKeys = [],
    isLoading,
    isError,
    error,
  } = useQuery<ApiKey[], Error>({
    queryKey: ["apiKeys", currentEnvironment],
    queryFn: async () => {
      if (!tokens?.access_token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch(`/api/keys?environment=${currentEnvironment}`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch API keys")
      }
      return response.json()
    },
    enabled: !!tokens?.access_token, // Only run query if we have a token
  })

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; environment: Environment }) => {
      if (!tokens?.access_token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create API key")
      }
      return response.json()
    },
    onSuccess: (newKey) => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] })
      setIsCreateDialogOpen(false)
      toast({
        title: "API Key Created",
        description: `"${newKey.name}" has been created successfully.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        type: "destructive",
      })
    },
  })

  const regenerateMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tokens?.access_token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch(`/api/keys/${id}/regenerate`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to regenerate API key")
      }
      return response.json()
    },
    onSuccess: (regeneratedKey) => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] })
      toast({
        title: "API Key Regenerated",
        description: `"${regeneratedKey.name}" has been regenerated successfully.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        type: "destructive",
      })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tokens?.access_token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch(`/api/keys/${id}/revoke`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to revoke API key")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] })
      toast({
        title: "API Key Revoked",
        description: "The API key has been revoked successfully.",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        type: "destructive",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tokens?.access_token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch(`/api/keys/${id}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete API key")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] })
      toast({
        title: "API Key Deleted",
        description: "The API key has been deleted permanently.",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        type: "destructive",
      })
    },
  })

  const handleEnvironmentChange = (environment: Environment) => {
    // For now, we only support testnet, so this is a no-op
    console.log("Environment change requested, but only testnet is supported:", environment)
  }

  const handleCreateKey = (data: { name: string; environment: Environment }) => {
    // Force testnet environment
    createMutation.mutate({ ...data, environment: "testnet" })
  }

  const handleRegenerateKey = (id: string) => {
    regenerateMutation.mutate(id)
  }

  const handleRevokeKey = (id: string) => {
    revokeMutation.mutate(id)
  }

  const handleDeleteKey = (id: string) => {
    deleteMutation.mutate(id)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Loading your API keys...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Failed to load API keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            <p>{error?.message || "An error occurred while loading your API keys."}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              API Key Management (Testnet)
            </CardTitle>
            <CardDescription>
              Manage your API keys for Element Pay sandbox environment. Only testnet keys are currently supported.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Testnet API Key
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ApiKeyTable
          apiKeys={apiKeys}
          environment={currentEnvironment}
          onRegenerate={handleRegenerateKey}
          onRevoke={handleRevokeKey}
          onDelete={handleDeleteKey}
          isRegenerating={regenerateMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />

        <CreateApiKeyDialog
          isOpen={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreate={handleCreateKey}
          isCreating={createMutation.isPending}
          defaultEnvironment={currentEnvironment}
        />
      </CardContent>
    </Card>
  )
}
