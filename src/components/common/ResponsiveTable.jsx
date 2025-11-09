import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

const MobileCard = ({ item, columns, onItemClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Show first 2-3 most important columns in collapsed view
  const primaryColumns = columns.slice(0, 3);
  const secondaryColumns = columns.slice(3);

  return (
    <Card className="mb-3 premium-card">
      <CardContent className="p-4">
        <div className="space-y-2">
          {primaryColumns.map((column, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">{column.header}</span>
              <span className="text-sm font-semibold">
                {typeof column.accessorFn === 'function' ? column.accessorFn(item) : item[column.accessorKey]}
              </span>
            </div>
          ))}
          
          {secondaryColumns.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full mt-2 text-xs h-8"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                {isExpanded ? 'Show Less' : 'Show More'}
              </Button>
              
              {isExpanded && (
                <div className="space-y-2 pt-2 border-t">
                  {secondaryColumns.map((column, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">{column.header}</span>
                      <span className="text-sm">
                        {typeof column.accessorFn === 'function' ? column.accessorFn(item) : item[column.accessorKey]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          
          {onItemClick && (
            <Button 
              onClick={() => onItemClick(item)} 
              variant="outline" 
              size="sm" 
              className="w-full mt-3 text-xs h-8"
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function ResponsiveTable({ 
  data = [], 
  columns = [], 
  onItemClick,
  className = "",
  showMobileCards = true 
}) {
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  if (isMobile && showMobileCards) {
    return (
      <div className={`space-y-3 ${className}`}>
        {data.map((item, index) => (
          <MobileCard 
            key={item.id || index} 
            item={item} 
            columns={columns} 
            onItemClick={onItemClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`responsive-table ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow 
              key={item.id || index}
              className={onItemClick ? "cursor-pointer hover:bg-muted/50" : ""}
              onClick={() => onItemClick && onItemClick(item)}
            >
              {columns.map((column, colIndex) => (
                <TableCell key={colIndex} className={column.cellClassName}>
                  {column.cell 
                    ? column.cell(item)
                    : typeof column.accessorFn === 'function' 
                      ? column.accessorFn(item) 
                      : item[column.accessorKey]
                  }
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}