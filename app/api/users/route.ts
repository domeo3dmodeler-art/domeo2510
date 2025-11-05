// app/api/users/route.ts
// API endpoint для получения списка пользователей из базы данных

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getRoleDisplayName, getRoleIcon, getRoleColor } from '../../../lib/auth/roles';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        middle_name: true,
        role: true,
        is_active: true,
        last_login: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Форматируем данные пользователей
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      middleName: user.middle_name,
      role: user.role.toLowerCase(),
      roleDisplayName: getRoleDisplayName(user.role.toLowerCase()),
      roleIcon: getRoleIcon(user.role.toLowerCase()),
      roleColor: getRoleColor(user.role.toLowerCase()),
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at
    }));

    return NextResponse.json({ 
      success: true, 
      users: formattedUsers 
    });

  } catch (error) {
    logger.error('Error fetching users', 'users/GET', { error }, loggingContext);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения списка пользователей' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}