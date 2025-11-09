import React, { useState, useEffect } from "react";
import { Admission } from "@/entities/Admission";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, Download, Calendar as CalendarIcon, TrendingUp, Users, Target, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdmissionReports() {
  const [admissions, setAdmissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [admissionData, employeeData] = await Promise.all([
        Admission.list('-admission_date', 500),
        User.list()
      ]);
      setAdmissions(admissionData);
      setEmployees(employeeData);
    } catch (error) {
      console.error("Error loading admission reports data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAdmissions = admissions.filter(admission => {
    const admissionDate = new Date(admission.admission_date);
    const matchesDate = admissionDate >= dateRange.from && admissionDate <= dateRange.to;
    const matchesCourse = selectedCourse === 'all' || admission.course_type === selectedCourse;
    const matchesEmployee = selectedEmployee === 'all' || admission.assigned_employee === selectedEmployee;
    return matchesDate && matchesCourse && matchesEmployee;
  });

  const courseStats = {};
  const employeeStats = {};
  const monthlyStats = {};

  filteredAdmissions.forEach(admission => {
    // Course stats
    if (!courseStats[admission.course_type]) {
      courseStats[admission.course_type] = { count: 0, revenue: 0 };
    }
    courseStats[admission.course_type].count++;
    courseStats[admission.course_type].revenue += admission.admission_fee;

    // Employee stats
    if (!employeeStats[admission.assigned_employee]) {
      employeeStats[admission.assigned_employee] = { count: 0, revenue: 0 };
    }
    employeeStats[admission.assigned_employee].count++;
    employeeStats[admission.assigned_employee].revenue += admission.admission_fee;

    // Monthly stats
    const month = format(new Date(admission.admission_date), 'MMM yyyy');
    if (!monthlyStats[month]) {
      monthlyStats[month] = { month, count: 0, revenue: 0 };
    }
    monthlyStats[month].count++;
    monthlyStats[month].revenue += admission.admission_fee;
  });

  const chartData = Object.values(monthlyStats);
  const pieData = Object.entries(courseStats).map(([course, stats]) => ({
    name: course.toUpperCase(),
    value: stats.count,
    revenue: stats.revenue
  }));

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const totalAdmissions = filteredAdmissions.length;
  const totalRevenue = filteredAdmissions.reduce((sum, a) => sum + a.admission_fee, 0);
  const avgAdmissionValue = totalAdmissions > 0 ? totalRevenue / totalAdmissions : 0;

  if (isLoading) {
    return <div className="p-6">Loading admission reports...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admission Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive analysis of admission performance and trends.</p>
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, 'MMM d') : 'From'} - {dateRange.to ? format(dateRange.to, 'MMM d') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Course Type</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  <SelectItem value="bcs">BCS</SelectItem>
                  <SelectItem value="bank">BANK</SelectItem>
                  <SelectItem value="ntrca">NTRCA</SelectItem>
                  <SelectItem value="recorded_course">Recorded Course</SelectItem>
                  <SelectItem value="it_course">IT Course</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Employee</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Admissions</p>
                <p className="text-2xl font-bold text-blue-600">{totalAdmissions}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">৳{totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Admission Value</p>
                <p className="text-2xl font-bold text-purple-600">৳{Math.round(avgAdmissionValue).toLocaleString()}</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Admission Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course Distribution</CardTitle>
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}