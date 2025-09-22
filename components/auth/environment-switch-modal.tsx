'use client'

import React, { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EnvironmentIndicator } from '@/components/ui/environment-toggle'
import { useEnvironment } from '@/hooks/use-environment'
import { Environment } from '@/lib/api-config'
import { toast as sonnerToast } from 'sonner'
import { Loader2, ArrowRight, X } from 'lucide-react'

interface EnvironmentSwitchModalProps {
  isOpen: boolean
  onClose: () => void
  targetEnvironment: Environment
  onSuccess?: () => void
}

export default function EnvironmentSwitchModal({
  isOpen,
  onClose,
  targetEnvironment,
  onSuccess
}: EnvironmentSwitchModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { environment: currentEnvironment, switchEnvironment } = useEnvironment()

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('')
      setPassword('')
      setIsLoading(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Basic validation
    if (!email.trim() || !password.trim()) {
      sonnerToast.error('Missing Information', {
        description: 'Please enter both email and password.',
        duration: 4000,
      })
      setIsLoading(false)
      return
    }

    // Store the original environment in case we need to revert
    const originalEnvironment = currentEnvironment

    try {
      // Immediately switch to the target environment (optimistic update)
      await switchEnvironment(targetEnvironment)

      // Show loading toast
      const loadingToast = sonnerToast.loading('Switching Environment...', {
        description: `Authenticating with ${targetEnvironment} environment.`,
      })

      const result = await signIn('credentials', {
        redirect: false,
        email: email.trim().toLowerCase(),
        password: password.trim(),
        sandbox: targetEnvironment === 'sandbox' ? 'true' : 'false',
      })

      // Dismiss loading toast
      sonnerToast.dismiss(loadingToast)

      if (result?.error) {
        // Revert environment on authentication failure
        await switchEnvironment(originalEnvironment)

        // Handle specific error cases
        if (result.error.includes('Email not verified') || result.error.includes('verification')) {
          sonnerToast.error('Email Not Verified', {
            description: 'Please check your email for a verification code.',
            duration: 6000,
          })
          onClose()
          router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim())}`)
        } else if (result.error.includes('Invalid email or password')) {
          sonnerToast.error('Invalid Credentials', {
            description: `Please check your credentials for the ${targetEnvironment} environment.`,
            duration: 5000,
          })
        } else if (result.error.includes('Too many')) {
          sonnerToast.error('Rate Limited', {
            description: 'Too many login attempts. Please try again in a few minutes.',
            duration: 8000,
          })
        } else {
          sonnerToast.error('Authentication Failed', {
            description: result.error,
            duration: 6000,
          })
        }
      } else if (result?.ok) {
        sonnerToast.success('Environment Switch Successful', {
          description: `Successfully switched to ${targetEnvironment} environment.`,
          duration: 3000,
        })

        onSuccess?.()
        onClose()
      } else {
        // Revert environment on unexpected failure
        await switchEnvironment(originalEnvironment)

        sonnerToast.error('Authentication Failed', {
          description: 'An unexpected error occurred. Please try again.',
          duration: 5000,
        })
      }
    } catch (error: any) {
      // Revert environment on any error
      try {
        await switchEnvironment(originalEnvironment)
      } catch (revertError) {
        console.error('Failed to revert environment:', revertError)
      }

      console.error('Environment switch error:', error)
      sonnerToast.dismiss()
      sonnerToast.error('Connection Error', {
        description: 'Unable to connect to authentication service. Please check your internet connection.',
        duration: 8000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-xl font-semibold">
                Switch to {targetEnvironment === 'sandbox' ? 'Sandbox' : 'Live'}
              </DialogTitle>
              <DialogDescription>
                Enter your credentials for the {targetEnvironment} environment to switch.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isLoading}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current vs Target Environment */}
          <div className="flex items-center justify-center space-x-4 py-3 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Current</p>
              <EnvironmentIndicator showIcon={true} showLabel={true} />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Switch to</p>
              <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                targetEnvironment === 'sandbox' 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-green-100 text-green-800 border border-green-200'
              }`}>
                {targetEnvironment === 'sandbox' ? (
                  <>🧪 Sandbox</>
                ) : (
                  <>🌐 Live</>
                )}
              </div>
            </div>
          </div>

          {/* Environment-specific info */}
          {targetEnvironment === 'sandbox' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-sm text-blue-700 font-medium mb-1">Switching to Sandbox</p>
              <p className="text-xs text-blue-600">
                Use your sandbox account credentials to access the testing environment.
              </p>
            </div>
          )}

          {targetEnvironment === 'live' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-sm text-green-700 font-medium mb-1">Switching to Live</p>
              <p className="text-xs text-green-600">
                Use your production account credentials to access the live environment.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="switch-email">Email</Label>
              <Input
                id="switch-email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="switch-password">Password</Label>
              <Input
                id="switch-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            
            <div className="flex space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className={`flex-1 ${
                  targetEnvironment === 'sandbox'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Switching...
                  </>
                ) : (
                  <>
                    Switch to {targetEnvironment === 'sandbox' ? 'Sandbox' : 'Live'}
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="text-center text-xs text-muted-foreground">
            <p>
              Don't have an account for this environment?{' '}
              <Button
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => {
                  onClose()
                  router.push(`/auth/signup${targetEnvironment === 'sandbox' ? '?sandbox=true' : ''}`)
                }}
                disabled={isLoading}
              >
                Sign up here
              </Button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
