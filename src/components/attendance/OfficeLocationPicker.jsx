import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Search, Check, Loader2, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { AttendanceSetting } from '@/entities/AttendanceSetting';

export default function OfficeLocationPicker({ settings, onSettingsChange, currentLocation }) {
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapUrl, setMapUrl] = useState('');

  // Generate Google Maps embed URL
  useEffect(() => {
    if (settings.office_latitude && settings.office_longitude) {
      const url = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${settings.office_latitude},${settings.office_longitude}&zoom=17`;
      setMapUrl(url);
    }
  }, [settings.office_latitude, settings.office_longitude]);

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      onSettingsChange({
        ...settings,
        office_latitude: currentLocation.latitude,
        office_longitude: currentLocation.longitude
      });
      toast.success('Office location set to current position');
    } else {
      toast.error('Current location not available');
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a location to search');
      return;
    }

    setIsSearching(true);
    try {
      // Use Nominatim (OpenStreetMap) for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const results = await response.json();

      if (results && results.length > 0) {
        const { lat, lon, display_name } = results[0];
        onSettingsChange({
          ...settings,
          office_latitude: parseFloat(lat),
          office_longitude: parseFloat(lon)
        });
        toast.success(`Location set: ${display_name.substring(0, 50)}...`);
      } else {
        toast.error('Location not found. Try a different search.');
      }
    } catch (error) {
      toast.error('Failed to search location: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const openGoogleMaps = () => {
    const lat = settings.office_latitude || 23.8103;
    const lng = settings.office_longitude || 90.4125;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          Office Location Settings
          <Badge className="bg-red-100 text-red-700 border-0">Admin Only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Search Location */}
        <div className="space-y-3">
          <Label className="text-slate-700 font-semibold">Search Office Location</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location (e.g., Dhaka, Gulshan 2)"
                className="pl-10 border-slate-300"
                onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
              />
            </div>
            <Button 
              onClick={handleSearchLocation} 
              disabled={isSearching}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleUseCurrentLocation}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Use My Current Location
          </Button>
          <Button
            variant="outline"
            onClick={openGoogleMaps}
            className="border-slate-300"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Open in Google Maps
          </Button>
        </div>

        {/* Manual Coordinates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Latitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={settings.office_latitude || ''}
              onChange={(e) => onSettingsChange({ ...settings, office_latitude: parseFloat(e.target.value) || 0 })}
              placeholder="23.7344354"
              className="border-slate-300 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Longitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={settings.office_longitude || ''}
              onChange={(e) => onSettingsChange({ ...settings, office_longitude: parseFloat(e.target.value) || 0 })}
              placeholder="90.3866128"
              className="border-slate-300 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Check-in Radius (m)</Label>
            <Input
              type="number"
              value={settings.radius_meters || 100}
              onChange={(e) => onSettingsChange({ ...settings, radius_meters: parseInt(e.target.value) || 100 })}
              placeholder="100"
              className="border-slate-300"
            />
          </div>
        </div>

        {/* IP Address Management */}
        <div className="space-y-4">
          <h3 className="font-medium">IP Address Verification (Optional)</h3>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 mb-3">
              Enable IP verification to only allow check-ins from approved IP addresses (PC/Mobile).
              Employees can still check in from office location via GPS regardless of IP settings.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="require_ip"
                checked={settings.require_ip_verification || false}
                onChange={(e) => onSettingsChange({ ...settings, require_ip_verification: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="require_ip" className="text-sm font-medium text-blue-900">
                Require IP Verification (In addition to GPS)
              </Label>
            </div>
          </div>
        </div>

        {/* Map Preview */}
        {settings.office_latitude && settings.office_longitude && (
          <div className="space-y-3">
            <Label className="text-slate-700 font-semibold">Location Preview</Label>
            <div className="rounded-xl overflow-hidden border-2 border-slate-200 h-[300px] bg-slate-100">
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${settings.office_longitude - 0.005},${settings.office_latitude - 0.005},${settings.office_longitude + 0.005},${settings.office_latitude + 0.005}&layer=mapnik&marker=${settings.office_latitude},${settings.office_longitude}`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Check className="w-4 h-4 text-green-600" />
              Employees must check in within <span className="font-bold text-red-600">{settings.radius_meters || 100}m</span> of this location
            </div>
          </div>
        )}

        {/* Current Location Info */}
        {currentLocation && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Your Current Location
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-green-600">Lat:</span>{' '}
                <span className="font-mono font-medium">{currentLocation.latitude.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-green-600">Lng:</span>{' '}
                <span className="font-mono font-medium">{currentLocation.longitude.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-green-600">Accuracy:</span>{' '}
                <span className="font-medium">{Math.round(currentLocation.accuracy)}m</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}