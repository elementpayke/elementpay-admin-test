
'use client'

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import Aurora from "@/components/ui/aurora"
import { ArrowRight, Zap, Shield, Code, Globe } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 opacity-20">
        <Aurora
          colorStops={["#6366F1", "#8B5CF6", "#3B82F6"]}
          blend={0.4}
          amplitude={0.8}
          speed={0.3}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <Image src="/elementpay.png" alt="Element Pay Logo" width={40} height={40} />
          <span className="text-xl font-bold text-gray-900">ElementPay</span>
        </div>
        <Button asChild variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-full text-sm text-indigo-600 font-medium">
            <Zap className="w-4 h-4 mr-2" />
            Powering Web3 Payments
          </div>

          {/* Main Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
              Process Crypto
              <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Payments Instantly
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              The most powerful Web3 payment infrastructure. Accept cryptocurrency payments with enterprise-grade security and lightning-fast processing on our live network.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button 
              asChild 
              size="lg" 
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Link href="/auth/signup" className="flex items-center">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg"
              className="border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-8 py-4 text-lg font-semibold transition-all duration-200"
            >
              <Link href="/auth/login?sandbox=true" className="flex items-center">
                <Code className="w-5 h-5 mr-2" />
                Try Our Sandbox
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="pt-12 space-y-4">
            <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">
              Trusted by developers worldwide
            </p>
            <div className="flex items-center justify-center space-x-8 opacity-60">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-gray-600">Enterprise Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-600">Global Coverage</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium text-gray-600">Instant Settlement</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Gradient Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/60 to-white/80 pointer-events-none" />
    </div>
  )
}
