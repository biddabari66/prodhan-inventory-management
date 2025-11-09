import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MobileOptimizedTable({ 
  data = [], 
  columns = [], 
  onRowAction = () => {},
  actionLabel = "Actions",
  showActions = true,
  isLoading = false,
  emptyMessage = "No data available"
}) {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Desktop Table View - Hidden on Mobile */}
      <div className="hidden md:block">
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                {columns.map((column, index) => (
                  <th key={index} className="text-left p-4 font-medium text-sm">
                    {column.header}
                  </th>
                ))}
                {showActions && (
                  <th className="text-right p-4 font-medium text-sm w-20">
                    {actionLabel}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t hover:bg-muted/25 transition-colors">
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className="p-4 text-sm">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                  {showActions && (
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onRowAction('view', row)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction('edit', row)}>
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View - Visible on Mobile */}
      <div className="md:hidden space-y-3">
        {data.map((row, index) => {
          const isExpanded = expandedRows.has(row.id || index);
          const primaryColumn = columns[0];
          const secondaryColumns = columns.slice(1, 3);
          const remainingColumns = columns.slice(3);
          
          return (
            <Card key={row.id || index} className="overflow-hidden">
              <CardContent className="p-4">
                {/* Primary Info - Always Visible */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base truncate">
                      {primaryColumn?.render ? 
                        primaryColumn.render(row[primaryColumn.key], row) : 
                        row[primaryColumn.key]
                      }
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {showActions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 touch-manipulation">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onRowAction('view', row)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction('edit', row)}>
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {remainingColumns.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(row.id || index)}
                        className="h-9 w-9 p-0 touch-manipulation"
                      >
                        {isExpanded ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </Button>
                    )}
                  </div>
                </div>

                {/* Secondary Info - Always Visible */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {secondaryColumns.map((column, colIndex) => (
                    <div key={colIndex}>
                      <div className="text-muted-foreground text-xs font-medium mb-1">
                        {column.header}
                      </div>
                      <div className="truncate">
                        {column.render ? 
                          column.render(row[column.key], row) : 
                          row[column.key] || '-'
                        }
                      </div>
                    </div>
                  ))}
                </div>

                {/* Expandable Details */}
                {remainingColumns.length > 0 && isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {remainingColumns.map((column, colIndex) => (
                      <div key={colIndex} className="flex justify-between items-start">
                        <div className="text-sm text-muted-foreground font-medium">
                          {column.header}:
                        </div>
                        <div className="text-sm text-right flex-1 ml-3">
                          {column.render ? 
                            column.render(row[column.key], row) : 
                            row[column.key] || '-'
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}