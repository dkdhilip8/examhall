import React from 'react';
import type { Student } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks } from 'lucide-react';

interface UnallocatedStudentsCardProps {
  students: Student[];
}

const UnallocatedStudentsCard: React.FC<UnallocatedStudentsCardProps> = ({ students }) => {
  if (students.length === 0) {
    return (
      <Card className="shadow-md border-green-500 card-print">
        <CardHeader>
            <div className="flex items-center space-x-2">
                <ListChecks className="h-5 w-5 text-green-600" />
                <CardTitle className="font-headline text-xl text-green-700">All Students Allocated</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-600">Congratulations! All students have been successfully allocated to halls.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-destructive card-print">
      <CardHeader>
        <div className="flex items-center space-x-2">
            <ListChecks className="h-5 w-5 text-destructive" />
            <CardTitle className="font-headline text-xl text-destructive">Unallocated Students</CardTitle>
        </div>
        <CardDescription className="text-destructive">
          The following {students.length} student(s) could not be allocated due to capacity constraints.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {students.map(student => (
            <li key={student.rollNo}>
              {student.rollNo} ({student.department}, {student.year})
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default UnallocatedStudentsCard;
