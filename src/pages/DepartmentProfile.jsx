import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Save, Image as ImageIcon, LayoutTemplate, MapPin, Phone, Mail, Palette } from 'lucide-react';
import { toast } from 'sonner';

// Default values to seed if nothing exists
const DEFAULT_BRANDING = {
  prodhan_com_e_commerce: {
    name: 'Prodhan.com',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/erp-prod/public/686aeb57b62314958e21fd12/85b255904_LOGO_PRODHAN-removebg-preview1.png',
    primaryColor: '#DC2626',
    secondaryColor: '#FEE2E2',
    phone: '+8809643330000',
    email: 'support@prodhan.com',
    address: 'Head Office: 1st-4th-5th-6th Floor, Jashore Malik Shamiti Vobon, Gausul Azam Super Market, Nilkhet, Kataban Rd 1205 Dhaka',
    tagline: 'Your Trusted E-Commerce Partner',
    invoice_template: 'design_1_modern'
  },
  boibari: {
    name: 'Boibari.com',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/erp-prod/public/686aeb57b62314958e21fd12/391b002f2_image.png',
    primaryColor: '#F59E0B',
    secondaryColor: '#FEF3C7',
    phone: '8801896060865',
    email: 'boibari.biddabari@gmail.com',
    address: 'Head Office: 1st-4th-5th-6th Floor, Jashore Malik Shamiti Vobon, Gausul Azam Super Market, Nilkhet, Kataban Rd 1205 Dhaka',
    tagline: 'Your Gateway to Knowledge',
    invoice_template: 'design_1_modern'
  }
};

export default function DepartmentProfile() {
  const [departments, setDepartments] = useState({});
  const [selectedDept, setSelectedDept] = useState('prodhan_com_e_commerce');
  const [formData, setFormData] = useState(DEFAULT_BRANDING.prodhan_com_e_commerce);

  useEffect(() => {
    // Load from local storage or initialize with defaults
    const stored = localStorage.getItem('department_branding');
    let loadedData = stored ? JSON.parse(stored) : DEFAULT_BRANDING;
    
    // Ensure all defaults are present if partially missing
    if (!loadedData.prodhan_com_e_commerce) loadedData.prodhan_com_e_commerce = DEFAULT_BRANDING.prodhan_com_e_commerce;
    if (!loadedData.boibari) loadedData.boibari = DEFAULT_BRANDING.boibari;
    
    setDepartments(loadedData);
    setFormData(loadedData[selectedDept]);
  }, []);

  const handleDeptChange = (dept) => {
    setSelectedDept(dept);
    setFormData(departments[dept] || DEFAULT_BRANDING[dept]);
  };

  const handleSave = () => {
    const updated = {
      ...departments,
      [selectedDept]: formData
    };
    setDepartments(updated);
    localStorage.setItem('department_branding', JSON.stringify(updated));
    toast.success(`${formData.name} profile saved successfully!`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Department Profiles</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage branding, logos, and invoice templates per department.</p>
          </div>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedDept} onValueChange={handleDeptChange}>
            <SelectTrigger className="bg-white border-slate-200 shadow-sm h-11">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prodhan_com_e_commerce">Prodhan.com (E-Commerce)</SelectItem>
              <SelectItem value="boibari">Boibari.com</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-500" /> General Info & Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Company/Brand Name</Label>
                  <Input 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline / Slogan</Label>
                  <Input 
                    value={formData.tagline || ''} 
                    onChange={e => setFormData({...formData, tagline: e.target.value})} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Logo Image URL</Label>
                <div className="flex gap-4 items-start">
                  <Input 
                    className="flex-1"
                    value={formData.logo || ''} 
                    onChange={e => setFormData({...formData, logo: e.target.value})} 
                  />
                  {formData.logo && (
                    <div className="w-12 h-12 rounded-lg border border-slate-200 flex items-center justify-center p-1 bg-white shrink-0">
                      <img src={formData.logo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="w-3 h-3" /> Primary Color (Hex)
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color" 
                      className="w-12 p-1 h-10 cursor-pointer" 
                      value={formData.primaryColor || '#000000'} 
                      onChange={e => setFormData({...formData, primaryColor: e.target.value})} 
                    />
                    <Input 
                      className="flex-1 font-mono uppercase" 
                      value={formData.primaryColor || ''} 
                      onChange={e => setFormData({...formData, primaryColor: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="w-3 h-3" /> Secondary Color (Hex)
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color" 
                      className="w-12 p-1 h-10 cursor-pointer" 
                      value={formData.secondaryColor || '#ffffff'} 
                      onChange={e => setFormData({...formData, secondaryColor: e.target.value})} 
                    />
                    <Input 
                      className="flex-1 font-mono uppercase" 
                      value={formData.secondaryColor || ''} 
                      onChange={e => setFormData({...formData, secondaryColor: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" /> Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Phone className="w-3 h-3" /> Phone Number</Label>
                  <Input 
                    value={formData.phone || ''} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Mail className="w-3 h-3" /> Email Address</Label>
                  <Input 
                    value={formData.email || ''} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Head Office Address</Label>
                <Textarea 
                  rows={3}
                  value={formData.address || ''} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Settings & Preview Sidebar */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm border-t-4 border-t-orange-500">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-orange-500" /> Invoice Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-5">
              <div className="space-y-2">
                <Label>Invoice Design Template</Label>
                <Select 
                  value={formData.invoice_template || 'design_1_modern'} 
                  onValueChange={val => setFormData({...formData, invoice_template: val})}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="design_1_modern">Design 1: Modern & Clean</SelectItem>
                    <SelectItem value="design_2_classic">Design 2: Classic Tabular</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-2">
                  Choose the invoice layout that will be generated for all orders in this department.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-700 h-11">
                  <Save className="w-4 h-4 mr-2" /> Save Department Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mini Preview Box */}
          <Card className="border-0 shadow-sm bg-slate-50">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Invoice Header Preview</p>
              
              <div className="bg-white p-4 rounded border shadow-sm flex gap-3">
                {formData.logo && (
                  <img src={formData.logo} alt="Logo" className="w-12 h-12 object-contain" />
                )}
                <div>
                  <h3 className="font-bold text-lg leading-tight" style={{ color: formData.primaryColor }}>
                    {formData.name || 'Company Name'}
                  </h3>
                  <p className="text-[10px] text-slate-500">{formData.tagline || 'Your Tagline Here'}</p>
                  <p className="text-[9px] mt-1 text-slate-400">{formData.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
      </div>
    </div>
  );
}
