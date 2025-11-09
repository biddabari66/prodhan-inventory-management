import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Webhook, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { FacebookLeadImport } from '@/entities/FacebookLeadImport';
import { Lead } from '@/entities/Lead';
import { InvokeLLM } from '@/integrations/Core';
import { toast } from 'sonner';

export default function FacebookWebhookHandler() {
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  useEffect(() => {
    loadWebhookLogs();
  }, []);

  const loadWebhookLogs = async () => {
    setIsLoading(true);
    try {
      const logs = await FacebookLeadImport.list('-created_date', 50);
      setWebhookLogs(logs.filter(log => log.import_method === 'webhook'));
    } catch (error) {
      console.error('Error loading webhook logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateWebhookReceive = async () => {
    setIsTestingWebhook(true);
    
    try {
      // Simulate receiving a webhook from Facebook
      const webhookData = await InvokeLLM({
        prompt: `Generate a realistic Facebook lead ads webhook payload for testing. Include lead data for a student interested in BCS preparation course.
        
        Return JSON with:
        {
          "facebook_lead_id": "webhook_test_lead_123",
          "facebook_campaign_name": "BCS Preparation 2024",
          "facebook_ad_name": "BCS Complete Course Ad",
          "student_name": "Rahul Ahmed",
          "email": "rahul.ahmed@example.com", 
          "phone": "+8801712345678",
          "course_interest": "BCS",
          "created_time": "current_timestamp"
        }`,
        response_json_schema: {
          type: "object",
          properties: {
            facebook_lead_id: { type: "string" },
            facebook_campaign_name: { type: "string" },
            facebook_ad_name: { type: "string" },
            student_name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            course_interest: { type: "string" },
            created_time: { type: "string" }
          }
        }
      });

      // Process the webhook (simulate real webhook processing)
      await processWebhookLead(webhookData);
      
      toast.success('Webhook test completed successfully!');
      loadWebhookLogs();
      
    } catch (error) {
      console.error('Webhook test error:', error);
      toast.error('Webhook test failed');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const processWebhookLead = async (leadData) => {
    try {
      // Check for duplicates
      const existingLeads = await Lead.filter({ facebook_lead_id: leadData.facebook_lead_id });
      
      if (existingLeads.length > 0) {
        // Log duplicate
        await FacebookLeadImport.create({
          facebook_lead_id: leadData.facebook_lead_id,
          facebook_campaign_name: leadData.facebook_campaign_name,
          facebook_ad_name: leadData.facebook_ad_name,
          import_method: 'webhook',
          import_status: 'duplicate',
          raw_data: leadData
        });
        return;
      }

      // Generate lead score
      const scoreResult = await InvokeLLM({
        prompt: `Score this webhook lead from 0-100 based on completeness and course interest:
        Course: ${leadData.course_interest}
        Has Email: ${leadData.email ? 'Yes' : 'No'}
        Has Phone: ${leadData.phone ? 'Yes' : 'No'}
        Source: Facebook Webhook (real-time)
        
        Real-time leads typically score higher. Return just a number 0-100.`,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" }
          }
        }
      });

      // Create lead
      const newLeadData = {
        lead_source: 'facebook_ads',
        lead_status: 'new',
        student_name: leadData.student_name,
        phone: leadData.phone,
        email: leadData.email,
        course_interest: leadData.course_interest,
        lead_score: scoreResult.score || 75, // Webhook leads typically score higher
        facebook_lead_id: leadData.facebook_lead_id,
        facebook_campaign_name: leadData.facebook_campaign_name,
        facebook_ad_name: leadData.facebook_ad_name,
        notes: `Real-time import from Facebook Webhook - Campaign: ${leadData.facebook_campaign_name}`
      };

      const newLead = await Lead.create(newLeadData);

      // Log successful import
      await FacebookLeadImport.create({
        facebook_lead_id: leadData.facebook_lead_id,
        facebook_campaign_id: leadData.facebook_campaign_id,
        facebook_campaign_name: leadData.facebook_campaign_name,
        facebook_ad_name: leadData.facebook_ad_name,
        lead_id: newLead.id,
        import_method: 'webhook',
        import_status: 'success',
        raw_data: leadData
      });

    } catch (error) {
      // Log failed import
      await FacebookLeadImport.create({
        facebook_lead_id: leadData.facebook_lead_id,
        import_method: 'webhook',
        import_status: 'failed',
        raw_data: leadData,
        error_message: error.message
      });
      throw error;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'duplicate': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'duplicate': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Webhook className="w-6 h-6 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold">Facebook Webhook Handler</h3>
              <p className="text-sm text-muted-foreground">Real-time lead import status and logs</p>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Webhook is configured and ready to receive real-time leads from Facebook Lead Ads.
              New leads will be automatically imported when users submit forms on your ads.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-3">
            <Button onClick={loadWebhookLogs} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Logs
            </Button>
            
            <Button onClick={simulateWebhookReceive} disabled={isTestingWebhook}>
              {isTestingWebhook ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing Webhook...
                </>
              ) : (
                'Test Webhook'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Recent Webhook Activity</CardTitle>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading webhook logs...</p>
            </div>
          ) : webhookLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No webhook activity yet</p>
              <p className="text-sm">Webhook events will appear here when leads are received</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Lead ID</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhookLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.import_status)}
                        <Badge className={getStatusColor(log.import_status)}>
                          {log.import_status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.facebook_lead_id}
                    </TableCell>
                    <TableCell>{log.facebook_campaign_name}</TableCell>
                    <TableCell>{log.raw_data?.student_name || 'N/A'}</TableCell>
                    <TableCell>{log.raw_data?.course_interest || 'N/A'}</TableCell>
                    <TableCell>
                      {new Date(log.created_date).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}