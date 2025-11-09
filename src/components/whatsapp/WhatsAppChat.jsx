import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Search } from 'lucide-react';

export default function WhatsAppChat({ integration }) {
  const [activeChat, setActiveChat] = useState({ id: 1, name: 'John Doe', lastMessage: 'Interested in the BCS course.' });

  if (!integration || integration.status !== 'active') {
    return (
      <Card>
        <CardContent className="text-center p-8">
          <p>WhatsApp integration is not active. Please configure it in the settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
      {/* Chat List */}
      <Card className="md:col-span-1 h-full flex flex-col">
        <CardHeader>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input placeholder="Search chats..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {/* Mock chat list */}
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <Avatar><AvatarFallback>JD</AvatarFallback></Avatar>
              <div>
                <p className="font-semibold">John Doe</p>
                <p className="text-sm text-gray-500">Interested in the BCS course.</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Active Chat Window */}
      <Card className="md:col-span-2 h-full flex flex-col">
        <CardHeader className="flex flex-row items-center gap-3">
          <Avatar><AvatarFallback>{activeChat.name.charAt(0)}</AvatarFallback></Avatar>
          <CardTitle>{activeChat.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 bg-gray-100 overflow-y-auto p-4 space-y-4">
          {/* Mock messages */}
          <div className="flex justify-start">
            <p className="p-2 rounded-lg bg-white shadow max-w-xs">{activeChat.lastMessage}</p>
          </div>
          <div className="flex justify-end">
            <p className="p-2 rounded-lg bg-green-200 shadow max-w-xs">
              Thanks for your interest! We have a new BCS batch starting next month.
            </p>
          </div>
        </CardContent>
        <div className="p-4 border-t flex items-center gap-2">
          <Input placeholder="Type a message..." />
          <Button><Send className="w-4 h-4" /></Button>
        </div>
      </Card>
    </div>
  );
}