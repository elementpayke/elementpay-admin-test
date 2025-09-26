'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useEnvironment } from '@/hooks/use-environment'
import { Environment } from '@/lib/api-config'
import { Loader2, TestTube, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnvironmentToggleProps {
  variant?: 'buttons' | 'switch' | 'badge-buttons'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showLabels?: boolean
  showIcons?: boolean
  disabled?: boolean
  onEnvironmentChange?: (environment: Environment) => void
}

export function EnvironmentToggle({
  variant = 'buttons',
  size = 'md',
  className,
  showLabels = true,
  showIcons = true,
  disabled = false,
  onEnvironmentChange,
}: EnvironmentToggleProps) {
  const { 
    environment, 
    isLoading, 
    isSandbox, 
    isLive, 
    switchToSandbox, 
    switchToLive 
  } = useEnvironment()

  const handleEnvironmentChange = async (newEnv: Environment) => {
    if (disabled || isLoading) return

    try {
      if (newEnv === 'sandbox') {
        // add params to the url
        window.history.pushState({}, '', `?sandbox=true`)
        await switchToSandbox()
      } else {
        window.history.pushState({}, '', `?sandbox=false`)
        await switchToLive()
      }
      onEnvironmentChange?.(newEnv)
    } catch (error) {
      console.error('Failed to switch environment:', error)
    }
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2'
  }

  if (variant === 'switch') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        {showLabels && (
          <Label htmlFor="env-switch" className="text-sm font-medium">
            {showIcons && <TestTube className="w-4 h-4 inline mr-1" />}
            Sandbox
          </Label>
        )}
        <Switch
          id="env-switch"
          checked={isLive}
          onCheckedChange={(checked) => handleEnvironmentChange(checked ? 'live' : 'sandbox')}
          disabled={disabled || isLoading}
        />
        {showLabels && (
          <Label htmlFor="env-switch" className="text-sm font-medium">
            {showIcons && <Globe className="w-4 h-4 inline mr-1" />}
            Live
          </Label>
        )}
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      </div>
    )
  }

  if (variant === 'badge-buttons') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Badge
          variant={isSandbox ? 'default' : 'outline'}
          className={cn(
            'cursor-pointer transition-all duration-200',
            sizeClasses[size],
            isSandbox 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => !disabled && handleEnvironmentChange('sandbox')}
        >
          {showIcons && <TestTube className="w-3 h-3 mr-1" />}
          {showLabels ? 'Sandbox' : 'S'}
        </Badge>
        <Badge
          variant={isLive ? 'default' : 'outline'}
          className={cn(
            'cursor-pointer transition-all duration-200',
            sizeClasses[size],
            isLive 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => !disabled && handleEnvironmentChange('live')}
        >
          {showIcons && <Globe className="w-3 h-3 mr-1" />}
          {showLabels ? 'Live' : 'L'}
        </Badge>
        {/* {isLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />} */}
      </div>
    )
  }

  // Default: buttons variant
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Button
        variant={isSandbox ? 'default' : 'outline'}
        size={size}
        onClick={() => handleEnvironmentChange('sandbox')}
        disabled={disabled || isLoading}
        className={cn(
          'transition-all duration-200',
          isSandbox 
            ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
            : 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
        )}
      >
        {isLoading && environment === 'sandbox' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {showIcons && !isLoading && <TestTube className="w-4 h-4 mr-2" />}
        {showLabels ? 'Sandbox' : 'S'}
      </Button>
      <Button
        variant={isLive ? 'default' : 'outline'}
        size={size}
        onClick={() => handleEnvironmentChange('live')}
        disabled={disabled || isLoading}
        className={cn(
          'transition-all duration-200',
          isLive 
            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
            : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
        )}
      >
        {isLoading && environment === 'live' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {showIcons && !isLoading && <Globe className="w-4 h-4 mr-2" />}
        {showLabels ? 'Live' : 'L'}
      </Button>
    </div>
  )
}

// Environment indicator component for showing current environment
export function EnvironmentIndicator({ 
  className,
  showIcon = true,
  showLabel = true 
}: { 
  className?: string
  showIcon?: boolean
  showLabel?: boolean
}) {
  const { environment, isSandbox } = useEnvironment()

  return (
    <Badge
      variant={isSandbox ? 'secondary' : 'default'}
      className={cn(
        'font-medium',
        isSandbox 
          ? 'bg-blue-100 text-blue-800 border-blue-200' 
          : 'bg-green-100 text-green-800 border-green-200',
        className
      )}
    >
      {showIcon && (
        isSandbox ? (
          <TestTube className="w-3 h-3 mr-1" />
        ) : (
          <Globe className="w-3 h-3 mr-1" />
        )
      )}
      {showLabel && (isSandbox ? 'Sandbox' : 'Live')}
    </Badge>
  )
}
