"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { EnvironmentToggle } from "./environment-toggle"
import { ApiKeyTable } from "./enhanced-api-key-table"
import { CreateApiKeyDialog } from "./enhanced-create-api-key-dialog"
import type { ApiKey, Environment } from "@/lib/types"

export default function EnhancedApiKeyManager() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment>("testnet")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const {
    data: apiKeys = [],
    isLoading,
    isError,
    error,
  } = useQuery<ApiKey[], Error>({
    queryKey: ["apiKeys", currentEnvironment],
    queryFn: async () => {
      const response = await fetch(`/api/keys?environment=${currentEnvironment}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch API keys")
      }
      return response.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; environment: Environment }) => {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const response = await fetch(`/api/keys/${id}/regenerate`, {
        method: "POST",
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
      const response = await fetch(`/api/keys/${id}/revoke`, {
        method: "POST",
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
      const response = await fetch(`/api/keys/${id}`, {
        method: "DELETE",
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
    setCurrentEnvironment(environment)
  }

  const handleCreateKey = (data: { name: string; environment: Environment }) => {
    createMutation.mutate(data)
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
              API Key Management
            </CardTitle>
            <CardDescription>
              Manage your API keys for different environments. {currentEnvironment === "mainnet" ? "Production" : "Sandbox"} keys are currently shown.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <EnvironmentToggle
              currentEnvironment={currentEnvironment}
              onEnvironmentChange={handleEnvironmentChange}
            />
            <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create API Key
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
