"use client"

import { useState } from "react"
import AuthGuard from "@/components/auth/auth-guard"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Shield,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  Camera,
  User,
  Car,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { KYCStatus, KYCDocument } from "@/lib/types"

// Mock KYC data
const mockKYCProfile = {
  status: "pending" as KYCStatus,
  documents: [
    {
      id: "doc_1",
      type: "national_id" as const,
      status: "approved" as const,
      file_url: "/mock-id.jpg",
      uploaded_at: "2024-01-10T10:00:00Z",
    },
    {
      id: "doc_2",
      type: "passport" as const,
      status: "pending" as const,
      file_url: "/mock-passport.jpg",
      uploaded_at: "2024-01-15T14:30:00Z",
    },
  ] as KYCDocument[],
}

const kycSteps = [
  { id: 1, title: "Personal Information", completed: true },
  { id: 2, title: "Identity Verification", completed: true },
  { id: 3, title: "Address Verification", completed: false },
  { id: 4, title: "Final Review", completed: false },
]

export default function KYCPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [selectedDocType, setSelectedDocType] = useState<string>("")
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phoneNumber: "",
    address: "",
    city: "",
    country: "Kenya",
  })

  const getStatusIcon = (status: KYCStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'under_review':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: KYCStatus) => {
    const variants = {
      approved: "default",
      under_review: "secondary",
      pending: "outline",
      rejected: "destructive",
      not_started: "secondary",
    } as const

    const colors = {
      approved: "bg-green-100 text-green-800 border-green-200",
      under_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
      pending: "bg-blue-100 text-blue-800 border-blue-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      not_started: "bg-gray-100 text-gray-800 border-gray-200",
    }

    return (
      <Badge className={colors[status]}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'national_id':
        return <User className="h-4 w-4" />
      case 'passport':
        return <FileText className="h-4 w-4" />
      case 'driving_license':
        return <Car className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Mock file upload
      toast({
        title: "Document Uploaded",
        description: `${file.name} has been uploaded successfully.`,
      })
      setIsUploadOpen(false)
    }
  }

  const handlePersonalInfoSubmit = () => {
    // Mock form submission
    toast({
      title: "Information Updated",
      description: "Your personal information has been saved.",
    })
  }

  const completedSteps = kycSteps.filter(step => step.completed).length
  const progressPercentage = (completedSteps / kycSteps.length) * 100

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">KYC Verification</h1>
              <p className="text-muted-foreground">
                Complete your identity verification to access all features.
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {getStatusIcon(mockKYCProfile.status)}
              {getStatusBadge(mockKYCProfile.status)}
            </div>
          </div>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Verification Progress</span>
              </CardTitle>
              <CardDescription>
                Complete all steps to activate your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {completedSteps} of {kycSteps.length} completed
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {kycSteps.map((step) => (
                    <div
                      key={step.id}
                      className={`p-4 border rounded-lg ${
                        step.completed
                          ? "border-green-200 bg-green-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        {step.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
                        )}
                        <span className="text-sm font-medium">Step {step.id}</span>
                      </div>
                      <div className="text-sm text-gray-700">{step.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Personal Information</span>
                </CardTitle>
                <CardDescription>
                  Provide your basic personal details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={personalInfo.firstName}
                      onChange={(e) => 
                        setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={personalInfo.lastName}
                      onChange={(e) => 
                        setPersonalInfo(prev => ({ ...prev, lastName: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={personalInfo.dateOfBirth}
                    onChange={(e) => 
                      setPersonalInfo(prev => ({ ...prev, dateOfBirth: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+254712345678"
                    value={personalInfo.phoneNumber}
                    onChange={(e) => 
                      setPersonalInfo(prev => ({ ...prev, phoneNumber: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={personalInfo.address}
                    onChange={(e) => 
                      setPersonalInfo(prev => ({ ...prev, address: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Nairobi"
                      value={personalInfo.city}
                      onChange={(e) => 
                        setPersonalInfo(prev => ({ ...prev, city: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={personalInfo.country}
                      onValueChange={(value) => 
                        setPersonalInfo(prev => ({ ...prev, country: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kenya">Kenya</SelectItem>
                        <SelectItem value="Uganda">Uganda</SelectItem>
                        <SelectItem value="Tanzania">Tanzania</SelectItem>
                        <SelectItem value="Rwanda">Rwanda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handlePersonalInfoSubmit} className="w-full">
                  Save Information
                </Button>
              </CardContent>
            </Card>

            {/* Document Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Identity Documents</span>
                </CardTitle>
                <CardDescription>
                  Upload your identity verification documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Uploaded Documents */}
                <div className="space-y-3">
                  {mockKYCProfile.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getDocumentIcon(doc.type)}
                        <div>
                          <div className="font-medium capitalize">
                            {doc.type.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(doc.status as any)}
                        {getStatusBadge(doc.status as any)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upload New Document */}
                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Identity Document</DialogTitle>
                      <DialogDescription>
                        Select the document type and upload a clear photo or scan.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Document Type</Label>
                        <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="national_id">National ID</SelectItem>
                            <SelectItem value="passport">Passport</SelectItem>
                            <SelectItem value="driving_license">Driving License</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Upload File</Label>
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileUpload}
                          disabled={!selectedDocType}
                        />
                        <div className="text-sm text-muted-foreground">
                          Accepted formats: JPG, PNG, PDF (max 5MB)
                        </div>
                      </div>

                      <Alert>
                        <Camera className="h-4 w-4" />
                        <AlertDescription>
                          Ensure the document is clearly visible with all corners shown.
                          The photo should be well-lit and in focus.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Requirements */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Document Requirements</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Valid government-issued ID</li>
                    <li>• Clear, unblurred image</li>
                    <li>• All four corners visible</li>
                    <li>• No reflections or shadows</li>
                    <li>• File size under 5MB</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Messages */}
          {mockKYCProfile.status === "under_review" && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Your documents are currently under review. This process typically takes 1-3 business days.
                You'll receive an email notification once the review is complete.
              </AlertDescription>
            </Alert>
          )}

          {mockKYCProfile.status === "rejected" && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Your KYC application was rejected. Please review the feedback and resubmit your documents.
                Contact support if you need assistance.
              </AlertDescription>
            </Alert>
          )}

          {mockKYCProfile.status === "approved" && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Congratulations! Your identity has been successfully verified. You now have access to all platform features.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
