
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Trash2, PlusCircle, Loader2, Building, Users, Armchair, Settings, XCircle, Tag, CalendarDays } from 'lucide-react';
import type { AllocationFormValues } from '@/types';
import { allocationFormSchema, AllocationFormSchema } from '@/lib/schemas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";


interface AllocationFormProps {
  onSubmit: (data: AllocationFormValues) => Promise<void>;
  isLoading: boolean;
}

const initialDepartments = ["CSE", "IT", "ECE", "EEE", "Civil", "Mech"];
const initialYears = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const AllocationForm: React.FC<AllocationFormProps> = ({ onSubmit, isLoading }) => {
  const [departments, setDepartments] = useState<string[]>(initialDepartments);
  const [newDepartment, setNewDepartment] = useState<string>("");
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);

  const [editableYears, setEditableYears] = useState<string[]>(initialYears);
  const [newYear, setNewYear] = useState<string>("");
  const [isYearDialogOpen, setIsYearDialogOpen] = useState(false);

  const { toast } = useToast();

  const { register, control, handleSubmit, formState: { errors }, watch, setValue, trigger } = useForm<AllocationFormSchema>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: {
      numHalls: 1,
      benchesPerHall: 25,
      personsPerBench: 1,
      hallNames: [{ value: 'Hall 1' }],
      studentGroups: [{ id: crypto.randomUUID(), department: '', year: '', rollRangeStart: '', rollRangeEnd: '' }],
    },
  });

  const { fields: studentGroupFields, append: appendStudentGroup, remove: removeStudentGroup } = useFieldArray({
    control,
    name: "studentGroups",
  });

  const { fields: hallNameFields, append: appendHallName, remove: removeHallName, replace: replaceHallNames } = useFieldArray({
    control,
    name: "hallNames"
  });

  const watchedNumHalls = watch("numHalls");
  const studentGroupsWatch = watch("studentGroups");
  const currentBenches = watch("benchesPerHall");
  const currentPersonsPerBench = watch("personsPerBench");
  const hallCapacity = (currentBenches || 0) * (currentPersonsPerBench || 0);


  useEffect(() => {
    const currentHallNameCount = hallNameFields.length;
    const targetHallCount = watchedNumHalls || 0;

    if (currentHallNameCount < targetHallCount) {
      const newEntries = [];
      for (let i = currentHallNameCount; i < targetHallCount; i++) {
        newEntries.push({value: `Hall ${i + 1}`});
      }
      if (newEntries.length > 0) appendHallName(newEntries as any, { shouldFocus: false });
    } else if (currentHallNameCount > targetHallCount) {
      const newHallNames = hallNameFields.slice(0, targetHallCount);
      replaceHallNames(newHallNames.map(f => ({value: f.value})), { shouldFocus: false });
    }
    if (targetHallCount > 0 ) {
        trigger("hallNames");
    }
  }, [watchedNumHalls, hallNameFields.length, appendHallName, replaceHallNames, trigger]);


  const handleAddDepartment = () => {
    if (newDepartment.trim() === "") {
      toast({ title: "Error", description: "Department name cannot be empty.", variant: "destructive" });
      return;
    }
    if (departments.map(d => d.toLowerCase()).includes(newDepartment.trim().toLowerCase())) {
      toast({ title: "Error", description: "Department already exists.", variant: "destructive" });
      return;
    }
    setDepartments([...departments, newDepartment.trim().toUpperCase()]);
    setNewDepartment("");
    toast({ title: "Success", description: `Department "${newDepartment.trim().toUpperCase()}" added.` });
  };

  const handleRemoveDepartment = (deptToRemove: string) => {
    const isDeptInUse = studentGroupsWatch.some(group => group.department === deptToRemove);
    if (isDeptInUse) {
      toast({
        title: "Cannot Remove Department",
        description: `Department "${deptToRemove}" is currently selected in one or more student groups. Please change their department before removing.`,
        variant: "destructive",
      });
      return;
    }
    setDepartments(departments.filter(dept => dept !== deptToRemove));
    toast({ title: "Success", description: `Department "${deptToRemove}" removed.` });
  };

  const handleAddYear = () => {
    if (newYear.trim() === "") {
      toast({ title: "Error", description: "Year cannot be empty.", variant: "destructive" });
      return;
    }
    if (editableYears.map(y => y.toLowerCase()).includes(newYear.trim().toLowerCase())) {
      toast({ title: "Error", description: "Year already exists.", variant: "destructive" });
      return;
    }
    setEditableYears([...editableYears, newYear.trim()]);
    setNewYear("");
    toast({ title: "Success", description: `Year "${newYear.trim()}" added.` });
  };

  const handleRemoveYear = (yearToRemove: string) => {
    const isYearInUse = studentGroupsWatch.some(group => group.year === yearToRemove);
    if (isYearInUse) {
      toast({
        title: "Cannot Remove Year",
        description: `Year "${yearToRemove}" is currently selected in one or more student groups. Please change their year before removing.`,
        variant: "destructive",
      });
      return;
    }
    setEditableYears(editableYears.filter(year => year !== yearToRemove));
    toast({ title: "Success", description: `Year "${yearToRemove}" removed.` });
  };


  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Building className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline text-2xl">Hall Configuration</CardTitle>
          </div>
          <CardDescription>Specify the details of the available examination halls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="numHalls">Number of Halls</Label>
              <Input id="numHalls" type="number" {...register('numHalls')} placeholder="e.g., 3" />
              {errors.numHalls && <p className="text-sm text-destructive mt-1">{errors.numHalls.message}</p>}
            </div>
            <div>
              <Label htmlFor="benchesPerHall">Benches Per Hall</Label>
              <Input id="benchesPerHall" type="number" {...register('benchesPerHall')} placeholder="e.g., 25" />
              {errors.benchesPerHall && <p className="text-sm text-destructive mt-1">{errors.benchesPerHall.message}</p>}
            </div>
            <div>
              <Label htmlFor="personsPerBench">Persons Per Bench</Label>
              <Controller
                name="personsPerBench"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(value) => field.onChange(Number(value) as 1 | 2)} value={String(field.value)} defaultValue={String(field.value)}>
                    <SelectTrigger id="personsPerBench">
                      <SelectValue placeholder="Select persons per bench" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Person</SelectItem>
                      <SelectItem value="2">2 Persons</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.personsPerBench && <p className="text-sm text-destructive mt-1">{errors.personsPerBench.message}</p>}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Calculated maximum capacity per hall: <span className="font-semibold">{hallCapacity} students</span></p>
        
          {watchedNumHalls > 0 && (
            <div className="space-y-3 pt-3">
              <Label className="text-md font-medium">Hall Names</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {hallNameFields.map((field, index) => (
                  <div key={field.id}>
                    <Label htmlFor={`hallNames.${index}.value`} className="sr-only">Hall {index + 1} Name</Label>
                     <div className="flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id={`hallNames.${index}.value`}
                          {...register(`hallNames.${index}.value` as const)}
                          placeholder={`Name for Hall ${index + 1}`}
                          defaultValue={field.value}
                        />
                    </div>
                    {errors.hallNames?.[index]?.value && <p className="text-sm text-destructive mt-1">{errors.hallNames[index]?.value?.message}</p>}
                  </div>
                ))}
              </div>
               {errors.hallNames && typeof errors.hallNames.message === 'string' && <p className="text-sm text-destructive mt-1">{errors.hallNames.message}</p>}
               {errors.hallNames?.root && <p className="text-sm text-destructive mt-1">{errors.hallNames.root.message}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle className="font-headline text-2xl">Student Data</CardTitle>
            </div>
            <div className="flex space-x-2">
              <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8" title="Manage Departments">
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Manage Departments</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manage Departments</DialogTitle>
                    <DialogDescription>Add or remove departments available for selection.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="New department name"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                      />
                      <Button onClick={handleAddDepartment}>Add</Button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      <Label>Current Departments:</Label>
                      {departments.length > 0 ? departments.map(dept => (
                        <div key={dept} className="flex items-center justify-between p-2 border rounded-md">
                          <span>{dept}</span>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveDepartment(dept)} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No departments defined.</p>}
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" onClick={() => setIsDepartmentDialogOpen(false)}>Done</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isYearDialogOpen} onOpenChange={setIsYearDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8" title="Manage Years">
                    <CalendarDays className="h-4 w-4" />
                    <span className="sr-only">Manage Years</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manage Years</DialogTitle>
                    <DialogDescription>Add or remove academic years available for selection.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="New year (e.g., 2nd Year)"
                        value={newYear}
                        onChange={(e) => setNewYear(e.target.value)}
                      />
                      <Button onClick={handleAddYear}>Add</Button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      <Label>Current Years:</Label>
                      {editableYears.length > 0 ? editableYears.map(year => (
                        <div key={year} className="flex items-center justify-between p-2 border rounded-md">
                          <span>{year}</span>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveYear(year)} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No years defined.</p>}
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" onClick={() => setIsYearDialogOpen(false)}>Done</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <CardDescription>Enter student group details including department, year, and roll number ranges.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {studentGroupFields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-md space-y-3 relative shadow-sm bg-background">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`studentGroups.${index}.department`}>Department</Label>
                  <Controller
                    name={`studentGroups.${index}.department`}
                    control={control}
                    render={({ field: controllerField }) => (
                      <Select
                        onValueChange={controllerField.onChange}
                        value={controllerField.value}
                        defaultValue={controllerField.value}
                      >
                        <SelectTrigger id={`studentGroups.${index}.department`}>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                           {departments.length === 0 && <SelectItem value="__EMPTY_DEPARTMENTS_PLACEHOLDER__" disabled>No departments available. Manage via settings.</SelectItem>}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.studentGroups?.[index]?.department && <p className="text-sm text-destructive mt-1">{errors.studentGroups[index]?.department?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`studentGroups.${index}.year`}>Year</Label>
                   <Controller
                    name={`studentGroups.${index}.year`}
                    control={control}
                    render={({ field: controllerField }) => (
                      <Select onValueChange={controllerField.onChange} value={controllerField.value} defaultValue={controllerField.value}>
                        <SelectTrigger id={`studentGroups.${index}.year`}>
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {editableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                          {editableYears.length === 0 && <SelectItem value="__EMPTY_YEARS_PLACEHOLDER__" disabled>No years available. Manage via settings.</SelectItem>}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.studentGroups?.[index]?.year && <p className="text-sm text-destructive mt-1">{errors.studentGroups[index]?.year?.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`studentGroups.${index}.rollRangeStart`}>Roll Range Start (Numeric)</Label>
                  <Input id={`studentGroups.${index}.rollRangeStart`} {...register(`studentGroups.${index}.rollRangeStart`)} placeholder="e.g., 7101" />
                  {errors.studentGroups?.[index]?.rollRangeStart && <p className="text-sm text-destructive mt-1">{errors.studentGroups[index]?.rollRangeStart?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`studentGroups.${index}.rollRangeEnd`}>Roll Range End (Numeric)</Label>
                  <Input id={`studentGroups.${index}.rollRangeEnd`} {...register(`studentGroups.${index}.rollRangeEnd`)} placeholder="e.g., 7125" />
                  {errors.studentGroups?.[index]?.rollRangeEnd && <p className="text-sm text-destructive mt-1">{errors.studentGroups[index]?.rollRangeEnd?.message}</p>}
                </div>
              </div>
              {studentGroupFields.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="absolute top-2.5 right-2.5 text-destructive hover:text-destructive-foreground hover:bg-destructive/90" onClick={() => removeStudentGroup(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {errors.studentGroups && typeof errors.studentGroups.message === 'string' && <p className="text-sm text-destructive mt-1">{errors.studentGroups.message}</p>}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const defaultDept = departments.length > 0 ? departments[0] : '';
              const defaultYr = editableYears.length > 0 ? editableYears[0] : '';
              appendStudentGroup({ id: crypto.randomUUID(), department: defaultDept, year: defaultYr, rollRangeStart: '', rollRangeEnd: '' });
            }}
            className="mt-2"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Student Group
          </Button>
        </CardContent>
      </Card>
      
      <Separator />

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Armchair className="mr-2 h-4 w-4" />
              Allocate Halls & Analyze
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default AllocationForm;
