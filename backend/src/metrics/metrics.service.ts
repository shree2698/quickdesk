import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus } from '@prisma/client';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getOverviewMetrics() {
    // Total tickets by status
    const totalOpen = await this.prisma.ticket.count({
      where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
    });

    const totalResolved = await this.prisma.ticket.count({
      where: { status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } },
    });

    const totalTickets = totalOpen + totalResolved;

    // Tickets by category count
    const categoryGroup = await this.prisma.ticket.groupBy({
      by: ['category'],
      _count: { category: true },
    });

    const volumeByCategory: Record<string, number> = {
      IT: 0,
      HR: 0,
      FINANCE: 0,
      GENERAL: 0,
      OTHER: 0,
    };

    categoryGroup.forEach((g) => {
      volumeByCategory[g.category] = g._count.category;
    });

    // Median resolution time calculation (in minutes)
    const resolvedTickets = await this.prisma.ticket.findMany({
      where: {
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    let medianResolutionTimeMinutes = 0;
    if (resolvedTickets.length > 0) {
      const resolutionTimes = resolvedTickets
        .map(
          (t) =>
            (t.resolvedAt!.getTime() - t.createdAt.getTime()) / (1000 * 60),
        )
        .sort((a, b) => a - b);

      const mid = Math.floor(resolutionTimes.length / 2);
      if (resolutionTimes.length % 2 === 0) {
        medianResolutionTimeMinutes =
          (resolutionTimes[mid - 1] + resolutionTimes[mid]) / 2;
      } else {
        medianResolutionTimeMinutes = resolutionTimes[mid];
      }
      medianResolutionTimeMinutes =
        Math.round(medianResolutionTimeMinutes * 10) / 10;
    }

    // AI Category Override Rate (%)
    const categoryOverrideCount = await this.prisma.auditLog.count({
      where: { field: 'category' },
    });

    const totalTicketsWithAI = await this.prisma.ticket.count({
      where: { aiCategory: { not: null } },
    });

    let aiOverridePercentage = 0;
    if (totalTicketsWithAI > 0) {
      aiOverridePercentage =
        Math.round((categoryOverrideCount / totalTicketsWithAI) * 1000) / 10;
    }

    return {
      totalTickets,
      openTicketsCount: totalOpen,
      resolvedTicketsCount: totalResolved,
      medianResolutionTimeMinutes,
      aiOverridePercentage,
      volumeByCategory,
    };
  }
}
