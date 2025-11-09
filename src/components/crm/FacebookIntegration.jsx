
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Facebook, CheckCircle, AlertCircle, RefreshCw, Users, Target, Download, ExternalLink, Shield, Settings } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FacebookIntegration } from '@/entities/FacebookIntegration';
import { Lead } from '@/entities/Lead';
import { User } from '@/entities/User';
import { toast } from 'sonner';
import { facebookAuth } from '@/functions/facebookAuth';

export default function FacebookIntegrationComponent() {
  const [currentUser, setCurrentUser] = useState(null);
  const [integration, setIntegration] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [fbSDKLoaded, setFbSDKLoaded] = useState(false);
  const [appId, setAppId] = useState(null);
  
  // Page selection state
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [availablePages, setAvailablePages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [userAccessToken, setUserAccessToken] = useState(null);

  useEffect(() => {
    initializeComponent();
  }, []);

  const initializeComponent = async () => {
    setIsLoading(true);
    await loadCurrentUser();
    await loadIntegration();
    await loadFacebookSDK();
    setIsLoading(false);
  };

  const loadCurrentUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadIntegration = async () => {
    try {
      const user = await User.me();
      if (!user) return;
      
      const integrations = await FacebookIntegration.filter({ user_id: user.id });
      if (integrations.length > 0) {
        setIntegration(integrations[0]);
        setSelectedPages(integrations[0].pages || []);
      }
    } catch (error) {
      console.error('Error loading existing integration:', error);
    }
  };

  const loadFacebookSDK = async () => {
    try {
      // Call the backend function to get the App ID
      const response = await facebookAuth({ action: 'get_app_id' });
      
      if (!response || !response.data || !response.data.appId) {
        toast.error("Could not load Facebook SDK configuration.");
        return;
      }
      
      setAppId(response.data.appId);

      // Load Facebook SDK
      if (!window.FB && !document.getElementById('facebook-jssdk')) {
        window.fbAsyncInit = function() {
          window.FB.init({
            appId: response.data.appId,
            cookie: true,
            xfbml: false,
            version: 'v20.0'
          });
          
          setFbSDKLoaded(true);
          toast.success('Facebook SDK loaded successfully!');
        };

        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.onload = () => {
          console.log('Facebook SDK script loaded');
        };
        script.onerror = () => {
          console.error('Failed to load Facebook SDK script');
          toast.error('Failed to load Facebook SDK');
        };
        document.head.appendChild(script);
      } else if (window.FB) {
        setFbSDKLoaded(true);
      }
    } catch (error) {
      console.error('Error loading Facebook SDK:', error);
      toast.error('Failed to load Facebook SDK: ' + error.message);
    }
  };

  const handleFacebookLogin = () => {
    if (!fbSDKLoaded || !window.FB) {
      toast.error('Facebook SDK not loaded. Please refresh the page.');
      return;
    }

    setIsConnecting(true);

    const requiredScopes = [
      'public_profile',
      'email', 
      'pages_show_list',
      'pages_read_engagement',
      'leads_retrieval',
      'business_management'
    ];

    window.FB.login((response) => {
      if (response.authResponse && response.authResponse.accessToken) {
        handleSuccessfulAuth(response.authResponse);
      } else {
        toast.warning('Facebook login was cancelled or failed.');
        setIsConnecting(false);
      }
    }, {
      scope: requiredScopes.join(','),
      return_scopes: true,
      auth_type: 'rerequest'
    });
  };

  const handleSuccessfulAuth = async (authResponse) => {
    try {
      toast.info('Exchanging Facebook token...');
      
      const response = await facebookAuth({
        action: 'exchange_token',
        accessToken: authResponse.accessToken
      });

      if (!response.data || response.error) {
        throw new Error(response.error?.message || 'Failed to exchange Facebook token.');
      }

      setUserAccessToken(response.data.access_token);
      toast.success('Facebook connected! Now loading your pages...');
      
      // Fetch user's pages
      await fetchUserPages(response.data.access_token);

    } catch (error) {
      console.error('Error processing Facebook auth:', error);
      toast.error('Failed to process Facebook authentication: ' + error.message);
      setIsConnecting(false);
    }
  };

  const fetchUserPages = async (accessToken) => {
    setIsLoadingPages(true);
    try {
      const response = await facebookAuth({
        action: 'fetch_pages',
        accessToken: accessToken
      });

      setAvailablePages(response.data.pages || []);
      setShowPageSelector(true);
      setIsConnecting(false);
      
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast.error('Failed to fetch Facebook pages: ' + error.message);
      setIsConnecting(false);
    } finally {
      setIsLoadingPages(false);
    }
  };

  const handlePageSelection = (page, isSelected) => {
    setSelectedPages(prev => {
      if (isSelected) {
        return [...prev, page];
      } else {
        return prev.filter(p => p.id !== page.id);
      }
    });
  };

  const saveSelectedPages = async () => {
    if (selectedPages.length === 0) {
      toast.warning('Please select at least one page.');
      return;
    }

    try {
      const integrationData = {
        user_id: currentUser.id,
        facebook_user_id: `fb_${Date.now()}`,
        access_token: userAccessToken,
        token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
        pages: selectedPages,
        ad_accounts: [], // Will be populated later
        status: 'connected',
        last_sync: null
      };

      let savedIntegration;
      if (integration) {
        savedIntegration = await FacebookIntegration.update(integration.id, integrationData);
      } else {
        savedIntegration = await FacebookIntegration.create(integrationData);
      }

      setIntegration(savedIntegration);
      setShowPageSelector(false);
      toast.success(`Successfully connected ${selectedPages.length} Facebook pages!`);

    } catch (error) {
      console.error('Error saving pages:', error);
      toast.error('Failed to save page selection: ' + error.message);
    }
  };

  const handleSyncLeads = async () => {
    if (!integration || !integration.pages || integration.pages.length === 0) {
      toast.warning('No pages selected for lead sync.');
      return;
    }

    setIsSyncing(true);
    let totalImported = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;

    try {
      toast.info('Starting lead sync from selected pages...');

      for (const page of integration.pages) {
        try {
          // First fetch lead forms for this page
          const formsResponse = await facebookAuth({
            action: 'fetch_lead_forms',
            pageId: page.id,
            pageAccessToken: page.access_token
          });

          const forms = formsResponse.data.forms || [];
          toast.info(`Found ${forms.length} lead forms on ${page.name}`);

          // Sync leads from each form
          for (const form of forms) {
            try {
              const leadsResponse = await facebookAuth({
                action: 'sync_leads',
                formId: form.id,
                pageAccessToken: page.access_token
              });

              const leads = leadsResponse.data.leads || [];
              
              for (const fbLead of leads) {
                try {
                  // Check for duplicates
                  const existingLeads = await Lead.filter({ facebook_lead_id: fbLead.id });
                  
                  if (existingLeads.length > 0) {
                    totalDuplicates++;
                    continue;
                  }

                  // Parse lead data
                  const leadData = {};
                  fbLead.field_data?.forEach(field => {
                    switch(field.name) {
                      case 'full_name':
                        leadData.student_name = field.values[0];
                        break;
                      case 'phone_number':
                        leadData.phone = field.values[0];
                        break;
                      case 'email':
                        leadData.email = field.values[0];
                        break;
                      case 'course_interest':
                        leadData.course_interest = field.values[0]?.toLowerCase();
                        break;
                    }
                  });

                  // Create lead in CRM
                  await Lead.create({
                    lead_source: 'facebook_ads',
                    lead_status: 'new',
                    student_name: leadData.student_name || 'Facebook Lead',
                    phone: leadData.phone,
                    email: leadData.email,
                    course_interest: leadData.course_interest || 'general',
                    facebook_lead_id: fbLead.id,
                    facebook_campaign_name: `${page.name} - ${form.name}`,
                    facebook_ad_name: form.name,
                    lead_score: 75,
                    notes: `Auto-imported from Facebook Lead Ads\nPage: ${page.name}\nForm: ${form.name}\nImported: ${new Date().toLocaleString()}`
                  });

                  totalImported++;

                } catch (leadError) {
                  console.error('Error importing individual lead:', leadError);
                  totalErrors++;
                }
              }
            } catch (formError) {
              console.error('Error syncing form leads:', formError);
              totalErrors++;
            }
          }
        } catch (pageError) {
          console.error('Error processing page:', pageError);
          totalErrors++;
        }
      }

      // Update last sync time
      await FacebookIntegration.update(integration.id, {
        last_sync: new Date().toISOString()
      });

      setSyncStats({ 
        imported: totalImported, 
        duplicates: totalDuplicates, 
        errors: totalErrors 
      });
      
      toast.success(`Lead sync completed! ${totalImported} new leads imported, ${totalDuplicates} duplicates skipped, ${totalErrors} errors.`);

    } catch (error) {
      console.error('Error during lead sync:', error);
      toast.error('Failed to sync leads: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!integration) return;

    if (window.confirm('Are you sure you want to disconnect Facebook? This will stop automatic lead imports.')) {
      try {
        await FacebookIntegration.update(integration.id, {
          status: 'disconnected',
          access_token: null
        });
        setIntegration({ ...integration, status: 'disconnected' });
        setSelectedPages([]);
        setAvailablePages([]);
        setSyncStats(null);
        toast.success('Disconnected from Facebook');
      } catch (error) {
        console.error('Error disconnecting:', error);
        toast.error('Failed to disconnect');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'disconnected': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card className="premium-card">
        <CardContent className="p-6 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p>Loading Facebook integration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Facebook className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Facebook Lead Ads Integration</h3>
              <p className="text-sm text-muted-foreground">Connect your Facebook account to automatically import leads from your ad campaigns</p>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {integration?.status === 'connected' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-400" />
                )}
                <span className="font-medium">Connection Status</span>
              </div>
              <Badge className={getStatusColor(integration?.status || 'disconnected')}>
                {integration?.status === 'connected' ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>

            {integration?.last_sync && (
              <div className="text-sm text-muted-foreground">
                Last sync: {new Date(integration.last_sync).toLocaleString()}
              </div>
            )}
          </div>

          {/* Main Actions */}
          {integration?.status !== 'connected' ? (
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Click "Connect with Facebook" to authorize this app to access your Facebook Lead Ads data. 
                  You'll be asked to grant permissions for: <strong>Pages Access, Lead Retrieval, and Business Management</strong>.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleFacebookLogin}
                disabled={isConnecting || !fbSDKLoaded}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    {isLoadingPages ? 'Loading Pages...' : 'Connecting to Facebook...'}
                  </>
                ) : (
                  <>
                    <Facebook className="w-5 h-5 mr-2" />
                    Connect with Facebook
                  </>
                )}
              </Button>

              {!fbSDKLoaded && (
                <p className="text-sm text-muted-foreground text-center">
                  Loading Facebook SDK...
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connected Account Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Connected Pages</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {integration.pages?.length || 0} pages selected
                  </div>
                  {integration.pages?.slice(0, 3).map((page) => (
                    <div key={page.id} className="text-xs text-gray-600 mb-1">
                      • {page.name}
                    </div>
                  ))}
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Lead Forms</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Ready to sync from selected pages
                  </div>
                  <div className="text-xs text-gray-600">
                    Forms will be auto-discovered during sync
                  </div>
                </div>
              </div>

              {/* Sync Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSyncLeads}
                  disabled={isSyncing}
                  className="flex-1"
                  size="lg"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Importing Leads...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Import Leads Now
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => setShowPageSelector(true)}
                  size="lg"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Manage Pages
                </Button>

                <Button 
                  variant="outline" 
                  onClick={handleDisconnect}
                  size="lg"
                >
                  Disconnect
                </Button>
              </div>

              {/* Last Sync Results */}
              {syncStats && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-3">Last Import Results</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-700">{syncStats.imported}</div>
                      <div className="text-green-600">New Leads</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-700">{syncStats.duplicates}</div>
                      <div className="text-yellow-600">Duplicates</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-700">{syncStats.errors}</div>
                      <div className="text-red-600">Errors</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help Information */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">How it works</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Connect your Facebook account with the required permissions</li>
              <li>• Select which Facebook Pages you want to import leads from</li>
              <li>• Lead forms on selected pages will be auto-discovered</li>
              <li>• Click "Import Leads" to fetch new leads from your Lead Ad campaigns</li>
              <li>• Leads are automatically added to your CRM with proper attribution</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Page Selection Dialog */}
      <Dialog open={showPageSelector} onOpenChange={setShowPageSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Facebook Pages for Lead Import</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                Select the Facebook pages you want to import leads from. Only pages where you have admin access will show lead generation forms.
              </AlertDescription>
            </Alert>

            {availablePages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isLoadingPages ? 'Loading your Facebook pages...' : 'No pages available. Make sure you have admin access to Facebook pages with lead generation forms.'}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Page Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Token Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availablePages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedPages.some(p => p.id === page.id)}
                            onCheckedChange={(checked) => handlePageSelection(page, checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{page.name}</TableCell>
                        <TableCell>{page.category}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {page.perms?.slice(0, 2).map(perm => (
                              <Badge key={perm} variant="outline" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                            {page.perms?.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{page.perms.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={page.access_token ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {page.access_token ? 'Available' : 'Missing'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    {selectedPages.length} of {availablePages.length} pages selected
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowPageSelector(false)}>
                      Cancel
                    </Button>
                    <Button onClick={saveSelectedPages} disabled={selectedPages.length === 0}>
                      Save Selection ({selectedPages.length})
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
