
import React, { useRef, useState } from 'react';
import type { HallAllocation, AllocatedStudent } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from "@/hooks/use-toast";

interface HallCardProps {
  hall: HallAllocation;
}

const STUDENTS_PER_COLUMN = 20; 

const HallCard: React.FC<HallCardProps> = ({ hall }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdfForHall, setIsGeneratingPdfForHall] = useState(false);
  const { toast } = useToast();

  const allSeatsInHall: Array<{
    benchNumber: number;
    seatNumberOnBench: number; 
    student: AllocatedStudent | null;
  }> = [];

  for (let b = 1; b <= hall.benches; b++) {
    for (let s = 0; s < hall.studentsPerBench; s++) {
      const currentSeatNumberOnBench = s + 1;
      const studentInThisSeat = hall.assignedStudents.find(
        stud => stud.benchNumber === b && stud.seatNumberOnBench === currentSeatNumberOnBench
      );
      allSeatsInHall.push({
        benchNumber: b,
        seatNumberOnBench: currentSeatNumberOnBench,
        student: studentInThisSeat || null,
      });
    }
  }

  allSeatsInHall.sort((a, b) => {
    if (a.benchNumber === b.benchNumber) {
      return a.seatNumberOnBench - b.seatNumberOnBench;
    }
    return a.benchNumber - b.benchNumber;
  });

  const seatColumns: typeof allSeatsInHall[] = [];
  if (allSeatsInHall.length > 0) {
    for (let i = 0; i < allSeatsInHall.length; i += STUDENTS_PER_COLUMN) {
      seatColumns.push(allSeatsInHall.slice(i, i + STUDENTS_PER_COLUMN));
    }
  }

  const getSeatLabel = (seatNumber: number): string => {
    if (hall.studentsPerBench === 1) return 'A'; // Still useful for internal data consistency if needed
    if (seatNumber === 1) return 'A';
    if (seatNumber === 2) return 'B';
    return String(seatNumber);
  };

  const handleDownloadHallPdf = async () => {
    const elementToCapture = cardRef.current;
    if (!elementToCapture) {
      toast({ title: "PDF Error", description: "Card element not found.", variant: "destructive" });
      return;
    }

    setIsGeneratingPdfForHall(true);
    toast({ title: "PDF Generation", description: `Preparing ${hall.hallName} PDF...`, duration: 2000 });
    
    await new Promise(resolve => setTimeout(resolve, 300)); 

    elementToCapture.classList.add('pdf-capture-current-hall'); 

    try {
      const canvas = await html2canvas(elementToCapture, {
        useCORS: true,
        logging: true,
        scale: 2, 
        backgroundColor: '#FFFFFF',
      });

      elementToCapture.classList.remove('pdf-capture-current-hall');

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

      while (yOnCanvasPx < canvasHeightPx) {
        if (pageIndex > 0) {
          pdf.addPage();
        }
        const remainingCanvasHeight = canvasHeightPx - yOnCanvasPx;
        const currentSliceHeightOnCanvas = Math.min(remainingCanvasHeight, canvasSliceHeightPxPerPage);

        if (currentSliceHeightOnCanvas <= 0) break;
        
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasWidthPx;
        pageCanvas.height = currentSliceHeightOnCanvas;
        const pageCtx = pageCanvas.getContext('2d');

        if (!pageCtx) {
          toast({ title: "PDF Error", description: "Context creation failed for image slice.", variant: "destructive" });
          setIsGeneratingPdfForHall(false);
          return;
        }
        
        pageCtx.drawImage(
          canvas, 0, yOnCanvasPx, canvasWidthPx, currentSliceHeightOnCanvas,
          0, 0, canvasWidthPx, currentSliceHeightOnCanvas
        );
        const pageImgData = pageCanvas.toDataURL('image/png');
        const renderedHeightOnPdfPage = (currentSliceHeightOnCanvas * pdfUsableWidth) / canvasWidthPx;
        
        pdf.addImage(pageImgData, 'PNG', margin, margin, pdfUsableWidth, renderedHeightOnPdfPage);
        yOnCanvasPx += currentSliceHeightOnCanvas;
        pageIndex++;
        if (pageIndex > 15) { 
            console.error(`PDF for ${hall.hallName} exceeded 15 pages, aborting.`);
            toast({ title: "PDF Error", description: "Exceeded maximum page limit for single hall PDF.", variant: "destructive" });
            break;
        }
      }
      
      pdf.save(`${hall.hallName.replace(/[^a-zA-Z0-9]/g, '_')}-assignment.pdf`);
      toast({ title: "PDF Generated", description: `${hall.hallName} PDF downloaded successfully.` });

    } catch (error) {
      console.error(`Error generating PDF for ${hall.hallName}:`, error);
      if (elementToCapture) elementToCapture.classList.remove('pdf-capture-current-hall');
      toast({
        title: "PDF Generation Error",
        description: error instanceof Error ? error.message : `Failed to generate PDF for ${hall.hallName}.`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdfForHall(false);
    }
  };


  return (
    <Card className="shadow-md card-print" ref={cardRef}>
      <CardHeader className="flex-row justify-between items-center">
        <div>
          <div className="flex items-center space-x-2">
            <Building className="h-5 w-5 text-primary" />
            <CardTitle className="font-headline text-xl">{hall.hallName}</CardTitle>
          </div>
          <CardDescription>
            Capacity: {hall.capacity} students | Benches: {hall.benches} | Students/Bench: {hall.studentsPerBench} | Assigned: {hall.assignedStudents.length}
          </CardDescription>
        </div>
        <Button 
          onClick={handleDownloadHallPdf} 
          variant="outline" 
          size="sm" 
          className="ml-auto no-print-in-report-capture hide-for-own-pdf" 
          disabled={isGeneratingPdfForHall}
        >
          {isGeneratingPdfForHall ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Printer className="mr-2 h-3 w-3" />
          )}
          Download Hall
        </Button>
      </CardHeader>
      <CardContent>
        {allSeatsInHall.length > 0 ? (
          <div className="flex flex-row flex-wrap -mx-2 print:-mx-0.5">
            {seatColumns.map((columnSeats, colIndex) => {
              let columnContainerClass = "px-2 print:px-0.5 mb-2";
              if (seatColumns.length === 1) {
                columnContainerClass += " w-full print:w-full";
              } else if (seatColumns.length === 2) {
                columnContainerClass += " w-full md:w-1/2 print:w-1/2";
              } else { 
                columnContainerClass += " w-full md:w-1/2 lg:w-1/3 print:w-[33.33%]";
              }

              return (
                <div key={`hall-${hall.hallName}-col-${colIndex}`} className={columnContainerClass}>
                  {columnSeats.length > 0 ? (
                    <div className="rounded-md border h-full">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[20%] text-xs p-1 print:px-0.5 print:py-0.5">Bench</TableHead>
                            {hall.studentsPerBench > 1 && (
                              <TableHead className="w-[15%] text-xs p-1 print:px-0.5 print:py-0.5">Seat</TableHead>
                            )}
                            <TableHead className="w-[25%] text-xs p-1 print:px-0.5 print:py-0.5">Roll No.</TableHead>
                            <TableHead className="w-[20%] text-xs p-1 print:px-0.5 print:py-0.5">Dept.</TableHead>
                            <TableHead className="w-[20%] text-xs p-1 print:px-0.5 print:py-0.5">Year</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {columnSeats.map((item, itemIndex) => (
                            <TableRow key={`hall-${hall.hallName}-b${item.benchNumber}-s${item.seatNumberOnBench}-item-${itemIndex}`}>
                              <TableCell className="font-medium text-xs p-1 print:px-0.5 print:py-0.5">{item.benchNumber}</TableCell>
                              {hall.studentsPerBench > 1 && (
                                <TableCell className="font-medium text-xs p-1 print:px-0.5 print:py-0.5">{getSeatLabel(item.seatNumberOnBench)}</TableCell>
                              )}
                              <TableCell className="text-xs p-1 print:px-0.5 print:py-0.5">{item.student ? item.student.originalRollNo : 'Empty'}</TableCell>
                              <TableCell className="text-xs p-1 print:px-0.5 print:py-0.5">{item.student ? item.student.department : '-'}</TableCell>
                              <TableCell className="text-xs p-1 print:px-0.5 print:py-0.5">{item.student ? item.student.year : '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">No students allocated to this hall, or no seats defined.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default HallCard;
