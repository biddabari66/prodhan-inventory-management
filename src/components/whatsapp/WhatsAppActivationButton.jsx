import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MessageSquare, Check, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { whatsappAttendanceIntegration } from '@/functions/whatsappAttendanceIntegration';

export default function WhatsAppActivationButton({ user, onActivationChange }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleActivate = async () => {
        if (!user.phone) {
            toast.error('Activation Failed', {
                description: 'Please add a phone number to your profile before activating WhatsApp.',
            });
            return;
        }

        setIsLoading(true);
        toast.info('Connecting to WhatsApp HR Assistant...', {
            description: 'This may take a moment. Please wait.',
        });
        
        try {
            const response = await whatsappAttendanceIntegration({
                action: 'activate_whatsapp',
                whatsappNumber: user.phone
            });

            if (response.data.success) {
                toast.success('WhatsApp Connected!', {
                    description: 'You will now receive HR notifications and reminders.',
                });
                onActivationChange(); // Refresh the user profile data
            } else {
                throw new Error(response.data.error || 'Failed to activate WhatsApp.');
            }
        } catch (error) {
            console.error('WhatsApp Activation Error:', error);
            toast.error('Activation Failed', {
                description: error.message || 'An unknown error occurred. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (user.whatsapp_activated) {
        return (
            <Card className="premium-card">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                                <MessageSquare className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="font-semibold text-green-800 dark:text-green-300">WhatsApp Connected</h3>
                        </div>
                        <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/50 dark:text-green-300">
                            <Check className="w-3 h-3 mr-1" />
                            Active
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert className="bg-green-50/50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                        <Check className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700 dark:text-green-300">
                           You will receive attendance reminders and HR updates on your registered phone number: <strong>{user.whatsapp_number ? `+...${user.whatsapp_number.slice(-4)}` : 'Not Available'}</strong>.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="premium-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-violet-500" />
                    Connect to WhatsApp HR Assistant
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>One-Click Activation</AlertTitle>
                    <AlertDescription>
                        Click the button below to connect your account and start receiving attendance reminders, shift updates, and HR notifications directly on WhatsApp.
                    </AlertDescription>
                </Alert>

                <Button
                    onClick={handleActivate}
                    disabled={isLoading || !user.phone}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Activating...
                        </>
                    ) : (
                        <>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Activate WhatsApp Notifications
                        </>
                    )}
                </Button>
                {!user.phone && (
                    <p className="text-xs text-center text-red-500">
                        Please add a phone number to your profile to enable this feature.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}