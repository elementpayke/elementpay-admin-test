"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { apiKeysClient } from "@/lib/api-keys-client"
import type { ApiKey, Environment } from "@/lib/types"
import { CreateApiKeyDialog } from "./enhanced-create-api-key-dialog"
import { ApiKeyTable } from "./enhanced-api-key-table"
import { ApiKeyRevealModal } from "./api-key-reveal-modal"

export default function EnhancedApiKeyManager() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const client = useMemo(() => apiKeysClient(), [])
  const token = session?.elementPayToken as string | undefined

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newKeyForReveal, setNewKeyForReveal] = useState<{
    name: string
    key: string
    environment: string
  } | null>(null)

  // Only sandbox/testnet is supported for now
  const environment: Environment = "testnet"

  const apiKeysQuery = useQuery<ApiKey[]>({
    queryKey: ["apiKeys", environment],
    enabled: !!token,
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated")
      return client.list(environment, token)
    },
  })

  const createKey = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      console.log('createKey mutation starting with name:', name)
      if (!token) {
        console.error('No token available')
        throw new Error("Not authenticated")
      }
      console.log('Token available, calling client.create')
      try {
        const result = await client.create({ name, environment }, token)
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
        toast({ 
          title: "API key created", 
          description: "API key was created but details couldn't be loaded for display.",
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
      }
      console.log('Setting newKeyForReveal to:', JSON.stringify(keyForReveal, null, 2))
      setNewKeyForReveal(keyForReveal)
      setIsCreateOpen(false)
      toast({ title: "API key created", description: `"${created.name}" generated.` })
    },
    onError: (err: any) => {
      console.error('createKey onError:', err)
      console.error('Error details:', { message: err?.message, stack: err?.stack, cause: err?.cause })
      toast({ 
        title: "Create failed", 
        description: err?.message || "Unknown error"
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
      toast({ title: "Deleted", description: "API key removed." })
    },
    onError: (err: any) => {
  toast({ title: "Delete failed", description: err?.message || "Unknown error", type: "destructive" })
    },
  })

  // Unsupported operations in Element Pay API: regenerate/revoke. We surface helpful errors.
  const regenerateKey = useMutation({
    mutationFn: async (_id: string) => {
      throw new Error("Regenerate is not supported; create a new key instead.")
    },
  onError: (err: any) => toast({ title: "Not supported", description: err.message, type: "destructive" }),
  })

  // Debug logging - moved here after all variables are declared
  console.log('EnhancedApiKeyManager render - session:', !!session)
  console.log('Token available:', !!token)
  console.log('Token preview:', token ? `${token.substring(0, 20)}...` : 'none')
  console.log('createKey.isPending:', createKey.isPending)
  console.log('createKey.isError:', createKey.isError)
  console.log('createKey.isSuccess:', createKey.isSuccess)
  console.log('newKeyForReveal:', newKeyForReveal)

  useEffect(() => {
    if (!token) return
    // warm cache
    queryClient.prefetchQuery({ queryKey: ["apiKeys", environment], queryFn: () => client.list(environment, token) })
  }, [token, environment, client, queryClient])

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">API Keys <Badge variant="secondary">Sandbox</Badge></CardTitle>
          <CardDescription>Manage your Element Pay sandbox keys.</CardDescription>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>Create API Key</Button>
      </CardHeader>
      <CardContent>
        {apiKeysQuery.isLoading ? (
          <div>Loading keys…</div>
        ) : apiKeysQuery.isError ? (
          <div className="text-destructive">{(apiKeysQuery.error as any)?.message || "Failed to load keys"}</div>
        ) : (
          <ApiKeyTable
            apiKeys={apiKeysQuery.data || []}
            environment={environment}
            onRegenerate={(id) => regenerateKey.mutate(id)}
            onRevoke={(id) => deleteKey.mutate(id)}
            onDelete={(id) => deleteKey.mutate(id)}
            isRegenerating={regenerateKey.isPending}
            isDeleting={deleteKey.isPending}
          />
        )}
      </CardContent>

      <CreateApiKeyDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={({ name }) => {
          console.log('CreateApiKeyDialog onCreate called with name:', name)
          console.log('createKey object:', createKey)
          console.log('createKey.mutate exists:', typeof createKey.mutate === 'function')
          console.log('About to call createKey.mutate')
          try {
            createKey.mutate({ name })
            console.log('createKey.mutate called successfully')
          } catch (error) {
            console.error('Error calling createKey.mutate:', error)
          }
        }}
        isCreating={createKey.isPending}
        defaultEnvironment={environment}
      />

      <ApiKeyRevealModal
        isOpen={!!newKeyForReveal}
        onClose={() => setNewKeyForReveal(null)}
        apiKey={newKeyForReveal}
      />
    </Card>
  )
}
