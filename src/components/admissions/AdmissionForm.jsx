
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Course } from '@/entities/Course';

export default function AdmissionForm({ admission, employees, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(() => ({
    student_name: admission?.student_name || '',
    student_phone: admission?.student_phone || '',
    student_email: admission?.student_email || '',
    course_type: admission?.course_type || '', // This will now map to course.category
    course_name: admission?.course_name || '', // This will now map to course.id
    package_type: admission?.package_type || 'basic',
    admission_fee: admission?.admission_fee || '',
    payment_method: admission?.payment_method || 'cash',
    payment_status: admission?.payment_status || 'pending',
    admission_date: admission?.admission_date || new Date().toISOString().slice(0, 10),
    assigned_employee: admission?.assigned_employee || '',
    referral_source: admission?.referral_source || 'website',
    student_address: admission?.student_address || '',
    guardian_name: admission?.guardian_name || '',
    guardian_phone: admission?.guardian_phone || '',
    admission_status: admission?.admission_status || 'active'
  }));
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const courseList = await Course.list().catch(() => []);
        const activeCourses = Array.isArray(courseList)
            ? courseList.filter(c => c.status === 'Active' && c.admission_open)
            : [];
        setCourses(activeCourses);

        // If in edit mode and admission data has a course_name (which is now course ID),
        // ensure course_type and admission_fee are correctly set based on the fetched courses.
        if (admission && admission.course_name && activeCourses.length > 0) {
            const initialCourse = activeCourses.find(c => c.id === admission.course_name);
            if (initialCourse) {
                setFormData(prev => ({
                    ...prev,
                    course_type: initialCourse.category,
                    admission_fee: initialCourse.price || ''
                }));
            }
        }
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      }
    }
    fetchCourses();
  }, [admission]); // Re-run if admission prop changes, particularly for edit mode initialization

  const handleCourseChange = (courseId) => {
    const selectedCourse = courses.find(c => c.id === courseId);
    if (selectedCourse) {
        setFormData(prev => ({
            ...prev,
            course_name: selectedCourse.id, // Storing course ID
            course_type: selectedCourse.category, // Storing course category
            admission_fee: selectedCourse.price || ''
        }));
    } else {
        // Clear course_type and admission_fee if no course is selected or found
        setFormData(prev => ({
            ...prev,
            course_name: '',
            course_type: '',
            admission_fee: ''
        }));
    }
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submissionData = {
      ...formData,
      admission_fee: parseFloat(formData.admission_fee) || 0
    };
    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Student Name *</Label>
              <Input
                value={formData.student_name}
                onChange={(e) => handleChange('student_name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                value={formData.student_phone}
                onChange={(e) => handleChange('student_phone', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.student_email}
                onChange={(e) => handleChange('student_email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={formData.student_address}
                onChange={(e) => handleChange('student_address', e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Guardian Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Guardian Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Guardian Name</Label>
              <Input
                value={formData.guardian_name}
                onChange={(e) => handleChange('guardian_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Guardian Phone</Label>
              <Input
                value={formData.guardian_phone}
                onChange={(e) => handleChange('guardian_phone', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Course Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Course Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Course Name *</Label>
              <Select value={formData.course_name || ""} onValueChange={handleCourseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.length > 0 ? (
                    courses
                      .filter(course => course && course.id && course.course_name) // Filter out invalid courses
                      .map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.course_name} - {course.batch_name || course.category}
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="no-courses" disabled>No active courses found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Course Type</Label>
              <Input
                value={formData.course_type}
                readOnly
                disabled
                placeholder="Selected course category"
              />
            </div>
            <div className="space-y-2">
              <Label>Package Type *</Label>
              <Select value={formData.package_type} onValueChange={(value) => handleChange('package_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payment & Administrative */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment & Administrative</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Admission Fee (৳) *</Label>
              <Input
                type="number"
                value={formData.admission_fee}
                onChange={(e) => handleChange('admission_fee', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select value={formData.payment_method} onValueChange={(value) => handleChange('payment_method', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="installment">Installment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Status *</Label>
              <Select value={formData.payment_status} onValueChange={(value) => handleChange('payment_status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Admission Date *</Label>
              <Input
                type="date"
                value={formData.admission_date}
                onChange={(e) => handleChange('admission_date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Employee</Label>
              <Select value={formData.assigned_employee || ""} onValueChange={(value) => handleChange('assigned_employee', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter(emp => emp && emp.id && emp.full_name) // Filter out invalid employees
                    .map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} - {emp.department}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Referral Source</Label>
              <Select value={formData.referral_source} onValueChange={(value) => handleChange('referral_source', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="walk_in">Walk In</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Admission Status</Label>
              <Select value={formData.admission_status} onValueChange={(value) => handleChange('admission_status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="btn-primary">
          {admission ? 'Update Admission' : 'Create Admission'}
        </Button>
      </div>
    </form>
  );
}
