"use client";

import React, { useState } from 'react';
import AppHeader from '@/components/app-header';
import AppFooter from '@/components/app-footer';
import AllocationForm from '@/components/allocation-form';
import AllocationResultsDisplay from '@/components/allocation-results-display';
import { processAllocationAction } from './actions';
import type { AllocationFormValues, AllocationResult } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function HomePage() {
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAllocate = async (formData: AllocationFormValues) => {
    setIsLoading(true);
    setAllocationResult(null);
    try {
      const result = await processAllocationAction(formData);
      setAllocationResult(result);
      toast({
        title: "Allocation Successful",
        description: "Halls have been allocated and analyzed.",
        variant: "default",
      });
    } catch (error) {
      console.error("Allocation failed:", error);
      let errorMessage = "Failed to allocate halls.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Allocation Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAllocationResult(null);
    // Form state is managed within AllocationForm, so it will reset on re-mount or via its own key prop if needed.
    // For this setup, just clearing the result is enough to show the form again.
    toast({
        title: "Form Reset",
        description: "Ready for new allocation.",
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Card className="w-full max-w-4xl mx-auto shadow-2xl rounded-lg overflow-hidden">
          <CardHeader className="bg-card-foreground/5 p-6">
            <CardTitle className="font-headline text-3xl text-center text-primary">
              Exam Hall Allocation System
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground mt-1">
              Efficiently assign students to examination halls and get AI-powered analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            {!allocationResult ? (
              <AllocationForm onSubmit={handleAllocate} isLoading={isLoading} />
            ) : (
              <AllocationResultsDisplay result={allocationResult} onReset={handleReset} />
            )}
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}
