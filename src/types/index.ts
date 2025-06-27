
export interface StudentGroup {
    id: string;
    department: string;
    year: string;
    rollRangeStart: string;
    rollRangeEnd: string;
  }
  
  export interface HallConfig {
    numHalls: number;
    benchesPerHall: number;
    personsPerBench: 1 | 2;
  }
  
  export interface AllocationFormValues extends HallConfig {
    studentGroups: StudentGroup[];
    hallNames: Array<{ value: string }>;
  }
  
  export interface Student {
    rollNo: string;
    department: string;
    year: string;
    originalRollNo?: string; 
  }
  
  export interface AllocatedStudent extends Student {
    hallNumber: number; 
    hallName: string;
    benchNumber: number;
    seatNumberOnBench: number; 
  }
  
  export interface HallAllocation {
    hallNumber: number; 
    hallName: string;
    capacity: number; 
    benches: number;
    studentsPerBench: 1 | 2;
    assignedStudents: AllocatedStudent[];
  }
  
  export interface AllocationResult {
    allocatedHalls: HallAllocation[];
    unallocatedStudents: Student[];
    // aiAnalysis?: string; // Removed
    // aiRecommendations?: string; // Removed
    // aiUnallocatedStudents?: string; // Removed
    timestamp: string;
  }
  