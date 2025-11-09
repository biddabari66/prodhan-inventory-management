import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Plus } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const apps = [
  {
    name: 'Zoom',
    description: 'Connect your Zoom account to track live class attendance.',
    logo: 'https://cdn.icon-icons.com/icons2/195/PNG/256/Zoom_23700.png',
    status: 'Connected'
  },
  {
    name: 'Facebook Lead Ads',
    description: 'Automatically import leads from your Facebook campaigns.',
    logo: 'https://cdn.icon-icons.com/icons2/2428/PNG/512/facebook_black_logo_icon_147136.png',
    status: 'Connected'
  },
  {
    name: 'N8N',
    description: 'Create custom automation workflows with N8N.',
    logo: 'https://n8n.io/n8n-logo.png',
    status: 'Not Connected'
  }
];

export default function ThirdPartyApps() {
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Third-Party Apps</h1>
          <p className="text-gray-600 mt-1">Manage integrations with external applications.</p>
        </div>
        <Button asChild>
          <Link to={createPageUrl('Integrations')}>
            <Zap className="w-4 h-4 mr-2" />
            Manage Integrations
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {apps.map(app => (
          <Card key={app.name}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <img src={app.logo} alt={app.name} className="w-12 h-12" />
                <CardTitle>{app.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{app.description}</p>
              <Button variant={app.status === 'Connected' ? 'outline' : 'default'}>
                {app.status === 'Connected' ? 'Manage' : 'Connect'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}