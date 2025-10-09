"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Globe,
  TestTube,
  Zap,
  Globe2,
  Eye,
  EyeOff,
  Check,
  X,
  Mail,
  Phone,
  Building,
  Copy,
  Shield,
  AlertTriangle,
} from "lucide-react";
import type { Environment } from "@/lib/types";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useEnvironment } from "@/hooks/use-environment";

interface CreateApiKeyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    name: string;
    environment: Environment;
    rotate_existing?: boolean;
    webhook_url?: string;
    webhook_secret?: string;
  }) => void;
  isCreating: boolean;
  defaultEnvironment?: Environment;
}

type ApiType = "rest" | "websocket";

// Password strength checker
function calculatePasswordStrength(password: string): {
  score: number;
  feedback: string[];
  color: string;
} {
  if (!password) return { score: 0, feedback: [], color: "bg-gray-200" };

  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 8) {
    score += 25;
  } else {
    feedback.push("At least 8 characters");
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 25;
  } else {
    feedback.push("One uppercase letter");
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 25;
  } else {
    feedback.push("One lowercase letter");
  }

  // Number or special character check
  if (/[0-9!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 25;
  } else {
    feedback.push("One number or special character");
  }

  let color = "bg-red-500";
  if (score >= 75) color = "bg-green-500";
  else if (score >= 50) color = "bg-yellow-500";
  else if (score >= 25) color = "bg-orange-500";

  return { score, feedback, color };
}

export function CreateApiKeyDialog({
  isOpen,
  onOpenChange,
  onCreate,
  isCreating,
  defaultEnvironment = "testnet",
}: CreateApiKeyDialogProps) {
  const [keyName, setKeyName] = useState("");
  const [apiType, setApiType] = useState<ApiType>("rest");
  const [enableWebhook, setEnableWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [rotateExisting, setRotateExisting] = useState(false);

  // Get current environment and user profile
  const { environment: currentEnvironment } = useEnvironment();
  const {
    userProfile,
    isKycVerified,
    canCreateLiveApiKeys,
    isLoading: profileLoading,
  } = useUserProfile();

  const environment: Environment =
    currentEnvironment === "live" ? "mainnet" : "testnet";

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    return calculatePasswordStrength(webhookSecret);
  }, [webhookSecret]);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setKeyName("");
      setApiType("rest");
      setEnableWebhook(false);
      setWebhookUrl("");
      setWebhookSecret("");
      setShowWebhookSecret(false);
      setRotateExisting(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    console.log("CreateApiKeyDialog handleSubmit called");
    e.preventDefault();

    if (!keyName.trim()) {
      console.log("keyName is empty, not calling onCreate");
      return;
    }

    // Validate webhook fields if webhook URL is provided
    if (webhookUrl.trim()) {
      if (!webhookSecret.trim()) {
        console.log("webhook secret is required when webhook URL is provided");
        return;
      }
      if (passwordStrength.score < 75) {
        console.log("webhook secret is not strong enough");
        return;
      }
    }

    const createData = {
      name: keyName.trim(),
      environment,
      rotate_existing: rotateExisting,
      ...(webhookUrl.trim() && { webhook_url: webhookUrl.trim() }),
      ...(webhookSecret.trim() && { webhook_secret: webhookSecret.trim() }),
    };

    console.log("Calling onCreate with:", createData);
    onCreate(createData);
  };

  // Form validation
  const isFormValid = useMemo(() => {
    if (!keyName.trim()) return false;

    if (webhookUrl.trim()) {
      if (!webhookSecret.trim() || passwordStrength.score < 75) return false;
    }

    return true;
  }, [keyName, webhookUrl, webhookSecret, passwordStrength.score]);

  // Check if user is in live/mainnet environment
  const isLiveEnvironment = environment === "mainnet";

  // Determine if user can create API keys in current environment
  const canCreateApiKey = isLiveEnvironment ? canCreateLiveApiKeys : true;
  const showKycRequirement = isLiveEnvironment && !canCreateLiveApiKeys;

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if you have one
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showKycRequirement
              ? "KYC Verification Required"
              : isLiveEnvironment && canCreateApiKey
              ? "Create Live API Key"
              : "Create New API Key"}
          </DialogTitle>
          <DialogDescription>
            {showKycRequirement
              ? "To create API keys for ElementPay's live production environment, you need to complete KYC verification first."
              : isLiveEnvironment && canCreateApiKey
              ? "Create a new API key for ElementPay's live production environment."
              : "Create a new API key for ElementPay sandbox environment. Choose between REST API or WebSocket connections."}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state */}
        {profileLoading && isLiveEnvironment && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">
                Checking KYC status...
              </span>
            </div>
          </div>
        )}

        {/* KYC Verification Required */}
        {showKycRequirement && !profileLoading ? (
          <div className="grid gap-6 py-4 px-2">
            {/* KYC Status Display */}
            <div className="space-y-3">
              <Label>Current Status</Label>
              <div className="flex items-center space-x-3 border rounded-lg p-4 bg-orange-50 dark:bg-orange-950/20">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="font-medium">KYC Verification Pending</div>
                    <p className="text-sm text-muted-foreground">
                      Identity verification required for live environment
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-orange-600 text-white"
                  >
                    Pending
                  </Badge>
                </div>
              </div>
            </div>

            {/* KYC Requirements */}
            <div className="space-y-4 border rounded-lg p-6 bg-orange-50/50 dark:bg-orange-950/10">
              <div className="flex items-center space-x-3">
                <Building className="h-6 w-6 text-orange-600" />
                <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                  Production Access Required
                </h3>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300">
                To access ElementPay's live production environment, we need to
                complete a verification process that includes:
              </p>

              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Identity verification (KYC documents)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Business information and compliance details</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Integration review and security assessment</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Risk management and transaction limits setup</span>
                </li>
              </ul>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 border rounded-lg p-6 bg-blue-50/50 dark:bg-blue-950/10">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                Get Started Today
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Ready to go live? Contact our team to begin the verification
                process:
              </p>

              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">Email Support</p>
                    <a
                      href="mailto:support@elementpay.net?subject=Production API Access Request&body=Hi ElementPay Team,%0D%0A%0D%0AI would like to request access to the production environment for API key creation. Please let me know what information and documents you need to get started with the KYC process.%0D%0A%0D%0AThank you!"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      support@elementpay.net
                    </a>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">Phone Support</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        (+254) 712 531 490
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => copyToClipboard("+254712531490")}
                        title="Copy phone number"
                      >
                        <Copy className="h-3 w-3 text-gray-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> The verification process typically
                  takes 2-3 business days. You can continue using the sandbox
                  environment for development and testing.
                </p>
              </div>
            </div>
          </div>
        ) : isLiveEnvironment && canCreateApiKey ? (
          // Live Environment - KYC Verified - Show API Key Creation Form
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 py-4 px-2">
              {/* KYC Verified Status */}
              <div className="space-y-3">
                <Label>Verification Status</Label>
                <div className="flex items-center space-x-3 border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
                  <Shield className="h-5 w-5 text-green-600" />
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="font-medium">KYC Verified</div>
                      <p className="text-sm text-muted-foreground">
                        You can create live production API keys
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-green-600 text-white"
                    >
                      Verified
                    </Badge>
                  </div>
                </div>
              </div>

              {/* API Key Name */}
              <div className="space-y-3">
                <Label htmlFor="name">API Key Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production App Key, Live API"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="col-span-3"
                />
              </div>

              {/* WebSocket Configuration */}
              <div className="space-y-4 border rounded-lg p-4 bg-green-50/50 dark:bg-green-950/10">
                <h3>Webhook Configuration (Optional)</h3>

                <div className="space-y-4 border-t pt-4">
                  {/* Rotate Existing Option */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="rotate"
                      checked={rotateExisting}
                      onCheckedChange={setRotateExisting}
                      className="data-[state=checked]:bg-green-600"
                    />
                    <Label htmlFor="rotate" className="text-sm">
                      Rotate existing key if one exists
                    </Label>
                  </div>

                  {/* Webhook URL */}
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl" className="text-sm font-medium">
                      Webhook URL <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="webhookUrl"
                      type="url"
                      placeholder="https://example.com/webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className={
                        enableWebhook && !webhookUrl.trim()
                          ? "border-red-300"
                          : ""
                      }
                    />
                  </div>

                  {/* Webhook Secret */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="webhookSecret"
                      className="text-sm font-medium"
                    >
                      Webhook Secret <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="webhookSecret"
                        type={showWebhookSecret ? "text" : "password"}
                        placeholder="Enter a strong secret"
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        className={
                          enableWebhook &&
                          (!webhookSecret.trim() || passwordStrength.score < 75)
                            ? "border-red-300 pr-10"
                            : "pr-10"
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      >
                        {showWebhookSecret ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>

                    {/* Password Strength Indicator */}
                    {webhookSecret && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">
                            Password Strength
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              passwordStrength.score >= 75
                                ? "text-green-600"
                                : passwordStrength.score >= 50
                                ? "text-yellow-600"
                                : passwordStrength.score >= 25
                                ? "text-orange-600"
                                : "text-red-600"
                            }`}
                          >
                            {passwordStrength.score >= 75
                              ? "Strong"
                              : passwordStrength.score >= 50
                              ? "Good"
                              : passwordStrength.score >= 25
                              ? "Fair"
                              : "Weak"}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.score}%` }}
                          />
                        </div>
                        {passwordStrength.feedback.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-gray-600">
                              Requirements:
                            </p>
                            <ul className="space-y-1">
                              {passwordStrength.feedback.map((item, index) => (
                                <li
                                  key={index}
                                  className="flex items-center space-x-2 text-xs"
                                >
                                  <X className="h-3 w-3 text-red-500" />
                                  <span className="text-red-600">{item}</span>
                                </li>
                              ))}
                              {/* Show completed requirements */}
                              {webhookSecret.length >= 8 && (
                                <li className="flex items-center space-x-2 text-xs">
                                  <Check className="h-3 w-3 text-green-500" />
                                  <span className="text-green-600">
                                    At least 8 characters
                                  </span>
                                </li>
                              )}
                              {/[A-Z]/.test(webhookSecret) && (
                                <li className="flex items-center space-x-2 text-xs">
                                  <Check className="h-3 w-3 text-green-500" />
                                  <span className="text-green-600">
                                    One uppercase letter
                                  </span>
                                </li>
                              )}
                              {/[a-z]/.test(webhookSecret) && (
                                <li className="flex items-center space-x-2 text-xs">
                                  <Check className="h-3 w-3 text-green-500" />
                                  <span className="text-green-600">
                                    One lowercase letter
                                  </span>
                                </li>
                              )}
                              {/[0-9!@#$%^&*(),.?":{}|<>]/.test(
                                webhookSecret
                              ) && (
                                <li className="flex items-center space-x-2 text-xs">
                                  <Check className="h-3 w-3 text-green-500" />
                                  <span className="text-green-600">
                                    One number or special character
                                  </span>
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Environment */}
              <div className="space-y-3">
                <Label>Environment</Label>
                <div className="flex items-center space-x-3 border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
                  <Globe className="h-5 w-5 text-green-600" />
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="font-medium">Mainnet (Production)</div>
                      <p className="text-sm text-muted-foreground">
                        Live production environment
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-green-600 text-white"
                    >
                      Production
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This API key will work with real transactions and live data.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!isFormValid || isCreating}>
                {isCreating ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  "Create Live API Key"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          // Sandbox Environment - Regular API Key Creation Form
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 py-4 px-2 ">
              {/* API Key Name */}
              <div className="space-y-3">
                <Label htmlFor="name">API Key Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Test App Key, Development API"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="col-span-3"
                />
              </div>

              {/* WebSocket Configuration */}
              <div className="space-y-4 border rounded-lg p-4 bg-purple-50/50 dark:bg-purple-950/10">
                <h3>Webhook Configuration (Optional)</h3>

                <div className="space-y-4 border-t pt-4">
                  {/* Rotate Existing Option */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="rotate"
                      checked={rotateExisting}
                      onCheckedChange={setRotateExisting}
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="rotate" className="text-sm">
                      Rotate existing key if one exists
                    </Label>
                  </div>

                  {/* Webhook URL */}
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl" className="text-sm font-medium">
                      Webhook URL <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="webhookUrl"
                      type="url"
                      placeholder="https://example.com/webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className={
                        enableWebhook && !webhookUrl.trim()
                          ? "border-red-300"
                          : ""
                      }
                    />
                  </div>

                  {/* Webhook Secret */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="webhookSecret"
                      className="text-sm font-medium"
                    >
                      Webhook Secret <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="webhookSecret"
                        type={showWebhookSecret ? "text" : "password"}
                        placeholder="Enter a strong secret"
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        className={
                          enableWebhook &&
                          (!webhookSecret.trim() || passwordStrength.score < 75)
                            ? "border-red-300 pr-10"
                            : "pr-10"
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      >
                        {showWebhookSecret ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>

                    {/* Password Strength Indicator */}
                    {webhookSecret && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">
                            Password Strength
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              passwordStrength.score >= 75
                                ? "text-green-600"
                                : passwordStrength.score >= 50
                                ? "text-yellow-600"
                                : passwordStrength.score >= 25
                                ? "text-orange-600"
                                : "text-red-600"
                            }`}
                          >
                            {passwordStrength.score >= 75
                              ? "Strong"
                              : passwordStrength.score >= 50
                              ? "Good"
                              : passwordStrength.score >= 25
                              ? "Fair"
                              : "Weak"}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.score}%` }}
                          />
                        </div>
                        {passwordStrength.feedback.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-gray-600">
                              Requirements:
                            </p>
                            <ul className="space-y-1">
                              {passwordStrength.feedback.map((item, index) => (
                                <li
                                  key={index}
                                  className="flex items-center space-x-2 text-xs"
                                >
                                  <X className="h-3 w-3 text-red-500" />
                                  <span className="text-red-600">{item}</span>
                                </li>
                              ))}
                              {/* Show completed requirements */}
                              {webhookSecret.length >= 8 && (
                                <li className="flex items-center space-x-2 text-xs">
                                  <Check className="h-3 w-3 text-green-500" />
                                  <span className="text-green-600">
                                    At least 8 characters
                                  </span>
                                </li>
                              )}
                              {/[A-Z]/.test(webhookSecret) && (
                                <li className="flex items-center space-x-2 text-xs">
                                  <Check className="h-3 w-3 text-green-500" />
                                  <span className="text-green-600">
                                    One uppercase letter
                                  </span>
                                </li>
                              )}
                              {/[a-z]/.test(webhookSecret) && (
                                <li className="flex items-center space-x-2 text-xs">
                                  <Check className="h-3 w-3 text-green-500" />
                                  <span className="text-green-600">
                                    One lowercase letter
                                  </span>
                                </li>
                              )}
                              {/[0-9!@#$%^&*(),.?":{}|<>]/.test(
                                webhookSecret
                              ) && (
                                <li className="flex items-center space-x-2 text-xs">
                                  <Check className="h-3 w-3 text-green-500" />
                                  <span className="text-green-600">
                                    One number or special character
                                  </span>
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Environment */}
              <div className="space-y-3">
                <Label>Environment</Label>
                <div className="flex items-center space-x-3 border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                  <TestTube className="h-5 w-5 text-blue-600" />
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="font-medium">Testnet (Sandbox)</div>
                      <p className="text-sm text-muted-foreground">
                        Development and testing environment
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-blue-600 text-white"
                    >
                      Sandbox
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Perfect for development and testing. Switch to production when
                  you're ready to go live.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!isFormValid || isCreating}>
                {isCreating ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  `Create ${
                    apiType === "websocket" ? "WebSocket" : "REST"
                  } API Key`
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Footer for KYC Required */}
        {showKycRequirement && !profileLoading && (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                // Open email client or copy email
                window.location.href =
                  "mailto:support@elementpay.net?subject=Production API Access Request&body=Hi ElementPay Team,%0D%0A%0D%0AI would like to request access to the production environment for API key creation. Please let me know what information and documents you need to get started with the KYC process.%0D%0A%0D%0AThank you!";
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
