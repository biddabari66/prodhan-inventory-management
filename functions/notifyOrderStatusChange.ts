import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * 📧 ORDER STATUS NOTIFICATION FUNCTION
 * Sends email to customers when order status changes
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { orderId, customerEmail, customerName, newStatus, trackingNumber } = await req.json();

    if (!customerEmail || !newStatus) {
      return Response.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    console.log(`📧 Sending order status email: Order ${orderId} -> ${newStatus} to ${customerEmail}`);

    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being prepared! 🎉',
      processing: 'Your order is being processed by our team. 📦',
      packed: 'Your order has been packed and ready for shipment! 📦',
      shipped: `Your order has been shipped! ${trackingNumber ? `Tracking: ${trackingNumber}` : 'You will receive tracking details soon.'} 🚚`,
      out_for_delivery: 'Your order is out for delivery and will arrive soon! 🏃‍♂️',
      delivered: 'Your order has been delivered successfully! Thank you for shopping with us! ✅',
      cancelled: 'Your order has been cancelled. Contact us for more details. ❌'
    };

    const message = statusMessages[newStatus] || `Order status updated to: ${newStatus}`;

    const statusColors = {
      confirmed: { bg: '#10B981', light: '#D1FAE5' },
      processing: { bg: '#3B82F6', light: '#DBEAFE' },
      packed: { bg: '#8B5CF6', light: '#EDE9FE' },
      shipped: { bg: '#EC4899', light: '#FCE7F3' },
      out_for_delivery: { bg: '#F59E0B', light: '#FEF3C7' },
      delivered: { bg: '#059669', light: '#D1FAE5' },
      cancelled: { bg: '#EF4444', light: '#FEE2E2' }
    };

    const colors = statusColors[newStatus] || { bg: '#6B7280', light: '#F3F4F6' };

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg} 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📦 Order Update</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Order #${orderId}</p>
        </div>
        
        <div style="background: white; padding: 40px; border: 2px solid ${colors.bg}; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #333;">Dear <strong>${customerName}</strong>,</p>
          
          <div style="background: ${colors.light}; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 6px solid ${colors.bg};">
            <h2 style="margin: 0 0 15px 0; color: #1F2937; font-size: 22px; text-transform: uppercase;">${newStatus.replace(/_/g, ' ')}</h2>
            <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">${message}</p>
            
            ${trackingNumber ? `
              <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border: 2px dashed ${colors.bg};">
                <p style="margin: 0; color: #374151;">
                  <strong>📍 Tracking Number:</strong><br/>
                  <span style="font-size: 20px; font-family: monospace; color: ${colors.bg};">${trackingNumber}</span>
                </p>
              </div>
            ` : ''}
          </div>

          ${newStatus === 'delivered' ? `
            <div style="background: #FEF3C7; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #F59E0B;">
              <p style="margin: 0; color: #92400E; font-size: 14px;">
                <strong>💬 We'd love your feedback!</strong><br/>
                How was your experience? Let us know how we can improve.
              </p>
            </div>
          ` : ''}

          <div style="text-align: center; margin-top: 40px; padding-top: 25px; border-top: 2px solid #E5E7EB;">
            <p style="color: #7C3AED; font-weight: bold; font-size: 18px; margin: 0;">🛒 Prodhan.com</p>
            <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0;">Thank you for shopping with us!</p>
            <p style="color: #9CA3AF; font-size: 11px; margin: 10px 0;">Need help? Contact our support team</p>
          </div>
        </div>
      </div>
    `;

    await base44.integrations.Core.SendEmail({
      from_name: 'Prodhan.com E-commerce',
      to: customerEmail,
      subject: `📦 Order #${orderId} - ${newStatus.toUpperCase().replace(/_/g, ' ')}`,
      body: emailBody
    });

    console.log(`✅ Order status email sent to ${customerEmail}`);

    return Response.json({
      success: true,
      message: 'Order status notification sent'
    });

  } catch (error) {
    console.error('❌ Notification Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});