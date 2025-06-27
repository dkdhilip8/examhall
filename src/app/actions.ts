
"use server";

import type { AllocationFormValues, Student, HallAllocation, AllocatedStudent, AllocationResult } from '@/types';
// import { analyzeHallAssignments, AnalyzeHallAssignmentsInput } from '@/ai/flows/hall-assignment-analyzer'; // Removed

const parseRollNumbers = (startStr: string, endStr: string, department: string, year: string): Student[] => {
  const students: Student[] = [];
  const start = parseInt(startStr);
  const end = parseInt(endStr);

  if (isNaN(start) || isNaN(end) || start > end) {
    console.error(`Invalid roll range: ${startStr}-${endStr} for ${department} ${year}`);
    return [];
  }

  for (let i = start; i <= end; i++) {
    students.push({
      rollNo: `${department.toUpperCase().replace(/\s+/g, '')}${i}`,
      originalRollNo: String(i),
      department: department.toUpperCase().replace(/\s+/g, ''),
      year,
    });
  }
  return students;
};

export async function processAllocationAction(formData: AllocationFormValues): Promise<AllocationResult> {
  const { numHalls, benchesPerHall, personsPerBench, studentGroups } = formData;
  const actualHallNames = formData.hallNames.map(hn => hn.value.trim());

  let allStudentsMasterList: Student[] = [];
  studentGroups.forEach(group => {
    const groupStudents = parseRollNumbers(group.rollRangeStart, group.rollRangeEnd, group.department, group.year);
    allStudentsMasterList.push(...groupStudents);
  });

  allStudentsMasterList.sort((a, b) => {
    const rollA = parseInt(a.originalRollNo || a.rollNo.replace(/\D/g, '') || "0");
    const rollB = parseInt(b.originalRollNo || b.rollNo.replace(/\D/g, '') || "0");
    if (rollA !== rollB) {
      return rollA - rollB;
    }
    return a.department.localeCompare(b.department);
  });

  const allocatedHalls: HallAllocation[] = [];
  let remainingStudentsForAllocation = [...allStudentsMasterList];

  let globalDepartmentCycle: string[] = [];
  if (formData.studentGroups.length > 0) {
      const deptsFromForm = [...new Set(formData.studentGroups.map(sg => sg.department.toUpperCase().replace(/\s+/g, '')))].sort();
      if (deptsFromForm.length > 0) {
          globalDepartmentCycle = deptsFromForm;
      }
  }
  let nextDeptPointerInGlobalCycle = 0;


  for (let hallIdx = 0; hallIdx < numHalls; hallIdx++) {
    if (remainingStudentsForAllocation.length === 0) break;

    const hallCapacity = benchesPerHall * personsPerBench;
    const currentHallName = actualHallNames[hallIdx] || `Hall ${hallIdx + 1}`;
    const currentHall: HallAllocation = {
      hallNumber: hallIdx + 1,
      hallName: currentHallName,
      capacity: hallCapacity,
      benches: benchesPerHall,
      studentsPerBench: personsPerBench,
      assignedStudents: [],
    };

    let lastDeptPlacedOnSingleBench: string | null = null; 
    let lastBenchDeptA: string | null = null; 
    let lastBenchDeptB: string | null = null; 

    for (let benchNum = 1; benchNum <= benchesPerHall; benchNum++) {
      if (remainingStudentsForAllocation.length === 0) break;
      if (currentHall.assignedStudents.length >= hallCapacity) break;

      if (personsPerBench === 1) {
        let studentToPlaceIdx = -1;
        let placedStudentDept: string | null = null;

        if (globalDepartmentCycle.length > 0 && remainingStudentsForAllocation.length > 0) {
          let foundSuitableStudent = false;
          for (let k = 0; k < globalDepartmentCycle.length; k++) { 
            const deptToAttempt = globalDepartmentCycle[(nextDeptPointerInGlobalCycle + k) % globalDepartmentCycle.length];
            const idx = remainingStudentsForAllocation.findIndex(s => s.department === deptToAttempt);

            if (idx !== -1) { 
              if (lastDeptPlacedOnSingleBench === null || deptToAttempt !== lastDeptPlacedOnSingleBench) {
                studentToPlaceIdx = idx;
                placedStudentDept = deptToAttempt;
                nextDeptPointerInGlobalCycle = (globalDepartmentCycle.indexOf(deptToAttempt) + 1) % globalDepartmentCycle.length;
                foundSuitableStudent = true;
                break; 
              }
            }
          }
          if (!foundSuitableStudent && remainingStudentsForAllocation.length > 0) { 
            studentToPlaceIdx = 0; 
            placedStudentDept = remainingStudentsForAllocation[0].department;
            if (globalDepartmentCycle.includes(placedStudentDept)) {
                 nextDeptPointerInGlobalCycle = (globalDepartmentCycle.indexOf(placedStudentDept) + 1) % globalDepartmentCycle.length;
            } else if (globalDepartmentCycle.length > 0) {
                 nextDeptPointerInGlobalCycle = (nextDeptPointerInGlobalCycle + 1) % globalDepartmentCycle.length;
            }
          }
        } else if (remainingStudentsForAllocation.length > 0) { 
             studentToPlaceIdx = 0;
             placedStudentDept = remainingStudentsForAllocation[0].department;
        }
        
        if (studentToPlaceIdx !== -1) {
            const studentDetails = remainingStudentsForAllocation[studentToPlaceIdx];
            const allocatedStudentData: AllocatedStudent = {
                ...studentDetails,
                hallNumber: hallIdx + 1,
                hallName: currentHallName,
                benchNumber: benchNum,
                seatNumberOnBench: 1,
            };
            currentHall.assignedStudents.push(allocatedStudentData);
            remainingStudentsForAllocation.splice(studentToPlaceIdx, 1);
            lastDeptPlacedOnSingleBench = placedStudentDept;
        }

      } else { // personsPerBench === 2
        let studentForSeatA: AllocatedStudent | null = null;
        let studentForSeatB: AllocatedStudent | null = null;
        
        if (remainingStudentsForAllocation.length > 0) {
          let studentToPlaceForA_Idx = -1;
          let placedStudentADept: string | null = null;

          if (globalDepartmentCycle.length > 0) {
            let foundSuitableA = false;
            for (let k=0; k < globalDepartmentCycle.length; k++) {
                const deptToAttempt = globalDepartmentCycle[(nextDeptPointerInGlobalCycle + k) % globalDepartmentCycle.length];
                if ((lastBenchDeptA === null || deptToAttempt !== lastBenchDeptA) &&
                    (lastBenchDeptB === null || deptToAttempt !== lastBenchDeptB)) {
                    const idx = remainingStudentsForAllocation.findIndex(s => s.department === deptToAttempt);
                    if (idx !== -1) {
                        studentToPlaceForA_Idx = idx;
                        placedStudentADept = deptToAttempt;
                        nextDeptPointerInGlobalCycle = (globalDepartmentCycle.indexOf(deptToAttempt) + 1) % globalDepartmentCycle.length;
                        foundSuitableA = true;
                        break;
                    }
                }
            }
            if (!foundSuitableA) {
                for (let k=0; k < globalDepartmentCycle.length; k++) {
                    const deptToAttempt = globalDepartmentCycle[(nextDeptPointerInGlobalCycle + k) % globalDepartmentCycle.length];
                     if (lastBenchDeptA === null || deptToAttempt !== lastBenchDeptA) {
                         const idx = remainingStudentsForAllocation.findIndex(s => s.department === deptToAttempt);
                         if (idx !== -1) {
                            studentToPlaceForA_Idx = idx;
                            placedStudentADept = deptToAttempt;
                            nextDeptPointerInGlobalCycle = (globalDepartmentCycle.indexOf(deptToAttempt) + 1) % globalDepartmentCycle.length;
                            foundSuitableA = true;
                            break;
                         }
                     }
                }
            }
            if (!foundSuitableA) {
                 for (let k=0; k < globalDepartmentCycle.length; k++) {
                    const deptToAttempt = globalDepartmentCycle[(nextDeptPointerInGlobalCycle + k) % globalDepartmentCycle.length];
                     if (lastBenchDeptB === null || deptToAttempt !== lastBenchDeptB) {
                         const idx = remainingStudentsForAllocation.findIndex(s => s.department === deptToAttempt);
                         if (idx !== -1) {
                            studentToPlaceForA_Idx = idx;
                            placedStudentADept = deptToAttempt;
                            nextDeptPointerInGlobalCycle = (globalDepartmentCycle.indexOf(deptToAttempt) + 1) % globalDepartmentCycle.length;
                            foundSuitableA = true;
                            break;
                         }
                     }
                }
            }
            if (!foundSuitableA && remainingStudentsForAllocation.length > 0) {
               studentToPlaceForA_Idx = 0;
               placedStudentADept = remainingStudentsForAllocation[0].department;
               if (globalDepartmentCycle.includes(placedStudentADept)) {
                   nextDeptPointerInGlobalCycle = (globalDepartmentCycle.indexOf(placedStudentADept) + 1) % globalDepartmentCycle.length;
               } else if (globalDepartmentCycle.length > 0) {
                  nextDeptPointerInGlobalCycle = (nextDeptPointerInGlobalCycle + 1) % globalDepartmentCycle.length;
               }
            }
          } else if (remainingStudentsForAllocation.length > 0) { 
             studentToPlaceForA_Idx = 0;
             placedStudentADept = remainingStudentsForAllocation[0].department;
          }
          
          if (studentToPlaceForA_Idx !== -1) {
              const studentDetailsA = remainingStudentsForAllocation[studentToPlaceForA_Idx];
              studentForSeatA = {
                ...studentDetailsA,
                hallNumber: hallIdx + 1,
                hallName: currentHallName,
                benchNumber: benchNum,
                seatNumberOnBench: 1,
              };
              currentHall.assignedStudents.push(studentForSeatA);
              remainingStudentsForAllocation.splice(studentToPlaceForA_Idx, 1);
          }
        }

        if (studentForSeatA && remainingStudentsForAllocation.length > 0) {
          if (currentHall.assignedStudents.length >= hallCapacity) { 
            //
          } else {
            let studentToPlaceForB_Idx = -1;
            let placedStudentBDept: string | null = null;

            if (globalDepartmentCycle.length > 0) {
                let foundSuitableB = false;
                for (let k=0; k < globalDepartmentCycle.length; k++) {
                    const deptToAttempt = globalDepartmentCycle[(nextDeptPointerInGlobalCycle + k) % globalDepartmentCycle.length];
                    if (deptToAttempt !== studentForSeatA.department) {
                        const idx = remainingStudentsForAllocation.findIndex(s => s.department === deptToAttempt);
                        if (idx !== -1) {
                            studentToPlaceForB_Idx = idx;
                            placedStudentBDept = deptToAttempt;
                            nextDeptPointerInGlobalCycle = (globalDepartmentCycle.indexOf(deptToAttempt) + 1) % globalDepartmentCycle.length;
                            foundSuitableB = true;
                            break;
                        }
                    }
                }
                if (!foundSuitableB && remainingStudentsForAllocation.length > 0) {
                    const fallbackIdx = remainingStudentsForAllocation.findIndex(s => s.department !== studentForSeatA!.department);
                    if (fallbackIdx !== -1) {
                        studentToPlaceForB_Idx = fallbackIdx;
                        placedStudentBDept = remainingStudentsForAllocation[fallbackIdx].department;
                         if (globalDepartmentCycle.includes(placedStudentBDept)) {
                            nextDeptPointerInGlobalCycle = (globalDepartmentCycle.indexOf(placedStudentBDept) + 1) % globalDepartmentCycle.length;
                        } else if (globalDepartmentCycle.length > 0) {
                           nextDeptPointerInGlobalCycle = (nextDeptPointerInGlobalCycle + 1) % globalDepartmentCycle.length;
                        }
                    } else if (remainingStudentsForAllocation.length > 0) { 
                        studentToPlaceForB_Idx = 0;
                        placedStudentBDept = remainingStudentsForAllocation[0].department;
                         if (globalDepartmentCycle.includes(placedStudentBDept)) {
                            nextDeptPointerInGlobalCycle = (globalDepartmentCycle.indexOf(placedStudentBDept) + 1) % globalDepartmentCycle.length;
                        } else if (globalDepartmentCycle.length > 0) {
                            nextDeptPointerInGlobalCycle = (nextDeptPointerInGlobalCycle + 1) % globalDepartmentCycle.length;
                        }
                    }
                }
            } else if (remainingStudentsForAllocation.length > 0) { 
                const nonConflictingBIdx = remainingStudentsForAllocation.findIndex(s => s.department !== studentForSeatA!.department);
                if (nonConflictingBIdx !== -1) {
                    studentToPlaceForB_Idx = nonConflictingBIdx;
                } else {
                    studentToPlaceForB_Idx = 0; 
                }
                if (studentToPlaceForB_Idx !== -1) {
                   placedStudentBDept = remainingStudentsForAllocation[studentToPlaceForB_Idx].department;
                }
            }


            if (studentToPlaceForB_Idx !== -1) {
               const studentDetailsB = remainingStudentsForAllocation[studentToPlaceForB_Idx];
               studentForSeatB = {
                  ...studentDetailsB,
                  hallNumber: hallIdx + 1,
                  hallName: currentHallName,
                  benchNumber: benchNum,
                  seatNumberOnBench: 2,
               };
               currentHall.assignedStudents.push(studentForSeatB);
               remainingStudentsForAllocation.splice(studentToPlaceForB_Idx, 1);
            }
          }
        }
        lastBenchDeptA = studentForSeatA ? studentForSeatA.department : null;
        lastBenchDeptB = studentForSeatB ? studentForSeatB.department : null;
      }
    } 
    
    currentHall.assignedStudents.sort((a,b) => {
        if (a.benchNumber === b.benchNumber) {
            return a.seatNumberOnBench - b.seatNumberOnBench;
        }
        return a.benchNumber - b.benchNumber;
    });
    allocatedHalls.push(currentHall);
  } 

  const unallocatedStudentsList: Student[] = [...remainingStudentsForAllocation].map(s => ({
      rollNo: s.rollNo, 
      department: s.department, 
      year: s.year, 
      originalRollNo: s.originalRollNo || s.rollNo
    }));

  unallocatedStudentsList.sort((a, b) => {
    const rollA = parseInt(a.originalRollNo || a.rollNo.replace(/\D/g, '') || "0");
    const rollB = parseInt(b.originalRollNo || b.rollNo.replace(/\D/g, '') || "0");
    return rollA - rollB;
  });
  
  // Removed AI interaction block

  return {
    allocatedHalls,
    unallocatedStudents: unallocatedStudentsList,
    // aiAnalysis, // Removed
    // aiRecommendations, // Removed
    // aiUnallocatedStudents, // Removed
    timestamp: new Date().toISOString(),
  };
}
