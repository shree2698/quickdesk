import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { SendReplyDto } from './dto/send-reply.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { Role, TicketStatus } from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async create(employeeId: string, dto: CreateTicketDto) {
    const aiPrediction = await this.aiService.classifyTicket(
      dto.title,
      dto.description,
    );

    const ticket = await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        attachmentFilename: dto.attachmentFilename,
        employeeId,
        category: aiPrediction.category,
        priority: aiPrediction.priority,
        aiCategory: aiPrediction.category,
        aiPriority: aiPrediction.priority,
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
        agent: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Notify all online agents via Socket.io
    this.realtimeGateway.notifyTicketCreated(ticket);

    return ticket;
  }

  async findAll(user: { id: string; role: Role }, query: TicketQueryDto) {
    const where: any = {};

    if (user.role === Role.EMPLOYEE) {
      where.employeeId = user.id;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.search) {
      where.title = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const page = query.page ? Number(query.page) : undefined;
    const limit = query.limit ? Number(query.limit) : undefined;

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.prisma.ticket.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            employee: {
              select: { id: true, name: true, email: true },
            },
            agent: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        this.prisma.ticket.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const data = await this.prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
        agent: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      data,
      total: data.length,
      page: 1,
      limit: data.length || 1,
      totalPages: 1,
    };
  }

  async findOne(id: string, user: { id: string; role: Role }) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
        agent: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    if (user.role === Role.EMPLOYEE && ticket.employeeId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to view this ticket',
      );
    }

    return ticket;
  }

  async updateCategory(id: string, agentId: string, dto: UpdateCategoryDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const oldCategory = ticket.category;
    const updatedTicket = await this.prisma.ticket.update({
      where: { id },
      data: { category: dto.category },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, email: true } },
      },
    });

    if (oldCategory !== dto.category) {
      await this.prisma.auditLog.create({
        data: {
          ticketId: id,
          changedById: agentId,
          field: 'category',
          oldValue: oldCategory,
          newValue: dto.category,
        },
      });
    }

    return updatedTicket;
  }

  async updatePriority(id: string, agentId: string, dto: UpdatePriorityDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const oldPriority = ticket.priority;
    const updatedTicket = await this.prisma.ticket.update({
      where: { id },
      data: { priority: dto.priority },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, email: true } },
      },
    });

    if (oldPriority !== dto.priority) {
      await this.prisma.auditLog.create({
        data: {
          ticketId: id,
          changedById: agentId,
          field: 'priority',
          oldValue: oldPriority,
          newValue: dto.priority,
        },
      });
    }

    return updatedTicket;
  }

  async sendReply(id: string, userId: string, role: Role, dto: SendReplyDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    if (role === Role.EMPLOYEE && ticket.employeeId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to reply to this ticket',
      );
    }

    const updateData: any = {};

    if (role === Role.AGENT || role === Role.ADMIN) {
      updateData.agentId = userId;
      if (ticket.status === TicketStatus.OPEN) {
        updateData.status = TicketStatus.IN_PROGRESS;
      }
    }

    if (dto.ragCitations && dto.ragCitations.length > 0) {
      updateData.ragCitations = dto.ragCitations;
    }

    // Save message to database history
    await this.prisma.message.create({
      data: {
        ticketId: id,
        senderId: userId,
        text: dto.finalReply,
      },
    });

    const updatedTicket = await this.prisma.ticket.update({
      where: { id },
      data:
        Object.keys(updateData).length > 0
          ? updateData
          : { updatedAt: new Date() },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });

    this.realtimeGateway.notifyTicketUpdated(updatedTicket);

    return updatedTicket;
  }

  async resolveTicket(id: string, agentId: string, dto: ResolveTicketDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const resolutionSummary =
      dto.finalReply || ticket.finalReply || 'Ticket marked resolved by agent.';

    const updateData: any = {
      finalReply: resolutionSummary,
      status: TicketStatus.RESOLVED,
      agentId,
      resolvedAt: new Date(),
    };

    if (dto.ragCitations && dto.ragCitations.length > 0) {
      updateData.ragCitations = dto.ragCitations;
    }

    if (dto.finalReply) {
      await this.prisma.message.create({
        data: {
          ticketId: id,
          senderId: agentId,
          text: dto.finalReply,
        },
      });
    }

    const resolvedTicket = await this.prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        employee: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });

    this.realtimeGateway.notifyTicketResolved(resolvedTicket);

    return resolvedTicket;
  }

  async generateCopilotDraft(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        employee: { select: { name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { name: true, role: true } } },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const employeeName = ticket.employee?.name || 'Employee';
    const chatHistory =
      ticket.messages && ticket.messages.length > 0
        ? ticket.messages
            .map(
              (m) =>
                `[${m.sender?.role || 'USER'} - ${m.sender?.name}]: ${m.text}`,
            )
            .join('\n')
        : 'No previous chat messages.';

    const copilotResult = await this.aiService.generateCopilotDraft(
      ticket.title,
      ticket.description,
      employeeName,
      chatHistory,
    );

    const citationTitles = copilotResult.citations
      .map((c) => c.title)
      .filter(Boolean);

    await this.prisma.ticket.update({
      where: { id },
      data: {
        aiDraftReply: copilotResult.suggestion,
        ragCitations: citationTitles,
      },
    });

    return {
      ...copilotResult,
      ragCitations: citationTitles,
    };
  }

  async getAuditLogs(id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    return this.prisma.auditLog.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        changedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }
}
