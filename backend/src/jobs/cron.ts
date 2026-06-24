import cron from 'node-cron';
import prisma from '../config/db';
import { emailService } from '../utils/email.service';
import { logger } from '../config/logger';

export function startCronJobs() {
  // ── Daily Database Backup — 02:00 Bangladesh time ──
  // Guarded to production only: in dev/local the host usually lacks pg_dump and
  // the ephemeral container disk makes file backups pointless. Set
  // BACKUP_CRON_ENABLED=true to force-enable in any environment.
  const backupEnabled =
    process.env.BACKUP_CRON_ENABLED === 'true' ||
    (process.env.NODE_ENV === 'production' && process.env.BACKUP_CRON_ENABLED !== 'false');

  if (backupEnabled) {
    const RETENTION = parseInt(process.env.BACKUP_RETENTION || '7', 10) || 7;
    cron.schedule('0 2 * * *', async () => {
      logger.info('🕒 Running scheduled daily database backup...');
      try {
        const { BackupService } = await import('../services/backupService');
        // Back up every active tenant, then prune old backups per-tenant.
        const tenants = await prisma.tenant.findMany({ where: { isActive: true }, select: { id: true } });
        if (tenants.length === 0) {
          logger.warn('No active tenants found. Skipping scheduled backup.');
          return;
        }
        for (const t of tenants) {
          try {
            await BackupService.createBackup(t.id);
            await BackupService.pruneOldBackups(t.id, RETENTION);
            logger.info(`✅ Scheduled backup completed for tenant ${t.id}.`);
          } catch (err: any) {
            // Isolate per-tenant failures so one bad tenant doesn't abort the rest.
            logger.error(`Scheduled backup failed for tenant ${t.id}:`, err?.message);
          }
        }
      } catch (err: any) {
        // Never let the cron crash the process.
        logger.error('Scheduled backup job failed:', err?.message);
      }
    }, { timezone: 'Asia/Dhaka' });
    logger.info(`📦 Daily DB backup cron enabled (02:00 Asia/Dhaka, retention=${RETENTION}).`);
  } else {
    logger.info('📦 Daily DB backup cron disabled (non-production). Set BACKUP_CRON_ENABLED=true to enable.');
  }

  // ── Daily Sales Digest — 9pm Bangladesh time (UTC+6 = 15:00 UTC) ──
  cron.schedule('0 15 * * *', async () => {
    logger.info('🕒 Running daily sales digest...');
    try {
      const today = new Date().toISOString().slice(0, 10);

      const [totalOrders, totalRevenue, pending, delivered] = await Promise.all([
        prisma.order.count({ where: { salesDayDate: today } }),
        prisma.order.aggregate({ where: { salesDayDate: today }, _sum: { totalAmount: true } }),
        prisma.order.count({ where: { salesDayDate: today, orderStatus: 'PENDING' } }),
        prisma.order.count({ where: { salesDayDate: today, orderStatus: 'DELIVERED' } }),
      ]);

      // Get admins/finance heads to email
      const recipients = await prisma.user.findMany({
        where: { isActive: true, jobRole: { in: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_HEAD'] } },
        select: { email: true },
      });

      for (const r of recipients) {
        await emailService.sendDailySalesDigest(r.email, today, {
          totalOrders,
          totalRevenue: totalRevenue._sum.totalAmount ?? 0,
          pending,
          delivered,
        });
      }

      logger.info(`Daily digest sent to ${recipients.length} recipients`);
    } catch (err: any) {
      logger.error('Daily digest cron error:', err.message);
    }
  }, { timezone: 'Asia/Dhaka' });

  // ── Low Stock Alert — Daily at 10am BD time ──
  cron.schedule('0 4 * * *', async () => {
    logger.info('🕒 Running low stock check...');
    try {
      const lowStock = await prisma.$queryRaw<any[]>`
        SELECT name, sku, stock, "minStockLevel"
        FROM "Inventory"
        WHERE stock <= "minStockLevel" AND "isActive" = true
        ORDER BY stock ASC
      `;

      if (lowStock.length === 0) return;

      const recipients = await prisma.user.findMany({
        where: { isActive: true, jobRole: { in: ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'] } },
        select: { email: true },
      });

      for (const r of recipients) {
        await emailService.sendLowStockAlert(r.email, lowStock);
      }

      logger.info(`Low stock alert: ${lowStock.length} items, sent to ${recipients.length} recipients`);
    } catch (err: any) {
      logger.error('Low stock cron error:', err.message);
    }
  }, { timezone: 'Asia/Dhaka' });

  // ── Weekly Sales + Inventory Report — Monday 8am BD time ──
  cron.schedule('0 2 * * 1', async () => {
    logger.info('🕒 Running weekly report...');
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [weekOrders, weekRevenue] = await Promise.all([
        prisma.order.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.order.aggregate({ where: { createdAt: { gte: weekAgo } }, _sum: { totalAmount: true } }),
      ]);

      logger.info(`Weekly: ${weekOrders} orders, ৳${weekRevenue._sum.totalAmount ?? 0} revenue`);
      // TODO: Generate PDF and email it
    } catch (err: any) {
      logger.error('Weekly report cron error:', err.message);
    }
  }, { timezone: 'Asia/Dhaka' });

  // ── Follow-up Reminders — Every day at 9am BD time ──
  cron.schedule('0 3 * * *', async () => {
    logger.info('🕒 Checking follow-up reminders...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const leads = await prisma.lead.findMany({
        where: {
          nextFollowUpDate: { gte: today, lt: tomorrow },
          leadStatus: { notIn: ['CONVERTED', 'LOST'] },
        },
        include: { assignedTo: { select: { email: true, displayName: true, whatsappNumber: true } } },
      });

      for (const lead of leads) {
        if (lead.assignedTo?.email) {
          await emailService.send(
            lead.assignedTo.email,
            `📞 Follow-up Reminder: ${lead.studentName}`,
            `<p>You have a follow-up scheduled today for <strong>${lead.studentName}</strong> (${lead.phone}).</p><p>Course interest: ${lead.courseInterest || 'N/A'}</p><a href="${process.env.FRONTEND_URL}/crm">Go to CRM</a>`
          );
        }
      }

      logger.info(`Follow-up reminders sent for ${leads.length} leads`);
    } catch (err: any) {
      logger.error('Follow-up reminder cron error:', err.message);
    }
  }, { timezone: 'Asia/Dhaka' });

  logger.info('✅ Cron jobs started');
}
