'use client'

import React, { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEnvironment } from '@/hooks/use-environment'
import { Environment } from '@/lib/api-config'
import EnvironmentSwitchModal from '@/components/auth/environment-switch-modal'
import { TestTube, Globe, ChevronDown, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnvironmentBadgeDropdownProps {
  className?: string
}

export default function EnvironmentBadgeDropdown({ className }: EnvironmentBadgeDropdownProps) {
  const { environment, isSandbox, isLive } = useEnvironment()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [targetEnvironment, setTargetEnvironment] = useState<Environment>('sandbox')

  const handleSwitchEnvironment = (targetEnv: Environment) => {
    setTargetEnvironment(targetEnv)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
  }

  const handleSwitchSuccess = () => {
    // Optional: Add any additional success handling here
  }

  return (
    <>
      <DropdownMenu >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'h-8 px-2 hover:bg-transparent focus-visible:ring-1 focus-visible:ring-ring',
              className
            )}
          >
            <Badge
              variant="secondary"
              className={cn(
                'flex items-center gap-1 font-medium border transition-colors',
                isSandbox
                  ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
                  : 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
              )}
            >
              {isSandbox ? (
                <TestTube className="w-3 h-3" />
              ) : (
                <Globe className="w-3 h-3" />
              )}
              <span className="text-xs">
                {isSandbox ? 'Sandbox' : 'Live'}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </Badge>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Current Environment
          </DropdownMenuLabel>
          
          <div className="px-2 py-1">
            <div
              className={cn(
                'flex items-center gap-2 p-2 rounded-md text-sm',
                isSandbox
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-green-50 text-green-800 border border-green-200'
              )}
            >
              {isSandbox ? (
                <TestTube className="w-4 h-4" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              <div className="flex-1">
                <div className="font-medium">
                  {isSandbox ? 'Sandbox' : 'Live'}
                </div>
                <div className="text-xs opacity-80">
                  {isSandbox ? 'Testing Environment' : 'Production Environment'}
                </div>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Switch Environment
          </DropdownMenuLabel>

          {isSandbox ? (
            <DropdownMenuItem
              onClick={() => handleSwitchEnvironment('live')}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                <Globe className="w-4 h-4 text-green-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Switch to Live</div>
                  <div className="text-xs text-muted-foreground">
                    Production environment
                  </div>
                </div>
                <RefreshCw className="w-3 h-3 opacity-50" />
              </div>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => handleSwitchEnvironment('sandbox')}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                <TestTube className="w-4 h-4 text-blue-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Switch to Sandbox</div>
                  <div className="text-xs text-muted-foreground">
                    Testing environment
                  </div>
                </div>
                <RefreshCw className="w-3 h-3 opacity-50" />
              </div>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <div className="px-2 py-1">
            <div className="text-xs text-muted-foreground">
              <p className="leading-relaxed">
                {isSandbox
                  ? 'You are currently using the sandbox environment for testing and development.'
                  : 'You are currently using the live production environment.'}
              </p>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Environment Switch Modal */}
      <EnvironmentSwitchModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        targetEnvironment={targetEnvironment}
        onSuccess={handleSwitchSuccess}
      />
    </>
  )
}
