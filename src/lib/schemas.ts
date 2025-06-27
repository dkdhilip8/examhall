
import { z } from 'zod';

export const studentGroupSchema = z.object({
  id: z.string(),
  department: z.string().min(1, "Department is required"),
  year: z.string().min(1, "Year is required"),
  rollRangeStart: z.string().min(1, "Start roll number is required").regex(/^\d+$/, "Roll number must be numeric"),
  rollRangeEnd: z.string().min(1, "End roll number is required").regex(/^\d+$/, "Roll number must be numeric"),
}).refine(data => {
    if (!/^\d+$/.test(data.rollRangeStart) || !/^\d+$/.test(data.rollRangeEnd)) return true; // Let regex check handle non-numeric
    return parseInt(data.rollRangeStart) <= parseInt(data.rollRangeEnd);
  }, {
  message: "Start roll number must be less than or equal to end roll number",
  path: ["rollRangeEnd"],
});

export const hallConfigSchemaBase = z.object({
  numHalls: z.coerce.number().min(1, "Number of halls must be at least 1"),
  benchesPerHall: z.coerce.number().min(1, "Benches per hall must be at least 1"),
  personsPerBench: z.coerce.number().min(1).max(2).default(1) as z.ZodType<1 | 2>,
});

export const allocationFormSchema = hallConfigSchemaBase.extend({
  hallNames: z.array(z.object({
    value: z.string().min(1, "Hall name cannot be empty.")
  })).default([]),
  studentGroups: z.array(studentGroupSchema).min(1, "At least one student group is required"),
}).superRefine((data, ctx) => {
  // Ensure hallNames array length matches numHalls
  if (data.hallNames.length !== data.numHalls) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Number of hall names must match the number of halls (${data.numHalls}). You have ${data.hallNames.length} names. Adjust number of halls or ensure all names are provided.`,
      path: ["hallNames"], // Changed from ["numHalls"] to ["hallNames"]
    });
  }
  // Ensure all hall name 'value' properties are provided and non-empty if numHalls > 0
  // This check should only run if the lengths match to avoid redundant error messages if length is already an issue.
  else if (data.numHalls > 0 && data.hallNames.length === data.numHalls) {
    data.hallNames.forEach((hallNameObject, index) => {
      if (!hallNameObject.value || hallNameObject.value.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Hall name for Hall ${index + 1} cannot be empty.`,
          path: ["hallNames", index, "value"],
        });
      }
    });
  }


  const seenRollNumbers = new Map<string, { groupIndex: number; department: string; year: string; rollRange: string }>();

  data.studentGroups.forEach((group, currentIndex) => {
    if (!group.department || !group.year || !group.rollRangeStart || !group.rollRangeEnd ||
        !/^\d+$/.test(group.rollRangeStart) || !/^\d+$/.test(group.rollRangeEnd)) {
      return;
    }
    const start = parseInt(group.rollRangeStart);
    const end = parseInt(group.rollRangeEnd);

    if (isNaN(start) || isNaN(end) || start > end) {
        return;
    }

    let groupHasReportedError = false;
    for (let i = start; i <= end; i++) {
      if (groupHasReportedError) break;

      const numericRoll = String(i);
      if (seenRollNumbers.has(numericRoll)) {
        const firstOccurrence = seenRollNumbers.get(numericRoll)!;
        const errorMessage = `Roll number ${numericRoll} (in ${group.department} - ${group.year}, range ${group.rollRangeStart}-${group.rollRangeEnd}) conflicts with Group ${firstOccurrence.groupIndex + 1} (${firstOccurrence.department} - ${firstOccurrence.year}, range ${firstOccurrence.rollRange}). Numeric parts of roll numbers must be unique.`;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: errorMessage,
          path: ["studentGroups", currentIndex, "rollRangeStart"],
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: errorMessage,
          path: ["studentGroups", currentIndex, "rollRangeEnd"],
        });
        groupHasReportedError = true;
      } else {
        seenRollNumbers.set(numericRoll, {
            groupIndex: currentIndex,
            department: group.department,
            year: group.year,
            rollRange: `${group.rollRangeStart}-${group.rollRangeEnd}`
        });
      }
    }
  });
});

export type StudentGroupSchema = z.infer<typeof studentGroupSchema>;
export type HallConfigSchema = z.infer<typeof hallConfigSchemaBase>;
export type AllocationFormSchema = z.infer<typeof allocationFormSchema>;
