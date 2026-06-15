import { Request, Response } from 'express';
import { BackupService } from '../services/backupService';
import { AppError } from '../middleware/errorHandler';
import path from 'path';
import fs from 'fs';

export const listBackups = async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId;
  if (!tenantId) throw new AppError(401, 'Unauthenticated');

  const backups = await BackupService.listBackups(tenantId);
  res.json({ data: backups });
};

export const triggerBackup = async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId;
  if (!tenantId) throw new AppError(401, 'Unauthenticated');

  // Trigger asynchronously so it doesn't block the request
  BackupService.createBackup(tenantId).catch(console.error);

  res.status(202).json({ message: 'Backup initiated. It will appear in the list once completed.' });
};

export const downloadBackup = async (req: Request, res: Response) => {
  const filename = String(req.params.filename || '');
  // Basic security check to prevent directory traversal
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    throw new AppError(400, 'Invalid filename');
  }

  const backupDir = path.join(process.cwd(), 'backups');
  const filepath = path.join(backupDir, filename);

  if (!fs.existsSync(filepath)) {
    throw new AppError(404, 'Backup file not found on disk');
  }

  res.download(filepath, filename);
};
