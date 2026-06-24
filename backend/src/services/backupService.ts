import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import prisma from '../config/db';
import { logger } from '../config/logger';

const execAsync = promisify(exec);

export class BackupService {
  private static backupDir = path.join(process.cwd(), 'backups');

  static async initialize() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  static async createBackup(tenantId: string): Promise<string> {
    await this.initialize();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${tenantId}_${timestamp}.sql.gz`;
    const filepath = path.join(this.backupDir, filename);

    // Get the database URL from environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    try {
      logger.info(`Starting database backup for tenant ${tenantId}...`);
      
      // We log the system backup entry as PENDING
      const backupRecord = await prisma.systemBackup.create({
        data: {
          tenantId,
          filename,
          sizeBytes: 0,
          status: 'PENDING',
        }
      });

      // We'll dump the whole database but in a multi-tenant setup we might only want tenant data
      // For now, doing a full db dump as requested. In a real environment, you'd use row-level security or custom pg_dump scripts.
      // Note: pg_dump must be installed on the host system.
      // We pipe output to gzip to save space
      const command = `pg_dump "${dbUrl}" | gzip > "${filepath}"`;
      
      await execAsync(command);

      const stats = fs.statSync(filepath);
      
      await prisma.systemBackup.update({
        where: { id: backupRecord.id },
        data: {
          status: 'SUCCESS',
          sizeBytes: stats.size,
          url: `/api/v1/system/backups/download/${filename}` // relative download URL
        }
      });

      logger.info(`Backup successful: ${filename}`);
      return filepath;
    } catch (error) {
      logger.error('Database backup failed:', error);
      
      // Update the record as failed if it was created
      const pendingRecord = await prisma.systemBackup.findFirst({
        where: { filename, status: 'PENDING' }
      });
      
      if (pendingRecord) {
        await prisma.systemBackup.update({
          where: { id: pendingRecord.id },
          data: { status: 'FAILED' }
        });
      }

      throw error;
    }
  }

  static async listBackups(tenantId: string) {
    return prisma.systemBackup.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Retention: keep only the most recent `keep` SUCCESSFUL backups for a tenant.
   * Deletes the on-disk file (if present) and the DB record for older ones so
   * the ephemeral container disk doesn't fill up. Never throws — best-effort.
   */
  static async pruneOldBackups(tenantId: string, keep = 7): Promise<void> {
    try {
      const successful = await prisma.systemBackup.findMany({
        where: { tenantId, status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
      });

      const toDelete = successful.slice(keep);
      for (const rec of toDelete) {
        try {
          const fp = path.join(this.backupDir, rec.filename);
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        } catch (e: any) {
          logger.warn(`Failed to delete backup file ${rec.filename}: ${e?.message}`);
        }
        try {
          await prisma.systemBackup.delete({ where: { id: rec.id } });
        } catch (e: any) {
          logger.warn(`Failed to delete backup record ${rec.id}: ${e?.message}`);
        }
      }

      if (toDelete.length) {
        logger.info(`Backup retention: pruned ${toDelete.length} old backup(s), kept latest ${keep}.`);
      }
    } catch (err: any) {
      logger.error('Backup retention prune failed:', err?.message);
    }
  }
}
