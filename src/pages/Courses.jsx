import React, { useState, useEffect } from 'react';
import { Course } from '@/entities/Course';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  RefreshCw, 
  Search, 
  Download, 
  Upload, 
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  BookOpen,
  Users,
  DollarSign,
  Calendar,
  CheckSquare,
  XCircle,
  Archive,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { processCoursesWithAI } from '@/functions/processCoursesWithAI';
import CourseImportExport from '../components/courses/CourseImportExport';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // 🆕 Bulk selection state
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [searchQuery, courses]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [coursesData, userData] = await Promise.all([
        Course.list('-created_date', 500),
        User.me()
      ]);
      setCourses(coursesData);
      setFilteredCourses(coursesData);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const filterCourses = () => {
    if (!searchQuery.trim()) {
      setFilteredCourses(courses);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = courses.filter(
      (course) =>
        course.course_name?.toLowerCase().includes(query) ||
        course.category?.toLowerCase().includes(query) ||
        course.batch_name?.toLowerCase().includes(query)
    );
    setFilteredCourses(filtered);
  };

  const handleSyncWithWebsite = async () => {
    setIsSyncing(true);
    try {
      toast.info('Syncing courses with AI... This may take a moment.');
      
      const response = await processCoursesWithAI({});
      
      if (response.data?.success) {
        toast.success(response.data.message || 'Courses synced successfully!');
        await loadData();
      } else {
        throw new Error(response.data?.details || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(`Failed to sync courses: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleViewDetails = (course) => {
    setSelectedCourse(course);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (course) => {
    setSelectedCourse(course);
    setEditFormData({
      course_name: course.course_name || '',
      category: course.category || '',
      price: course.price || 0,
      description: course.description || '',
      status: course.status || 'Active',
      mode: course.mode || 'Online',
      batch_name: course.batch_name || '',
      start_date: course.start_date || '',
      end_date: course.end_date || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCourse) return;

    try {
      await Course.update(selectedCourse.id, editFormData);
      toast.success('Course updated successfully!');
      setIsEditDialogOpen(false);
      setSelectedCourse(null);
      await loadData();
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('Failed to update course');
    }
  };

  const handleDelete = async (course) => {
    if (!window.confirm(`Are you sure you want to delete "${course.course_name}"?`)) {
      return;
    }

    try {
      await Course.delete(course.id);
      toast.success('Course deleted successfully!');
      await loadData();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  // 🆕 Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedCourseIds.length === filteredCourses.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(filteredCourses.map(c => c.id));
    }
  };

  const handleSelectCourse = (courseId) => {
    setSelectedCourseIds(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  // 🆕 Bulk action handlers
  const handleBulkStatusChange = async (newStatus) => {
    if (selectedCourseIds.length === 0) {
      toast.error('Please select courses first');
      return;
    }

    if (!window.confirm(`Change status to "${newStatus}" for ${selectedCourseIds.length} courses?`)) {
      return;
    }

    setIsBulkActionLoading(true);
    const successToast = toast.loading(`Updating ${selectedCourseIds.length} courses...`);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const courseId of selectedCourseIds) {
        try {
          await Course.update(courseId, { status: newStatus });
          successCount++;
        } catch (error) {
          console.error(`Failed to update course ${courseId}:`, error);
          failCount++;
        }
      }

      if (failCount === 0) {
        toast.success(`✅ ${successCount} courses updated successfully!`, { id: successToast });
      } else {
        toast.warning(`⚠️ ${successCount} succeeded, ${failCount} failed`, { id: successToast });
      }

      setSelectedCourseIds([]);
      await loadData();
    } catch (error) {
      toast.error('Bulk update failed', { id: successToast });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCourseIds.length === 0) {
      toast.error('Please select courses first');
      return;
    }

    if (!window.confirm(`⚠️ Are you sure you want to delete ${selectedCourseIds.length} courses? This cannot be undone.`)) {
      return;
    }

    setIsBulkActionLoading(true);
    const deletingToast = toast.loading(`Deleting ${selectedCourseIds.length} courses...`);

    try {
      for (const courseId of selectedCourseIds) {
        await Course.delete(courseId);
      }

      toast.success(`✅ ${selectedCourseIds.length} courses deleted successfully!`, { id: deletingToast });
      setSelectedCourseIds([]);
      await loadData();
    } catch (error) {
      toast.error('Bulk delete failed', { id: deletingToast });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const stats = {
    total: filteredCourses.length,
    active: filteredCourses.filter(c => c.status === 'Active').length,
    totalRevenue: filteredCourses.reduce((sum, c) => sum + (c.price || 0), 0),
    avgPrice: filteredCourses.length > 0 
      ? Math.round(filteredCourses.reduce((sum, c) => sum + (c.price || 0), 0) / filteredCourses.length)
      : 0
  };

  const canEdit = currentUser?.job_role === 'admin' || currentUser?.job_role === 'super_admin';

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-gradient">
            Course Management
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Manage, import, and export all institutional courses.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setIsImportExportOpen(true)}
            variant="outline"
            size="sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Template
          </Button>
          <Button
            onClick={() => setIsImportExportOpen(true)}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleSyncWithWebsite}
            disabled={isSyncing}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync with Website
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Courses</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Users className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ৳{stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Price</p>
                <p className="text-2xl font-bold text-purple-600">
                  ৳{stats.avgPrice.toLocaleString()}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 🆕 Bulk Actions Bar */}
      {selectedCourseIds.length > 0 && (
        <Card className="bg-violet-50 border-violet-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-violet-600">
                  {selectedCourseIds.length} course{selectedCourseIds.length > 1 ? 's' : ''} selected
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedCourseIds([])}
                  disabled={isBulkActionLoading}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleBulkStatusChange('Active')}
                  disabled={isBulkActionLoading}
                  className="text-green-600 hover:bg-green-50"
                >
                  {isBulkActionLoading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <CheckSquare className="w-4 h-4 mr-1" />
                  )}
                  Activate All
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleBulkStatusChange('Completed')}
                  disabled={isBulkActionLoading}
                  className="text-blue-600 hover:bg-blue-50"
                >
                  <Archive className="w-4 h-4 mr-1" />
                  Mark Completed
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleBulkStatusChange('Cancelled')}
                  disabled={isBulkActionLoading}
                  className="text-orange-600 hover:bg-orange-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Cancel All
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={handleBulkDelete}
                  disabled={isBulkActionLoading}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Data Management */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Course Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course List */}
      <Card className="premium-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Course List</CardTitle>
            {filteredCourses.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
              >
                {selectedCourseIds.length === filteredCourses.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-violet-600 mb-2" />
              <p className="text-muted-foreground">Loading courses...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-2 opacity-50" />
              <p className="text-muted-foreground">No courses found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedCourseIds.length === filteredCourses.length && filteredCourses.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>Course Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Price (৳)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id} className={selectedCourseIds.includes(course.id) ? 'bg-violet-50' : ''}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedCourseIds.includes(course.id)}
                          onChange={() => handleSelectCourse(course.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {course.course_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{course.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            course.status === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{course.mode || 'Online'}</TableCell>
                      <TableCell>{course.price?.toLocaleString() || 0}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(course)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canEdit && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(course)}>
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(course)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Course Details</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground">Course Name</label>
                <p className="text-lg font-semibold">{selectedCourse.course_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Category</label>
                  <p>{selectedCourse.category}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Price</label>
                  <p className="text-lg font-bold text-green-600">৳{selectedCourse.price?.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Status</label>
                  <p>{selectedCourse.status}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Mode</label>
                  <p>{selectedCourse.mode}</p>
                </div>
              </div>
              {selectedCourse.description && (
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Description</label>
                  <p className="text-sm mt-1">{selectedCourse.description}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                {canEdit && (
                  <Button onClick={() => {
                    setIsViewDialogOpen(false);
                    handleEdit(selectedCourse);
                  }}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Course
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Course Name</label>
                <Input
                  value={editFormData.course_name}
                  onChange={(e) => setEditFormData({...editFormData, course_name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">Category</label>
                  <Input
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Price (৳)</label>
                  <Input
                    type="number"
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({...editFormData, price: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold">Description</label>
                <textarea
                  className="w-full p-2 border rounded-md min-h-[100px]"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} className="bg-violet-600 hover:bg-violet-700">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import/Export Dialog */}
      <CourseImportExport
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        onImportComplete={loadData}
        courses={filteredCourses}
      />
    </div>
  );
}