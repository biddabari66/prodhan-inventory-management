
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableUserSelect } from '@/components/ui/searchable-user-select'; // Added import for SearchableUserSelect

export default function LeadForm({ lead, users = [], onSubmit, onCancel }) { // Added default empty array to users prop
  const [formData, setFormData] = useState({
    student_name: '',
    phone: '',
    email: '',
    course_interest: '',
    department: 'biddabari', // Default department as per outline
    lead_source: 'walk_in',   // Default lead_source as per outline
    lead_status: 'new',
    assigned_to: '',
    city: '',                 // New field
    age: '',                  // New field
    education_level: '',      // New field
    notes: '',
    estimated_value: '',      // New field
    next_follow_up: '',
    ...lead // Spread existing lead data to override defaults
  });

  const handleInputChange = useCallback((e) => { // Renamed handleChange to handleInputChange
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSelectChange = useCallback((name, value) => { // This handler is now used directly in onValueChange
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSubmit(formData); // Changed onSubmit to onSave
  }, [formData, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4"> {/* Changed className from space-y-6 p-1 to space-y-4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="student_name">Student Name *</Label>
          <Input
            id="student_name"
            name="student_name"
            value={formData.student_name}
            onChange={handleInputChange}
            placeholder="Enter student name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="01XXXXXXXXX"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="student@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="course_interest">Course Interest *</Label>
          <Input // Changed from Select to Input
            id="course_interest"
            name="course_interest"
            value={formData.course_interest}
            onChange={handleInputChange}
            placeholder="e.g., BCS Preparation, Bank Job Preparation"
            required
          />
        </div>

        {/* NEW: Department Selection */}
        <div className="space-y-2">
          <Label htmlFor="department">Department *</Label>
          <Select value={formData.department} onValueChange={(value) => handleSelectChange('department', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="biddabari">Biddabari</SelectItem>
              <SelectItem value="boibari">Boibari</SelectItem>
              <SelectItem value="prodhan_com_e_commerce">Prodhan.com</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lead_source">Lead Source</Label>
          <Select value={formData.lead_source} onValueChange={(value) => handleSelectChange('lead_source', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
              <SelectItem value="google_ads">Google Ads</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="walk_in">Walk-in</SelectItem>
              <SelectItem value="webinar">Webinar</SelectItem>
              <SelectItem value="email_campaign">Email Campaign</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lead_status">Lead Status</Label>
          <Select name="lead_status" value={formData.lead_status} onValueChange={(v) => handleSelectChange('lead_status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">new</SelectItem>
              <SelectItem value="contacted">contacted</SelectItem>
              <SelectItem value="qualified">qualified</SelectItem>
              <SelectItem value="proposal_sent">proposal_sent</SelectItem>
              <SelectItem value="negotiation">negotiation</SelectItem>
              <SelectItem value="converted">converted</SelectItem>
              <SelectItem value="lost">lost</SelectItem>
              <SelectItem value="nurturing">nurturing</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* New fields */}
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            placeholder="e.g., Dhaka"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            name="age"
            type="number"
            value={formData.age}
            onChange={handleInputChange}
            placeholder="e.g., 25"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="education_level">Education Level</Label>
          <Input
            id="education_level"
            name="education_level"
            value={formData.education_level}
            onChange={handleInputChange}
            placeholder="e.g., Graduate, HSC"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimated_value">Estimated Value</Label>
          <Input
            id="estimated_value"
            name="estimated_value"
            type="number"
            value={formData.estimated_value}
            onChange={handleInputChange}
            placeholder="e.g., 5000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="next_follow_up">Next Follow-up Date</Label>
          <Input id="next_follow_up" name="next_follow_up" type="date" value={formData.next_follow_up} onChange={handleInputChange} />
        </div>
      </div>

      {/* Updated Assign To field with SearchableUserSelect */}
      <div>
        <Label>Assign To (Optional)</Label>
        <SearchableUserSelect
          users={users.filter(u => u.department === 'admission')}
          value={formData.assigned_to}
          onChange={(value) => setFormData({...formData, assigned_to: value})}
          placeholder="Search and select admission team member..."
          allowClear={true}
          showAvatar={true}
          showBadge={true}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={4} />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="btn-primary">Save Lead</Button>
      </div>
    </form>
  );
}
