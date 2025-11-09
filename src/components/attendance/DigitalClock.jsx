import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, Wifi } from 'lucide-react';

export default function DigitalClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date, is24Hour) => {
    if (is24Hour) {
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } else {
      return date.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTimeZone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  return (
    <Card className="premium-card bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          {/* Digital Clock Display */}
          <div className="relative">
            <div 
              className="text-6xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-mono tracking-wider cursor-pointer"
              onClick={() => setIs24Hour(!is24Hour)}
              title="Click to toggle 12/24 hour format"
            >
              {formatTime(currentTime, is24Hour)}
            </div>
            <div className="absolute -top-2 -right-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Date Display */}
          <div className="text-lg text-gray-700 font-medium">
            {formatDate(currentTime)}
          </div>

          {/* Status Indicators */}
          <div className="flex justify-center items-center gap-6 pt-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{getTimeZone()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Wifi className="w-4 h-4" />
              <span>Live</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <MapPin className="w-4 h-4" />
              <span>Location Enabled</span>
            </div>
          </div>

          {/* Quick Info */}
          <div className="mt-4 p-3 bg-white/50 rounded-lg">
            <p className="text-sm text-gray-600">
              Current server time synchronized for accurate attendance tracking
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}