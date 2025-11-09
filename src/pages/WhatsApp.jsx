import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BarChart, Users, Send, CheckCircle, MessageCircle, Eye, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart as ReBarChart, XAxis, YAxis, Tooltip, Bar, Legend } from 'recharts';
import { InvokeLLM } from '@/integrations/Core';

const analyticsData = [
    { name: 'Campaign 1 (BCS)', sent: 400, delivered: 380, read: 320, replied: 80 },
    { name: 'Campaign 2 (Bank)', sent: 600, delivered: 550, read: 450, replied: 120 },
    { name: 'Campaign 3 (NTRCA)', sent: 300, delivered: 290, read: 250, replied: 60 },
];

export default function WhatsAppPage() {
    const [message, setMessage] = useState("Hi [Name], we noticed you were interested in our [Course Name] course. Would you like to know more about our special discount?");
    const [selectedSegment, setSelectedSegment] = useState("bcs_leads");
    const [isGenerating, setIsGenerating] = useState(false);

    const generateMessage = async () => {
        setIsGenerating(true);
        try {
            const response = await InvokeLLM({
                prompt: `Generate a friendly and professional WhatsApp follow-up message for a student interested in a course. The message should be engaging, mention a special offer, and end with a clear call to action. Use placeholders like [Name] and [Course Name]. The message should be for Biddabari, an educational institution.`,
            });
            setMessage(response);
        } catch (error) {
            console.error("Error generating message:", error);
            // set a fallback message
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <header>
                <h1 className="text-4xl font-bold font-display text-gradient">WhatsApp Campaign Center</h1>
                <p className="text-lg text-muted-foreground mt-1">Engage with your leads directly via WhatsApp.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Send /> Send Batch Message</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Select Lead Segment or Group</label>
                            <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a segment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bcs_leads">BCS Leads (New)</SelectItem>
                                    <SelectItem value="bank_leads">Bank Leads (Contacted)</SelectItem>
                                    <SelectItem value="it_course_group">IT Course Students</SelectItem>
                                    <SelectItem value="inactive_students">Inactive Students (Last 3 months)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                             <div className="flex justify-between items-center mb-1">
                                <label className="text-sm font-medium">Message Template</label>
                                <Button variant="link" size="sm" onClick={generateMessage} disabled={isGenerating}>
                                    {isGenerating ? "Generating..." : "Generate with AI"}
                                </Button>
                             </div>
                            <Textarea 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={6}
                                placeholder="Use [Name] and [Course Name] as placeholders..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">Placeholders will be replaced automatically during campaign sending.</p>
                        </div>
                        <Button className="w-full btn-primary">Send Campaign to Segment</Button>
                    </CardContent>
                </Card>
                 <Card className="premium-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart /> Campaign Analytics</CardTitle>
                    </CardHeader>
                    <CardContent className="h-96">
                         <ResponsiveContainer width="100%" height="100%">
                            <ReBarChart data={analyticsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)', borderRadius: '8px', border: 'none' }} />
                                <Legend wrapperStyle={{fontSize: "12px"}}/>
                                <Bar dataKey="sent" stackId="a" fill="#8884d8" name="Sent" />
                                <Bar dataKey="delivered" stackId="a" fill="#82ca9d" name="Delivered" />
                                <Bar dataKey="read" stackId="a" fill="#ffc658" name="Read" />
                                <Bar dataKey="replied" fill="#ff7300" name="Replied" />
                            </ReBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}