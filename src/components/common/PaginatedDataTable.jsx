import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Filter, RefreshCw, Download, Eye, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export const PaginatedDataTable = ({
  entity,
  title,
  columns = [],
  searchFields = [],
  filterOptions = [],
  defaultSort = '-created_date',
  pageSize = 25,
  actions = [],
  onRowClick = null,
  customRenderers = {},
  exportable = true,
  refreshable = true,
  className = ""
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [sortField, setSortField] = useState(defaultSort);

  useEffect(() => {
    loadData();
  }, [currentPage, searchTerm, filters, sortField]);

  const loadData = async () => {
    if (!entity) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Build filter object
      const filterObj = { ...filters };
      
      // Add search filter if search term exists
      if (searchTerm && searchFields.length > 0) {
        // For simplicity, we'll search the first field
        // In a real implementation, you might want to search across multiple fields
        filterObj[searchFields[0]] = searchTerm;
      }

      // Calculate offset
      const offset = (currentPage - 1) * pageSize;
      
      // Fetch data with pagination
      const result = await entity.filter(filterObj, sortField, pageSize, offset);
      
      // If the entity SDK doesn't support offset, fall back to client-side pagination
      let paginatedData = result;
      let total = result.length;
      
      if (result.length === pageSize + 1) {
        // If we got pageSize + 1 records, there might be more
        paginatedData = result.slice(0, pageSize);
        total = currentPage * pageSize + (result.length > pageSize ? 1 : 0);
      } else if (offset === 0) {
        // First page, total is the result length
        total = result.length;
      }
      
      setData(paginatedData);
      setTotalRecords(total);
      setTotalPages(Math.ceil(total / pageSize));
      
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page
  };

  const handleFilter = (filterKey, value) => {
    const newFilters = { ...filters };
    if (value === 'all' || !value) {
      delete newFilters[filterKey];
    } else {
      newFilters[filterKey] = value;
    }
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page
  };

  const handleSort = (field) => {
    const newSort = sortField === field ? `-${field}` : field;
    setSortField(newSort);
    setCurrentPage(1); // Reset to first page
  };

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const exportData = async () => {
    try {
      // Fetch all data for export
      const allData = await entity.filter(filters, sortField, 1000);
      
      // Create CSV content
      const headers = columns.map(col => col.header || col.key).join(',');
      const rows = allData.map(row => 
        columns.map(col => {
          let value = row[col.key] || '';
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      );
      
      const csvContent = [headers, ...rows].join('\n');
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const renderCell = (row, column) => {
    const value = row[column.key];
    
    // Custom renderer
    if (customRenderers[column.key]) {
      return customRenderers[column.key](value, row);
    }
    
    // Default renderers based on type
    switch (column.type) {
      case 'date':
        return value ? format(new Date(value), 'MMM dd, yyyy') : '-';
      case 'datetime':
        return value ? format(new Date(value), 'MMM dd, yyyy HH:mm') : '-';
      case 'currency':
        return value ? `৳${Number(value).toLocaleString()}` : '-';
      case 'badge':
        return value ? <Badge variant="secondary">{value}</Badge> : '-';
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return value || '-';
    }
  };

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <Card className={`premium-card ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {title}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {refreshable && (
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            
            {exportable && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportData}
                disabled={loading || data.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {searchFields.length > 0 && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${searchFields.join(', ')}...`}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          
          {filterOptions.map(filter => (
            <Select
              key={filter.key}
              value={filters[filter.key] || 'all'}
              onValueChange={(value) => handleFilter(filter.key, value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.label}</SelectItem>
                {filter.options.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="text-red-600 text-center py-4">
            Error loading data: {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : (
          <>
            {/* Data Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map(column => (
                      <TableHead
                        key={column.key}
                        className={column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''}
                        onClick={column.sortable ? () => handleSort(column.key) : undefined}
                      >
                        <div className="flex items-center gap-2">
                          {column.header || column.key}
                          {column.sortable && sortField?.includes(column.key) && (
                            <span className="text-xs">
                              {sortField.startsWith('-') ? '↓' : '↑'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    ))}
                    {actions.length > 0 && (
                      <TableHead className="w-24">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No data found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row, index) => (
                      <TableRow
                        key={row.id || index}
                        className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                      >
                        {columns.map(column => (
                          <TableCell key={column.key}>
                            {renderCell(row, column)}
                          </TableCell>
                        ))}
                        {actions.length > 0 && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {actions.map((action, actionIndex) => (
                                <Button
                                  key={actionIndex}
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick(row);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <action.icon className="h-4 w-4" />
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startRecord} to {endRecord} of {totalRecords} results
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PaginatedDataTable;