
"use client";

import React, { useRef, useState } from 'react';
import type { AllocationResult } from '@/types';
import HallCard from './hall-card';
// import AIFeedbackCard from './ai-feedback-card'; // Removed
import UnallocatedStudentsCard from './unallocated-students-card';
import { Button } from '@/components/ui/button';
import { Printer, RotateCcw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from "@/hooks/use-toast";


interface AllocationResultsDisplayProps {
  result: AllocationResult;
  onReset: () => void;
}

const AllocationResultsDisplay: React.FC<AllocationResultsDisplayProps> = ({ result, onReset }) => {
  const hallAssignmentsPdfSectionRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    const elementToCapture = hallAssignmentsPdfSectionRef.current;
    
    setIsGeneratingPdf(true);
    toast({ title: "PDF Generation", description: "Preparing to capture content...", duration: 2000 });

    await new Promise(resolve => setTimeout(resolve, 500)); 

    if (!elementToCapture) {
      toast({
        title: "PDF Generation Error",
        description: "Hall assignments content area not found.",
        variant: "destructive",
      });
      console.error("Hall assignments section element not found for PDF generation.");
      setIsGeneratingPdf(false);
      return;
    }
    
    elementToCapture.classList.add('pdf-capture-area');

    console.log('Element to capture - scrollHeight:', elementToCapture.scrollHeight);
    console.log('Element to capture - offsetHeight:', elementToCapture.offsetHeight);
    console.log('Element to capture - scrollWidth:', elementToCapture.scrollWidth);
    console.log('Element to capture - offsetWidth:', elementToCapture.offsetWidth);


    try {
      toast({ title: "PDF Generation", description: "Capturing hall assignments content...", duration: 3000 });
      
      const captureWidth = 1200; 

      const canvas = await html2canvas(elementToCapture, {
        useCORS: true,
        logging: true,
        width: captureWidth, 
        height: elementToCapture.scrollHeight,
        windowWidth: captureWidth, 
        windowHeight: elementToCapture.scrollHeight,
        scrollX: -window.scrollX, 
        scrollY: -window.scrollY,
        scale: 1,
        backgroundColor: '#FFFFFF', 
      });
      toast({ title: "PDF Generation", description: "Content captured, creating PDF pages...", duration: 3000 });

      elementToCapture.classList.remove('pdf-capture-area');

      console.log('html2canvas captured canvas dimensions (W, H):', canvas.width, canvas.height);

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const A4_PAPER_WIDTH_MM = 210;
      const A4_PAPER_HEIGHT_MM = 297;
      const margin = 10;
      const pdfUsableWidth = A4_PAPER_WIDTH_MM - 2 * margin;
      const pdfUsableHeight = A4_PAPER_HEIGHT_MM - 2 * margin;

      const canvasWidthPx = canvas.width; 
      const canvasHeightPx = canvas.height;
      
      let yOnCanvasPx = 0;
      let pageIndex = 0;

      const canvasSliceHeightPxPerPage = (pdfUsableHeight * canvasWidthPx) / pdfUsableWidth;
      console.log(`Calculated canvas slice height per PDF page (px): ${canvasSliceHeightPxPerPage}`);

      while (yOnCanvasPx < canvasHeightPx) {
        console.log(`Processing PDF Page ${pageIndex}: yOnCanvasPx = ${Math.round(yOnCanvasPx)}, canvasHeightPx = ${canvasHeightPx}`);
        if (pageIndex > 0) {
          pdf.addPage();
        }

        const remainingCanvasHeight = canvasHeightPx - yOnCanvasPx;
        const currentSliceHeightOnCanvas = Math.min(remainingCanvasHeight, canvasSliceHeightPxPerPage);

        if (currentSliceHeightOnCanvas <= 0) {
            console.warn(`Skipping PDF Page ${pageIndex} due to zero or negative slice height.`);
            break; 
        }
        console.log(`Page ${pageIndex}: currentSliceHeightOnCanvas = ${Math.round(currentSliceHeightOnCanvas)}`);
        
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasWidthPx;
        pageCanvas.height = currentSliceHeightOnCanvas;
        const pageCtx = pageCanvas.getContext('2d');

        if (!pageCtx) {
          toast({ title: "PDF Generation Error", description: "Could not create 2D context for image slice.", variant: "destructive" });
          setIsGeneratingPdf(false);
          return;
        }
        
        pageCtx.drawImage(
          canvas,
          0,                      
          yOnCanvasPx,            
          canvasWidthPx,          
          currentSliceHeightOnCanvas, 
          0,                      
          0,                      
          canvasWidthPx,          
          currentSliceHeightOnCanvas  
        );

        const pageImgData = pageCanvas.toDataURL('image/png');
        
        const renderedHeightOnPdfPage = (currentSliceHeightOnCanvas * pdfUsableWidth) / canvasWidthPx;
        
        pdf.addImage(pageImgData, 'PNG', margin, margin, pdfUsableWidth, renderedHeightOnPdfPage); 
        
        yOnCanvasPx += currentSliceHeightOnCanvas;
        pageIndex++;

        if (pageIndex > 30) { 
            console.error("PDF generation exceeded 30 pages, aborting.");
            toast({ title: "PDF Error", description: "Exceeded maximum page limit during PDF generation.", variant: "destructive" });
            break;
        }
      }
      
      console.log(`PDF generation loop finished. Total pages created: ${pageIndex}`);
      if (yOnCanvasPx < canvasHeightPx -1 ) { 
         console.warn(`PDF generation might be incomplete. yOnCanvasPx (${yOnCanvasPx}) < canvasHeightPx (${canvasHeightPx})`);
         toast({ title: "PDF Warning", description: "Potentially incomplete PDF. Captured content might not fill all generated pages correctly.", variant: "default", duration: 7000 });
      }

      let reportFilename = 'hall-assignments-report.pdf';
      if (result.allocatedHalls.length > 0) {
        const firstHallNameSanitized = result.allocatedHalls[0].hallName.replace(/[^a-zA-Z0-9]/g, '_');
        if (firstHallNameSanitized) { 
            reportFilename = `hall-assignments-report-${firstHallNameSanitized}.pdf`;
        }
      }

      pdf.save(reportFilename);
      toast({
        title: "PDF Generated",
        description: `Report "${reportFilename}" downloaded successfully.`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      if (elementToCapture) elementToCapture.classList.remove('pdf-capture-area');
      toast({
        title: "PDF Generation Error",
        description: error instanceof Error ? error.message : "An unknown error occurred while generating the PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle className="font-headline text-3xl">Allocation Results</CardTitle>
              <CardDescription>Generated on: {new Date(result.timestamp).toLocaleString()}</CardDescription>
            </div>
            <div className="flex space-x-2 mt-4 sm:mt-0 no-print">
              <Button onClick={handleDownloadPdf} variant="outline" disabled={isGeneratingPdf}>
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Printer className="mr-2 h-4 w-4" /> Download PDF
                  </>
                )}
              </Button>
              <Button onClick={onReset} variant="secondary" disabled={isGeneratingPdf}>
                <RotateCcw className="mr-2 h-4 w-4" /> New Allocation
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <UnallocatedStudentsCard students={result.unallocatedStudents} />
          
          {/* AIFeedbackCard removed from here */}

          <div ref={hallAssignmentsPdfSectionRef} id="hallAssignmentsCaptureArea" className="card-print"> 
            <h3 className="text-2xl font-headline font-semibold mb-4 text-foreground">Hall Assignments</h3>
            <div className="space-y-6">
              {result.allocatedHalls.map(hall => (
                <HallCard key={hall.hallNumber} hall={hall} />
              ))}
              {result.allocatedHalls.length === 0 && (
                <p className="text-muted-foreground">No halls were allocated based on the input.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllocationResultsDisplay;
