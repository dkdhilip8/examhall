import { LayoutGrid } from 'lucide-react';
import React from 'react';

const AppHeader: React.FC = () => {
  return (
    <header className="bg-card border-b no-print">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center space-x-2">
          <LayoutGrid className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-headline font-semibold text-foreground">
            Exam Hall Allocator
          </h1>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
