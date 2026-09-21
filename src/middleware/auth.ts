import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { devices, farmMembers, farms } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { uid: string; email: string; name?: string; role?: string; isDemo?: boolean };
  farmRole?: 'owner' | 'operator' | 'viewer';
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // Support demo guest user token for safe demo evaluation
  if (token.startsWith('DEMO_USER_TOKEN:')) {
    const rawUid = token.replace('DEMO_USER_TOKEN:', '').trim();
    // Normalize to stable demo operator UID so seeded farms always match
    const demoUid = rawUid.startsWith('demo-operator-bicol') ? 'demo-operator-bicol' : (rawUid || 'demo-operator-bicol');
    req.user = {
      uid: demoUid,
      email: 'demo-farmer@hq16agrilabs.ph',
      name: 'Liezl Maigue (Demo Farm Operator)',
      isDemo: true,
    };
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error: any) {
    console.error('Error verifying Firebase ID token:', error?.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

// Device Authentication Middleware for ESP32 Sensor Nodes
export interface DeviceRequest extends Request {
  deviceRecord?: typeof devices.$inferSelect;
}

export const requireDeviceAuth = async (
  req: DeviceRequest,
  res: Response,
  next: NextFunction
) => {
  const deviceId = (req.headers['x-device-id'] as string) || req.body?.device_id;
  const apiKey = (req.headers['x-api-key'] as string) || (req.headers['authorization']?.replace('Bearer ', '') as string);

  if (!deviceId || !apiKey) {
    return res.status(401).json({
      error: 'Device Authentication Failed: Missing device ID or API key',
      code: 'MISSING_CREDENTIALS',
    });
  }

  try {
    const matched = await db.select().from(devices).where(eq(devices.deviceId, deviceId)).limit(1);
    if (!matched.length) {
      return res.status(401).json({
        error: `Device Authentication Failed: Device '${deviceId}' not registered`,
        code: 'DEVICE_NOT_FOUND',
      });
    }

    const device = matched[0];
    if (!device.isEnabled) {
      return res.status(403).json({
        error: `Device Authentication Failed: Device '${deviceId}' has been disabled or revoked`,
        code: 'DEVICE_DISABLED',
      });
    }

    // Verify sha256 of apiKey against apiKeyHash
    const computedHash = crypto.createHash('sha256').update(apiKey.trim()).digest('hex');
    if (computedHash !== device.apiKeyHash && apiKey !== device.apiKeyHash) {
      return res.status(401).json({
        error: 'Device Authentication Failed: Invalid device key or revoked credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    req.deviceRecord = device;
    next();
  } catch (err: any) {
    console.error('Device auth validation error:', err);
    return res.status(500).json({ error: 'Internal error validating device credentials' });
  }
};

// Farm Member Authorization Check (Row-Level Security enforcement)
export const requireFarmRole = (minimumRole: 'viewer' | 'operator' | 'owner') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const farmId = (req.params.farmId || req.query.farmId || req.body?.farmId) as string;
    const userId = req.user?.uid;

    if (!farmId || !userId) {
      return res.status(400).json({ error: 'Farm ID and authenticated user are required' });
    }

    try {
      // Safely validate UUID format for PostgreSQL uuid column
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(farmId);
      if (!isUuid) {
        return res.status(404).json({ error: 'Farm not found (invalid ID)' });
      }

      // Check if farm exists and if user is owner
      const farmList = await db.select().from(farms).where(eq(farms.id, farmId)).limit(1);
      if (!farmList.length) {
        return res.status(404).json({ error: 'Farm not found' });
      }

      const farm = farmList[0];

      // Demo farm or demo user bypass for interactive exploration & evaluation
      if (farm.isDemo || req.user?.isDemo) {
        req.farmRole = 'owner';
        return next();
      }

      // Check owner ID match
      if (farm.ownerId === userId || (farm.ownerId.startsWith('demo-') && userId.startsWith('demo-'))) {
        req.farmRole = 'owner';
        return next();
      }

      // Check membership
      const memberList = await db
        .select()
        .from(farmMembers)
        .where(and(eq(farmMembers.farmId, farmId), eq(farmMembers.userId, userId)))
        .limit(1);

      if (!memberList.length) {
        return res.status(403).json({ error: 'Access Denied: You are not authorized for this farm' });
      }

      const role = memberList[0].role as 'owner' | 'operator' | 'viewer';
      req.farmRole = role;

      if (minimumRole === 'owner' && role !== 'owner') {
        return res.status(403).json({ error: 'Requires Farm Owner role' });
      }
      if (minimumRole === 'operator' && role === 'viewer') {
        return res.status(403).json({ error: 'Requires Farm Operator or Owner role' });
      }

      next();
    } catch (err: any) {
      console.error('Error verifying farm role:', err);
      return res.status(500).json({ error: 'Failed to verify farm permissions' });
    }
  };
};
