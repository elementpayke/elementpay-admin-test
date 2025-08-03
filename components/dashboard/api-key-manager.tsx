"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ApiKeyTable } from "./api-key-table"
import { CreateApiKeyDialog } from "./create-api-key-dialog"
import type { ApiKey } from "@/lib/types"

export default function ApiKeyManager() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const {
    data: apiKeys,
    isLoading,
    isError,
    error,
  } = useQuery<ApiKey[], Error>({
    queryKey: ["apiKeys"],
    queryFn: async () => {
      const response = await fetch("/api/keys")
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch API keys")
      }
      return response.json()
    },
  })

  const createApiKeyMutation = useMutation<ApiKey, Error, { name: string }>({
    mutationFn: async (newKeyData) => {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newKeyData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create API key")
      }
      return response.json()
    },
    onSuccess: (newKey) => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] })
      toast({
        title: "API Key Created",
        description: `New key "${newKey.name}" generated successfully.`,
      })
      setIsCreateDialogOpen(false)
    },
    onError: (error) => {
      toast({
        title: "Error creating API Key",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const regenerateApiKeyMutation = useMutation<ApiKey, Error, string>({
    mutationFn: async (id) => {
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
        description: `Key "${regeneratedKey.name}" regenerated successfully.`,
      })
    },
    onError: (error) => {
      toast({
        title: "Error regenerating API Key",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const deleteApiKeyMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
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
        description: "The API key has been successfully deleted.",
      })
    },
    onError: (error) => {
      toast({
        title: "Error deleting API Key",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage your API keys here.</CardDescription>
        </CardHeader>
        <CardContent>Loading API keys...</CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage your API keys here.</CardDescription>
        </CardHeader>
        <CardContent className="text-destructive">Error: {error?.message || "Failed to load API keys."}</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage your API keys here.</CardDescription>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>Create New Key</Button>
      </CardHeader>
      <CardContent>
        <ApiKeyTable
          apiKeys={apiKeys || []}
          onRegenerate={regenerateApiKeyMutation.mutate}
          onDelete={deleteApiKeyMutation.mutate}
          isRegenerating={regenerateApiKeyMutation.isPending}
          isDeleting={deleteApiKeyMutation.isPending}
        />
      </CardContent>
      <CreateApiKeyDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreate={createApiKeyMutation.mutate}
        isCreating={createApiKeyMutation.isPending}
      />
    </Card>
  )
}
