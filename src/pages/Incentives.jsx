
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Incentive } from "@/entities/Incentive";
import { Admission } from "@/entities/Admission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Award, DollarSign, TrendingUp, Users, Calculator, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function IncentivesPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [incentives, setIncentives] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [incentiveConfig, setIncentiveConfig] = useState({
    bcs_rate: 500,
    bank_rate: 400,
    ntrca_rate: 350,
    recorded_course_rate: 200,
    it_course_rate: 300,
    bonus_threshold: 20,
    bonus_amount: 2000
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    loadData();
    loadIncentiveConfig();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      calculateMonthlyIncentives();
    }
  }, [selectedMonth, employees, admissions, incentiveConfig]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, incentiveData, employeeData, admissionData] = await Promise.all([
        User.me(),
        Incentive.list('-month', 100),
        User.list(),
        Admission.list('-admission_date', 500)
      ]);
      setCurrentUser(user);
      setIncentives(incentiveData);
      setEmployees(employeeData.filter(e => e.department === 'admission')); // Only admission team
      setAdmissions(admissionData);
    } catch (error) {
      console.error("Error loading incentive data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadIncentiveConfig = () => {
    const saved = localStorage.getItem('incentive_config');
    if (saved) {
      setIncentiveConfig(JSON.parse(saved));
    }
  };

  const saveIncentiveConfig = () => {
    localStorage.setItem('incentive_config', JSON.stringify(incentiveConfig));
    setIsConfigOpen(false);
    calculateMonthlyIncentives();
  };

  const calculateMonthlyIncentives = async () => {
    if (!selectedMonth) return;

    const monthStart = selectedMonth + '-01';
    const monthEnd = selectedMonth + '-31';

    // Filter admissions for selected month
    const monthlyAdmissions = admissions.filter(admission => {
      const admissionDate = admission.admission_date;
      return admissionDate >= monthStart && admissionDate <= monthEnd;
    });

    // Calculate incentives for each employee
    const calculatedIncentives = employees.map(employee => {
      const employeeAdmissions = monthlyAdmissions.filter(a => a.assigned_employee === employee.id);
      
      // Calculate revenue and count by course type
      let totalRevenue = 0;
      let totalAdmissions = employeeAdmissions.length;
      let incentiveAmount = 0;

      employeeAdmissions.forEach(admission => {
        totalRevenue += admission.admission_fee || 0;
        
        // Calculate incentive based on course type
        switch(admission.course_type) {
          case 'bcs':
            incentiveAmount += incentiveConfig.bcs_rate;
            break;
          case 'bank':
            incentiveAmount += incentiveConfig.bank_rate;
            break;
          case 'ntrca':
            incentiveAmount += incentiveConfig.ntrca_rate;
            break;
          case 'recorded_course':
            incentiveAmount += incentiveConfig.recorded_course_rate;
            break;
          case 'it_course':
            incentiveAmount += incentiveConfig.it_course_rate;
            break;
          default:
            incentiveAmount += incentiveConfig.recorded_course_rate;
        }
      });

      // Add bonus if threshold met
      let bonusAmount = 0;
      if (totalAdmissions >= incentiveConfig.bonus_threshold) {
        bonusAmount = incentiveConfig.bonus_amount;
      }

      const totalIncentive = incentiveAmount + bonusAmount;
      
      // Calculate target achievement (assuming monthly target from user entity)
      const target = employee.admission_target || 10;
      const targetAchievement = (totalAdmissions / target * 100).toFixed(1);

      return {
        employee_id: employee.id,
        employee_name: employee.full_name,
        month: selectedMonth,
        total_admissions: totalAdmissions,
        total_revenue: totalRevenue,
        incentive_amount: incentiveAmount,
        bonus_amount: bonusAmount,
        total_incentive: totalIncentive,
        target_achievement: parseFloat(targetAchievement),
        payment_status: 'pending'
      };
    });

    // Update incentives state
    setIncentives(calculatedIncentives);
  };

  const approveIncentive = async (employeeId) => {
    try {
      const incentive = incentives.find(i => i.employee_id === employeeId);
      if (incentive) {
        await Incentive.create({
          ...incentive,
          payment_status: 'approved',
          payment_date: new Date().toISOString().split('T')[0]
        });
        
        // Update local state
        setIncentives(prev => prev.map(i => 
          i.employee_id === employeeId 
            ? { ...i, payment_status: 'approved', payment_date: new Date().toISOString().split('T')[0] }
            : i
        ));
      }
    } catch (error) {
      console.error("Error approving incentive:", error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      paid: "bg-blue-100 text-blue-800",
      hold: "bg-red-100 text-red-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getRankColor = (rank) => {
    if (rank === 1) return "bg-yellow-100 text-yellow-800"; // Gold
    if (rank === 2) return "bg-gray-100 text-gray-800"; // Silver
    if (rank === 3) return "bg-orange-100 text-orange-800"; // Bronze
    return "bg-blue-100 text-blue-800";
  };

  // Sort incentives by performance and assign ranks
  const rankedIncentives = incentives
    .sort((a, b) => b.total_admissions - a.total_admissions)
    .map((incentive, index) => ({
      ...incentive,
      rank: index + 1
    }));

  const totalIncentives = rankedIncentives.reduce((sum, i) => sum + i.total_incentive, 0);
  const totalAdmissions = rankedIncentives.reduce((sum, i) => sum + i.total_admissions, 0);
  const avgIncentive = rankedIncentives.length > 0 ? totalIncentives / rankedIncentives.length : 0;

  const isAdmin = currentUser?.role === 'admin';

  if (isLoading) {
    return <div className="p-6 text-foreground">Loading incentive data...</div>;
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient">Incentive Management</h1>
          <p className="text-lg text-muted-foreground mt-1">Track and manage admission-based incentives</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthStr = date.toISOString().slice(0, 7);
                return (
                  <SelectItem key={monthStr} value={monthStr}>
                    {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => setIsConfigOpen(true)} variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Configure Rates
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="premium-card hover:scale-105 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Incentives</p>
                <p className="text-2xl font-bold text-emerald-600">৳{totalIncentives.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card hover:scale-105 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Admissions</p>
                <p className="text-2xl font-bold text-blue-600">{totalAdmissions}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card hover:scale-105 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Incentive</p>
                <p className="text-2xl font-bold text-purple-600">৳{Math.round(avgIncentive).toLocaleString()}</p>
              </div>
              <Calculator className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card hover:scale-105 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold text-orange-600">
                  {rankedIncentives[0]?.employee_name?.split(' ')[0] || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">{rankedIncentives[0]?.total_admissions || 0} admissions</p>
              </div>
              <Award className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incentives Table */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Monthly Incentive Report - {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Admissions</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Base Incentive</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Total Incentive</TableHead>
                <TableHead>Target Achievement</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedIncentives.map(incentive => (
                <TableRow key={incentive.employee_id}>
                  <TableCell>
                    <Badge className={getRankColor(incentive.rank)}>
                      #{incentive.rank}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                        {incentive.employee_name?.charAt(0) || 'E'}
                      </div>
                      <span className="font-medium">{incentive.employee_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{incentive.total_admissions}</span>
                      <Users className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">৳{incentive.total_revenue.toLocaleString()}</TableCell>
                  <TableCell className="font-medium">৳{incentive.incentive_amount.toLocaleString()}</TableCell>
                  <TableCell>
                    {incentive.bonus_amount > 0 ? (
                      <Badge className="bg-green-100 text-green-800">
                        ৳{incentive.bonus_amount.toLocaleString()}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-bold text-lg">৳{incentive.total_incentive.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${incentive.target_achievement >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                        {incentive.target_achievement}%
                      </span>
                      {incentive.target_achievement >= 100 && (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(incentive.payment_status)}>
                      {incentive.payment_status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {incentive.payment_status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => approveIncentive(incentive.employee_id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Approve
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Incentive Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>BCS Course Rate (৳)</Label>
              <Input
                type="number"
                value={incentiveConfig.bcs_rate}
                onChange={e => setIncentiveConfig({...incentiveConfig, bcs_rate: parseInt(e.target.value)})}
              />
            </div>
            
            <div>
              <Label>Bank Course Rate (৳)</Label>
              <Input
                type="number"
                value={incentiveConfig.bank_rate}
                onChange={e => setIncentiveConfig({...incentiveConfig, bank_rate: parseInt(e.target.value)})}
              />
            </div>
            
            <div>
              <Label>NTRCA Course Rate (৳)</Label>
              <Input
                type="number"
                value={incentiveConfig.ntrca_rate}
                onChange={e => setIncentiveConfig({...incentiveConfig, ntrca_rate: parseInt(e.target.value)})}
              />
            </div>
            
            <div>
              <Label>Recorded Course Rate (৳)</Label>
              <Input
                type="number"
                value={incentiveConfig.recorded_course_rate}
                onChange={e => setIncentiveConfig({...incentiveConfig, recorded_course_rate: parseInt(e.target.value)})}
              />
            </div>
            
            <div>
              <Label>IT Course Rate (৳)</Label>
              <Input
                type="number"
                value={incentiveConfig.it_course_rate}
                onChange={e => setIncentiveConfig({...incentiveConfig, it_course_rate: parseInt(e.target.value)})}
              />
            </div>

            <div className="border-t pt-4">
              <div className="mb-2">
                <Label>Bonus Threshold (admissions)</Label>
                <Input
                  type="number"
                  value={incentiveConfig.bonus_threshold}
                  onChange={e => setIncentiveConfig({...incentiveConfig, bonus_threshold: parseInt(e.target.value)})}
                />
              </div>
              
              <div>
                <Label>Bonus Amount (৳)</Label>
                <Input
                  type="number"
                  value={incentiveConfig.bonus_amount}
                  onChange={e => setIncentiveConfig({...incentiveConfig, bonus_amount: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveIncentiveConfig} className="btn-primary">
                Save Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
