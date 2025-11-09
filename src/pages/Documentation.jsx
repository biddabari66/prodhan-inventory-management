import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Book, Search, Play, Users, DollarSign, BarChart3, Package, 
  Target, Clock, Settings, Shield, FileText, Zap, ChevronRight,
  Video, Download, ExternalLink, Star, CheckCircle, ArrowRight,
  Lightbulb, AlertTriangle, Info, Sparkles, BookOpen, Globe,
  Monitor, Smartphone, Tablet
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

const Documentation = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('getting-started');
  const navigate = useNavigate();

  // Documentation structure
  const documentationSections = {
    'getting-started': {
      title: 'Getting Started',
      icon: Play,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'New to Biddabari ERP? Start here for a comprehensive introduction.',
      articles: [
        {
          id: 'welcome',
          title: 'Welcome to Biddabari ERP',
          duration: '5 min read',
          difficulty: 'Beginner',
          content: `
# Welcome to Biddabari ERP 🎉

**Biddabari ERP** is a comprehensive Enterprise Resource Planning system specifically designed for educational institutions. Built with modern technology and AI-powered features, it streamlines all aspects of your organization's operations.

## What Makes Biddabari ERP Special?

### 🤖 AI-Powered Intelligence
- **Predictive Analytics**: Forecast admissions, revenue, and resource needs
- **Automated Insights**: Get daily AI-generated business recommendations
- **Smart Anomaly Detection**: Automatically identify unusual patterns in your data
- **Contextual Assistant**: AI helper that adapts to your current work context

### 🔒 Enterprise-Grade Security
- **Role-Based Access Control**: Granular permissions for every user
- **Audit Trail**: Complete tracking of all system activities
- **Session Management**: Secure login/logout with idle timeout protection
- **Data Encryption**: All sensitive data is encrypted at rest and in transit

### 📊 Comprehensive Modules
Our ERP covers all essential business functions:
- **Dashboard**: Real-time KPIs and analytics
- **CRM & Leads**: Complete lead management with Facebook integration
- **Admissions**: Student enrollment and document management
- **Finance**: Income, expenses, budgeting, and financial reports
- **Human Resources**: Employee management, attendance, performance tracking
- **Inventory**: Stock management with automated alerts
- **Reporting**: Custom and automated report generation

## Your First Steps

1. **Explore the Dashboard**: Start with the main dashboard to get an overview of your organization's health
2. **Set Up Your Profile**: Complete your user profile for personalized experience
3. **Check Permissions**: Ensure you have access to the modules you need
4. **Try the AI Assistant**: Click the chat icon to get contextual help

## Need Help?
- Use the search function above to find specific topics
- Check our video tutorials for visual guidance
- Contact your system administrator for access issues
- Use the AI assistant for instant help
          `
        },
        {
          id: 'navigation',
          title: 'Navigating the Interface',
          duration: '3 min read',
          difficulty: 'Beginner',
          content: `
# Navigating the Biddabari ERP Interface

## Main Navigation
The sidebar on the left contains all major modules:

### 📱 Responsive Design
- **Desktop**: Full sidebar with module names and icons
- **Tablet**: Collapsible sidebar for optimal screen usage
- **Mobile**: Bottom navigation bar for easy thumb access

### 🎨 Theme Options
- **Light Mode**: Clean, professional appearance for day use
- **Dark Mode**: Eye-friendly option for extended screen time
- Toggle themes using the sun/moon icon in the header

### 🌐 Language Support
Currently supports:
- **English**: Default interface language
- **Bengali**: বাংলা ভাষায় সম্পূর্ণ ইন্টারফেস

## Header Features
- **Universal Search**: Find any record across all modules
- **Notifications**: Real-time alerts and updates
- **Profile Menu**: Access settings and logout options
- **Theme Toggle**: Switch between light and dark modes

## Navigation Tips
- **Breadcrumbs**: Always know where you are in the system
- **Quick Actions**: Use keyboard shortcuts where available
- **Context Menus**: Right-click for additional options
- **Back Button**: Browser back button works seamlessly
          `
        },
        {
          id: 'dashboard-overview',
          title: 'Understanding Your Dashboard',
          duration: '4 min read',
          difficulty: 'Beginner',
          content: `
# Understanding Your Dashboard

The dashboard is your command center, providing real-time insights into your organization's performance.

## Key Performance Indicators (KPIs)

### 💰 Financial Metrics
- **Total Revenue**: Current period income from all sources
- **Total Expenses**: Operational costs and expenditures
- **Net Profit**: Revenue minus expenses
- **ROAS**: Return on Advertising Spend
- **ROI**: Overall Return on Investment

### 👥 Student & Lead Metrics
- **New Admissions Today**: Daily enrollment count
- **Lead Conversion Rate**: Percentage of leads becoming students
- **Student Retention**: Long-term engagement metrics

### 📊 Operational Metrics
- **Attendance Rate**: Employee punctuality and presence
- **Inventory Alerts**: Low stock and out-of-stock items
- **Pending Approvals**: Items requiring your attention

## Interactive Features

### 🔍 Drill-Down Analysis
Click on any KPI card to:
- View detailed breakdowns
- See historical trends
- Access related records

### 📈 Chart Analysis
- **Revenue Charts**: Track income patterns over time
- **Expense Breakdown**: Understand where money is spent
- **Trend Analysis**: Spot patterns and opportunities

### 🤖 AI Insights
The AI Insights panel provides:
- **Daily Recommendations**: Actionable business advice
- **Anomaly Alerts**: Unusual patterns requiring attention
- **Predictive Forecasts**: Future trend predictions

## Customization Options
- **Time Periods**: Switch between daily, weekly, monthly views
- **Module Focus**: Highlight metrics from specific departments
- **Alert Preferences**: Customize which alerts you receive
          `
        }
      ]
    },
    'modules': {
      title: 'Module Guides',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Detailed guides for each ERP module.',
      articles: [
        {
          id: 'crm-leads',
          title: 'CRM & Lead Management',
          duration: '8 min read',
          difficulty: 'Intermediate',
          content: `
# CRM & Lead Management Guide

## Overview
The CRM module helps you manage potential students from first contact to enrollment.

## Key Features

### 📱 Facebook Integration
- **Automatic Lead Import**: Leads from Facebook ads sync automatically
- **Campaign Tracking**: See which ads generate the most leads
- **Lead Scoring**: AI-powered scoring based on engagement

### 🎯 Lead Pipeline
1. **New Leads**: Fresh inquiries requiring initial contact
2. **Contacted**: Leads that have been reached out to
3. **Qualified**: Serious prospects showing genuine interest
4. **Proposal Sent**: Leads who have received course information
5. **Converted**: Leads who became paying students

### 📞 Follow-up Management
- **Scheduled Callbacks**: Never miss a follow-up opportunity
- **Call History**: Track all interactions with each lead
- **Automated Reminders**: Get notified about overdue follow-ups

## Best Practices

### 🚀 Lead Response
- **Speed Matters**: Contact new leads within 5 minutes when possible
- **Multiple Channels**: Use phone, SMS, and WhatsApp for contact
- **Persistence**: Follow up 5-7 times before marking as unresponsive

### 📝 Data Quality
- **Complete Profiles**: Fill in all available lead information
- **Regular Updates**: Keep lead status current
- **Notes Documentation**: Record all interactions and outcomes

## Lead Sources
- **Facebook Ads**: Automatically imported with campaign data
- **Google Ads**: Manual entry with UTM tracking
- **Website**: Contact form submissions
- **Referrals**: Student and staff referrals
- **Walk-ins**: Direct office visits

## Reporting & Analytics
- **Conversion Rates**: Track lead-to-student conversion
- **Source Performance**: Identify best-performing channels
- **Team Performance**: Monitor individual staff performance
- **Campaign ROI**: Calculate return on marketing investment
          `
        },
        {
          id: 'admissions',
          title: 'Student Admissions Process',
          duration: '6 min read',
          difficulty: 'Intermediate',
          content: `
# Student Admissions Process

## Overview
Streamlined student enrollment from application to course assignment.

## Admission Workflow

### 1️⃣ Initial Application
- **Student Information**: Collect comprehensive student details
- **Course Selection**: Choose from available programs
- **Document Collection**: Gather required certificates and IDs

### 2️⃣ Assessment & Interview
- **Eligibility Check**: Verify academic qualifications
- **Interview Scheduling**: Arrange assessment meetings
- **Skill Evaluation**: Test relevant competencies

### 3️⃣ Enrollment Confirmation
- **Fee Payment**: Process admission fees
- **Document Verification**: Validate submitted documents
- **Course Assignment**: Assign to specific batches

## Payment Processing
- **Multiple Methods**: Cash, card, online, installments
- **Payment Tracking**: Monitor payment status
- **Receipt Generation**: Automatic invoice creation
- **Refund Management**: Handle withdrawal requests

## Course Categories
- **BCS Preparation**: Government job preparation
- **Bank Job Prep**: Banking sector training
- **NTRCA**: Teacher recruitment preparation
- **IT Courses**: Technology skill development
- **Recorded Courses**: Self-paced learning options

## Student Records
- **Academic History**: Previous education details
- **Contact Information**: Student and guardian contacts
- **Progress Tracking**: Course completion status
- **Attendance Records**: Class participation tracking

## Batch Management
- **Capacity Planning**: Optimize class sizes
- **Schedule Coordination**: Avoid timing conflicts
- **Instructor Assignment**: Match teachers to batches
- **Resource Allocation**: Ensure adequate facilities
          `
        },
        {
          id: 'finance-management',
          title: 'Financial Management',
          duration: '10 min read',
          difficulty: 'Advanced',
          content: `
# Financial Management System

## Overview
Comprehensive financial tracking, budgeting, and reporting capabilities.

## Income Management

### 📈 Revenue Streams
- **Course Fees**: Primary income from student enrollments
- **Book Sales**: Educational material revenue
- **Consultation**: Advisory service income
- **Corporate Training**: Business-to-business services

### 💳 Payment Processing
- **Multiple Channels**: Cash, card, online, bank transfer
- **Installment Plans**: Flexible payment options
- **Receipt Management**: Automated invoice generation
- **Tax Calculation**: Built-in tax computation

## Expense Tracking

### 🏷️ Expense Categories
- **Marketing**: Advertising and promotional costs
- **Operations**: Day-to-day running expenses
- **Salaries**: Staff compensation and benefits
- **Infrastructure**: Rent, utilities, maintenance
- **Technology**: Software licenses, equipment

### ✅ Approval Workflow
1. **Submission**: Employee submits expense request
2. **Manager Review**: Department head approval
3. **Finance Check**: Financial controller verification
4. **Final Approval**: Director/CEO authorization
5. **Payment**: Expense reimbursement processed

## Budgeting & Planning

### 📊 Budget Creation
- **Annual Budgets**: Yearly financial planning
- **Department Budgets**: Module-specific allocations
- **Project Budgets**: Specific initiative funding
- **Contingency Reserves**: Emergency fund allocation

### 📉 Variance Analysis
- **Budget vs Actual**: Compare planned vs real spending
- **Trend Analysis**: Identify spending patterns
- **Forecast Adjustments**: Update projections based on performance
- **Alert System**: Notifications for budget overruns

## Financial Reporting

### 📋 Standard Reports
- **Profit & Loss**: Income and expense summary
- **Cash Flow**: Money movement tracking
- **Balance Sheet**: Asset and liability overview
- **Tax Reports**: Compliance documentation

### 🎯 Custom Analytics
- **Revenue per Student**: Profitability by enrollment
- **Cost per Acquisition**: Marketing efficiency metrics
- **Department Profitability**: Module-wise performance
- **Seasonal Trends**: Time-based financial patterns

## Compliance & Audit
- **Audit Trail**: Complete transaction history
- **Tax Compliance**: Automated tax calculations
- **Regulatory Reports**: Government submission ready
- **Internal Controls**: Fraud prevention measures
          `
        }
      ]
    },
    'tutorials': {
      title: 'Video Tutorials',
      icon: Video,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Step-by-step video guides for complex procedures.',
      articles: [
        {
          id: 'system-setup',
          title: 'Initial System Setup',
          duration: '15 min video',
          difficulty: 'Beginner',
          videoUrl: '#',
          content: `
# Initial System Setup (Video Tutorial)

## What You'll Learn
- Complete system configuration
- User account creation
- Permission setup
- Integration configuration

## Tutorial Sections
1. **Admin Account Setup** (3 minutes)
2. **Department Configuration** (4 minutes)
3. **User Permission Matrix** (5 minutes)
4. **Integration Setup** (3 minutes)

## Prerequisites
- Administrator access
- Integration API keys (if applicable)
- User list with roles defined

[▶️ Watch Tutorial Video](#)
          `
        },
        {
          id: 'lead-management',
          title: 'Advanced Lead Management',
          duration: '20 min video',
          difficulty: 'Intermediate',
          videoUrl: '#',
          content: `
# Advanced Lead Management (Video Tutorial)

## Tutorial Overview
Master the complete lead management workflow from Facebook integration to conversion.

## Video Sections
1. **Facebook Integration Setup** (5 minutes)
2. **Lead Scoring Configuration** (4 minutes)
3. **Pipeline Management** (6 minutes)
4. **Follow-up Automation** (5 minutes)

## Key Takeaways
- Optimize lead conversion rates
- Automate repetitive tasks
- Track performance metrics
- Scale your admissions process

[▶️ Watch Tutorial Video](#)
          `
        }
      ]
    },
    'api-reference': {
      title: 'API Reference',
      icon: FileText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description: 'Technical documentation for developers and integrations.',
      articles: [
        {
          id: 'authentication',
          title: 'Authentication & Security',
          duration: '5 min read',
          difficulty: 'Advanced',
          content: `
# Authentication & Security

## Authentication Methods

### 🔑 User Authentication
\`\`\`javascript
// Login user
const user = await User.login();

// Get current user
const currentUser = await User.me();

// Logout user
await User.logout();
\`\`\`

### 🛡️ Permission Checking
\`\`\`javascript
// Check user permissions
const hasAccess = await checkUserPermission(userId, 'finance', 'can_view');

// Role-based access
if (user.job_role === 'admin') {
  // Admin access
}
\`\`\`

## Security Best Practices

### 🔐 Data Protection
- All API calls require authentication
- Sensitive data is encrypted at rest
- Regular security audits performed
- Session timeout for inactive users

### 🚨 Audit Trail
- All actions are logged
- User activity tracking
- Change history maintained
- Security event monitoring

## Rate Limiting
- API calls limited per user/hour
- Protection against abuse
- Fair usage policies
- Automatic throttling
          `
        },
        {
          id: 'integrations',
          title: 'External Integrations',
          duration: '8 min read',
          difficulty: 'Advanced',
          content: `
# External Integrations

## Available Integrations

### 📱 Facebook Integration
\`\`\`javascript
// Setup Facebook lead sync
const facebookSync = await setupFacebookIntegration({
  appId: 'YOUR_APP_ID',
  appSecret: 'YOUR_APP_SECRET',
  accessToken: 'YOUR_ACCESS_TOKEN'
});
\`\`\`

### 💬 WhatsApp Business API
\`\`\`javascript
// Send WhatsApp message
const message = await sendWhatsAppMessage({
  to: '+1234567890',
  template: 'admission_confirmation',
  parameters: ['John Doe', 'BCS Course']
});
\`\`\`

### 🚚 Steadfast Courier
\`\`\`javascript
// Create delivery order
const delivery = await createDeliveryOrder({
  recipient: 'Customer Name',
  address: 'Delivery Address',
  codAmount: 500,
  items: ['Course Materials']
});
\`\`\`

## Integration Setup

### 🔧 Configuration Steps
1. Obtain API credentials from service provider
2. Add credentials to system secrets
3. Configure integration settings
4. Test connection and functionality
5. Enable integration for production use

### ⚙️ Webhook Configuration
- Set up webhook endpoints
- Configure event triggers
- Implement error handling
- Monitor webhook reliability

## Error Handling
- Automatic retry mechanisms
- Error logging and alerting
- Graceful degradation
- Manual intervention options
          `
        }
      ]
    },
    'troubleshooting': {
      title: 'Troubleshooting',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Common issues and their solutions.',
      articles: [
        {
          id: 'common-issues',
          title: 'Common Issues & Solutions',
          duration: '6 min read',
          difficulty: 'Beginner',
          content: `
# Common Issues & Solutions

## Login Problems

### 🚫 Cannot Login
**Symptoms**: Error message on login attempt
**Solutions**:
- Check email and password spelling
- Try clearing browser cache and cookies
- Contact administrator to verify account status
- Ensure stable internet connection

### ⏰ Session Timeout
**Symptoms**: Automatically logged out during work
**Solutions**:
- Increase activity to avoid idle timeout
- Save work frequently
- Check session timeout settings
- Contact admin to adjust timeout duration

## Performance Issues

### 🐌 Slow Loading
**Symptoms**: Pages take long time to load
**Solutions**:
- Check internet connection speed
- Clear browser cache
- Close unnecessary browser tabs
- Try different browser
- Report to technical support if persistent

### 📱 Mobile Display Problems
**Symptoms**: Interface looks wrong on mobile
**Solutions**:
- Rotate device to landscape mode
- Use desktop version for complex tasks
- Update browser to latest version
- Clear mobile browser cache

## Data Issues

### 📊 Missing Data
**Symptoms**: Expected records not showing
**Solutions**:
- Check filter settings
- Verify date range selections
- Confirm user permissions for data access
- Contact support if data was accidentally deleted

### 🔄 Sync Problems
**Symptoms**: Facebook/WhatsApp integrations not working
**Solutions**:
- Verify integration status in settings
- Check API credentials validity
- Test internet connectivity
- Contact administrator for integration reset

## Permission Errors

### 🔒 Access Denied
**Symptoms**: "Permission denied" messages
**Solutions**:
- Contact your supervisor or administrator
- Verify your role and department settings
- Check if you're accessing the correct module
- Request additional permissions if needed

## Getting Help

### 📞 Support Channels
- **AI Assistant**: Click chat icon for instant help
- **System Administrator**: Contact your IT department
- **User Manual**: Search this documentation
- **Ticket System**: Submit formal support request

### 🔍 Before Contacting Support
- Note exact error messages
- Record steps that led to the problem
- Try basic troubleshooting steps
- Check if other users have similar issues
          `
        }
      ]
    }
  };

  // Filter articles based on search
  const filteredSections = Object.entries(documentationSections).reduce((acc, [key, section]) => {
    if (!searchTerm) return { ...acc, [key]: section };
    
    const filteredArticles = section.articles.filter(article => 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filteredArticles.length > 0) {
      acc[key] = { ...section, articles: filteredArticles };
    }
    return acc;
  }, {});

  const currentSection = documentationSections[selectedCategory];
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    if (currentSection && currentSection.articles.length > 0) {
      setSelectedArticle(currentSection.articles[0]);
    }
  }, [selectedCategory]);

  const handleNavigation = (pageName) => {
    navigate(createPageUrl(pageName));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                📚 Biddabari ERP Documentation
              </h1>
              <p className="text-lg text-gray-600">
                Complete guide to mastering your ERP system
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Live System
              </Badge>
              <Badge className="bg-blue-100 text-blue-800">
                Version 2.0
              </Badge>
            </div>
          </div>
          
          {/* Search */}
          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search documentation... (e.g., 'how to add new employee', 'facebook integration')"
              className="pl-10 h-12 text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Start Cards */}
        {!searchTerm && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-green-500" onClick={() => setSelectedCategory('getting-started')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Play className="w-8 h-8 text-green-600" />
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Quick Start</h3>
                <p className="text-sm text-gray-600">Get up and running in 5 minutes</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-blue-500" onClick={() => handleNavigation('Dashboard')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                  <ExternalLink className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">View Dashboard</h3>
                <p className="text-sm text-gray-600">See your live ERP dashboard</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-purple-500" onClick={() => setSelectedCategory('tutorials')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Video className="w-8 h-8 text-purple-600" />
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Video Tutorials</h3>
                <p className="text-sm text-gray-600">Visual step-by-step guides</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-red-500" onClick={() => setSelectedCategory('troubleshooting')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
                <p className="text-sm text-gray-600">Troubleshooting & support</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="w-5 h-5" />
                  Documentation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {Object.entries(filteredSections).map(([key, section]) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedCategory(key)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                          selectedCategory === key ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700' : ''
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${section.color}`} />
                        <div>
                          <div className="font-medium">{section.title}</div>
                          <div className="text-xs text-gray-500">{section.articles.length} articles</div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {currentSection && (
              <div className="space-y-6">
                {/* Section Header */}
                <Card className={`${currentSection.bgColor} border-0`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                        <currentSection.icon className={`w-6 h-6 ${currentSection.color}`} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{currentSection.title}</h2>
                        <p className="text-gray-600 mt-1">{currentSection.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Article List */}
                <div className="grid gap-4">
                  {currentSection.articles.map((article) => (
                    <Card 
                      key={article.id} 
                      className="hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => setSelectedArticle(article)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {article.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {article.duration}
                              </span>
                              <Badge variant="outline">{article.difficulty}</Badge>
                              {article.videoUrl && (
                                <span className="flex items-center gap-1 text-purple-600">
                                  <Video className="w-4 h-4" />
                                  Video Tutorial
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Article Modal/Detail View */}
        {selectedArticle && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedArticle.title}</h2>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    <span>{selectedArticle.duration}</span>
                    <Badge variant="outline">{selectedArticle.difficulty}</Badge>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setSelectedArticle(null)}>
                  ✕
                </Button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: selectedArticle.content.replace(/\n/g, '<br/>').replace(/### /g, '<h3>').replace(/## /g, '<h2>').replace(/# /g, '<h1>') }} />
                </div>
                
                {selectedArticle.videoUrl && (
                  <div className="mt-6 p-4 bg-purple-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Video className="w-6 h-6 text-purple-600" />
                      <div>
                        <p className="font-medium text-purple-900">Video Tutorial Available</p>
                        <p className="text-sm text-purple-700">Watch the complete step-by-step guide</p>
                      </div>
                      <Button className="ml-auto" onClick={() => window.open(selectedArticle.videoUrl, '_blank')}>
                        <Play className="w-4 h-4 mr-2" />
                        Watch Video
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Documentation;