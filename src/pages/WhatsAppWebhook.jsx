import React from 'react';
import { Lead } from '../entities/Lead';
import { WhatsAppMessage } from '../entities/WhatsAppMessage';

// This is a placeholder page to represent the webhook endpoint.
// In a real erp application, this logic would be server-side.
// We are simulating the behavior here.

export default function WhatsAppWebhook() {
  const handleRequest = async (requestBody) => {
    // 1. Log the incoming message
    const messageEntry = requestBody.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (messageEntry) {
      await WhatsAppMessage.create({
        message_id: messageEntry.id,
        contact_phone: messageEntry.from,
        contact_name: requestBody.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name,
        direction: 'inbound',
        type: messageEntry.type,
        body: messageEntry.text?.body,
        timestamp: new Date(parseInt(messageEntry.timestamp) * 1000).toISOString(),
      });
    }

    // 2. Check if it's a new lead
    const existingLeads = await Lead.filter({ phone: messageEntry.from });
    if (existingLeads.length === 0) {
      // 3. Create a new lead if it doesn't exist
      await Lead.create({
        lead_source: 'whatsapp_direct',
        student_name: requestBody.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || 'WhatsApp User',
        phone: messageEntry.from,
        lead_status: 'new',
        course_interest: 'bcs', // Default or parse from message
        notes: `Initial message: ${messageEntry.text?.body}`,
      });
    }

    // In a real webhook, you would return a 200 OK status.
    // Here we just log to the console.
    console.log("Webhook processed successfully.");
  };

  // Example of how you might test this from the browser console:
  // window.testWebhook({ ...mockPayload... });
  if (typeof window !== 'undefined') {
    window.testWebhook = handleRequest;
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>WhatsApp Webhook Endpoint</h1>
      <p>This page is a placeholder for the server-side webhook logic.</p>
      <p>It listens for incoming messages from WhatsApp to create leads and log messages.</p>
      <p>Open the developer console to test using <code>window.testWebhook(payload)</code>.</p>
    </div>
  );
}