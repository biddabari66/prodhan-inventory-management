import React, { useState, useEffect } from "react";
import { Inventory } from "@/entities/Inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, Download, Package, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { TableSkeleton, StatGridSkeleton, ErrorState } from '@/components/common/Skeletons';

export default function StockReports() {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const inventoryData = await Inventory.list();
      setInventory(inventoryData);
    } catch (error) {
      console.error("Error loading inventory data:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const categoryMatch = filterCategory === 'all' || item.category === filterCategory;
    const statusMatch = filterStatus === 'all' || item.status === filterStatus;
    return categoryMatch && statusMatch;
  });

  const lowStockItems = inventory.filter(item => item.current_stock <= item.minimum_stock);
  const outOfStockItems = inventory.filter(item => item.current_stock === 0);
  const totalValue = inventory.reduce((sum, item) => sum + (item.current_stock * item.purchase_price), 0);
  const totalSalesValue = inventory.reduce((sum, item) => sum + (item.total_sold || 0) * item.selling_price, 0);

  const categoryData = {};
  inventory.forEach(item => {
    if (!categoryData[item.category]) {
      categoryData[item.category] = { 
        category: item.category, 
        items: 0, 
        value: 0, 
        lowStock: 0 
      };
    }
    categoryData[item.category].items++;
    categoryData[item.category].value += item.current_stock * item.purchase_price;
    if (item.current_stock <= item.minimum_stock) {
      categoryData[item.category].lowStock++;
    }
  });

  const chartData = Object.values(categoryData);
  const pieData = chartData.map(cat => ({
    name: cat.category,
    value: cat.value
  }));

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const getStatusClass = (item) => {
    if (item.current_stock <= 0) return 'badge-out-of-stock';
    if (item.current_stock <= item.minimum_stock) return 'badge-low-stock';
    return 'badge-in-stock';
  };

  const getStatusText = (item) => {
    if (item.current_stock <= 0) return 'Out of Stock';
    if (item.current_stock <= item.minimum_stock) return 'Low Stock';
    return 'In Stock';
  };

  if (isLoading && inventory.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-background">
        <StatGridSkeleton count={4} />
        <TableSkeleton rows={10} cols={8} />
      </div>
    );
  }

  if (isError && inventory.length === 0) {
    return (
      <div className="p-6">
        <ErrorState message="Failed to load stock reports." onRetry={loadInventoryData} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-background">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stock Reports</h1>
          <p className="text-muted mt-1">Comprehensive analysis of inventory levels and stock performance.</p>
        </div>
        <Button className="btn-primary">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Stock Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted">Total Items</p>
                <p className="text-2xl font-bold text-blue-600">{inventory.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted">Low Stock Items</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted">Total Stock Value</p>
                <p className="text-2xl font-bold text-green-600">৳{totalValue.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="books">Books</SelectItem>
                  <SelectItem value="stationery">Stationery</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Stock Value by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`৳${value.toLocaleString()}`, 'Value']} />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`৳${value.toLocaleString()}`, 'Value']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Details Table */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <BarChart3 className="w-5 h-5" />
            Stock Details ({filteredInventory.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted">Item Name</TableHead>
                  <TableHead className="text-muted">Category</TableHead>
                  <TableHead className="text-muted">Current Stock</TableHead>
                  <TableHead className="text-muted">Min. Stock</TableHead>
                  <TableHead className="text-muted">Purchase Price</TableHead>
                  <TableHead className="text-muted">Selling Price</TableHead>
                  <TableHead className="text-muted">Stock Value</TableHead>
                  <TableHead className="text-muted">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map(item => (
                  <TableRow key={item.id} className="border-b-card-border">
                    <TableCell className="font-medium text-foreground">{item.item_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium text-foreground">{item.current_stock}</TableCell>
                    <TableCell className="text-center text-muted">{item.minimum_stock}</TableCell>
                    <TableCell className="text-foreground">৳{item.purchase_price.toLocaleString()}</TableCell>
                    <TableCell className="text-foreground">৳{item.selling_price.toLocaleString()}</TableCell>
                    <TableCell className="font-medium text-foreground">
                      ৳{(item.current_stock * item.purchase_price).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={`high-contrast-badge ${getStatusClass(item)}`}>
                        {getStatusText(item)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}