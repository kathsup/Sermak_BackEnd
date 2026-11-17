import { Injectable } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toHondurasDate } from '../invoices/dates';

const DAY = 24 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 7;
const RECENT_LIMIT = 10;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    // Medianoche de Honduras de hoy, y el límite de la ventana de por vencer
    const todayText = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Tegucigalpa',
    });
    const today = toHondurasDate(todayText);
    const limit = new Date(today.getTime() + (DUE_SOON_DAYS + 1) * DAY);

    const [groups, dueSoonInvoices, recentInvoices] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.invoice.findMany({
        where: {
          status: InvoiceStatus.PENDIENTE,
          dueDate: { gte: today, lt: limit },
        },
        include: { client: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.invoice.findMany({
        orderBy: { updatedAt: 'desc' },
        take: RECENT_LIMIT * 2,
        select: {
          id: true,
          number: true,
          history: true,
          client: { select: { name: true } },
        },
      }),
    ]);

    // Siempre los 5 estados, con 0 si no hay facturas
    const byStatus = Object.values(InvoiceStatus).map((status) => {
      const group = groups.find((g) => g.status === status);
      return {
        status,
        count: group?._count._all ?? 0,
        total: group?._sum.amount ?? 0,
      };
    });

    const pending = byStatus.find((s) => s.status === InvoiceStatus.PENDIENTE)!;
    const overdue = byStatus.find((s) => s.status === InvoiceStatus.VENCIDA)!;

    const receivable = {
      count: pending.count + overdue.count,
      total: pending.total + overdue.total,
    };

    const dueSoon = dueSoonInvoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      clientName: invoice.client.name,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      status: invoice.status,
    }));

    // Junta los historiales y se queda con los movimientos más recientes
    const movements = recentInvoices
      .flatMap((invoice) =>
        invoice.history.map((change) => ({
          invoiceId: invoice.id,
          number: invoice.number,
          clientName: invoice.client.name,
          status: change.status,
          date: change.date,
          userId: change.userId,
        })),
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, RECENT_LIMIT);

    const userIds = [
      ...new Set(
        movements.map((m) => m.userId).filter((id): id is string => !!id),
      ),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const names = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]),
    );

    const recentActivity = movements.map(({ userId, ...movement }) => ({
      ...movement,
      userName: userId ? (names.get(userId) ?? null) : null,
    }));

    return { byStatus, receivable, overdue, dueSoon, recentActivity };
  }
}
