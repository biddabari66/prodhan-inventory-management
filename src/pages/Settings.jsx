
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, UserPlus, Edit, Shield } from "lucide-react";
import EmployeeForm from "../components/employees/EmployeeForm";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Settings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, userList] = await Promise.all([
        User.me(),
        User.list(),
      ]);
      setCurrentUser(user);
      setUsers(userList);
    } catch (error) {
      console.error("Error loading settings data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFormSubmit = async (data) => {
    if (editingUser) {
      await User.update(editingUser.id, data);
    } else {
      await User.create(data);
    }
    setIsFormOpen(false);
    setEditingUser(null);
    loadData();
  };

  const getJobRoleColor = (jobRole) => ({
    'admin': 'bg-red-100 text-red-800',
    'manager': 'bg-blue-100 text-blue-800',
    'employee': 'bg-green-100 text-green-800',
    'department_head': 'bg-purple-100 text-purple-800',
  }[jobRole] || 'bg-gray-100 text-gray-800');

  if (isLoading) {
    return <div className="p-6 text-foreground">Loading settings...</div>;
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-background">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground mt-1">Manage general system configurations.</p>
        </div>
      </div>

      <Card className="premium-card">
           <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Manage Employees
                </CardTitle>
                <CardDescription>Add, edit, and manage employee profiles.</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                  <Link to={createPageUrl('UserAccessManager')}>
                      <Button variant="outline">
                          <Shield className="w-4 h-4 mr-2" />
                          Manage Permissions
                      </Button>
                  </Link>
                  <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                      <DialogTrigger asChild>
                      <Button className="bg-emerald-600 hover:bg-emerald-700">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Employee
                      </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto">
                      <DialogHeader>
                          <DialogTitle>{editingUser ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                      </DialogHeader>
                      <EmployeeForm 
                          employee={editingUser}
                          onSubmit={handleFormSubmit} 
                          onCancel={() => {
                              setIsFormOpen(false);
                              setEditingUser(null);
                          }}
                      />
                      </DialogContent>
                  </Dialog>
              </div>
          </CardHeader>
          <CardContent>
            <div className="responsive-table">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Job Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {users.map(user => (
                          <TableRow key={user.id}>
                          <TableCell className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                              <AvatarImage src={user.profile_picture_url || `https://ui-avatars.com/api/?name=${user.full_name}&background=10b981&color=fff`} />
                              <AvatarFallback>{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                              <div>
                              <p className="font-medium">{user.full_name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                          </TableCell>
                          <TableCell>
                              <Badge variant="outline">{user.department}</Badge>
                          </TableCell>
                          <TableCell>
                              <Badge className={getJobRoleColor(user.job_role)}>
                              {user.job_role?.replace('_', ' ')}
                              </Badge>
                          </TableCell>
                          <TableCell>
                              <Badge className={user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {user.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                          </TableCell>
                          <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => { setEditingUser(user); setIsFormOpen(true); }}>
                                  <Edit className="w-4 h-4" />
                              </Button>
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
