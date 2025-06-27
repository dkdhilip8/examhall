import React from 'react';

const AppFooter: React.FC = () => {
  return (
    <footer className="bg-card border-t mt-auto no-print">
      <div className="container mx-auto px-4 py-4 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Exam Hall Allocator. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default AppFooter;
