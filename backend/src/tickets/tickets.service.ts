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
import { Role, TicketStatus } from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async create(employeeId: string, dto: CreateTicketDto) {
    const aiPrediction = await this.aiService.classifyTicket(dto.title, dto.description);

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

    return this.prisma.ticket.findMany({
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
            sender: { select: { id: true, name: true, email: true, role: true } },
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
      throw new ForbiddenException('You do not have permission to view this ticket');
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

  async sendReply(id: string, agentId: string, dto: SendReplyDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const resolvedTicket = await this.prisma.ticket.update({
      where: { id },
      data: {
        finalReply: dto.finalReply,
        status: TicketStatus.RESOLVED,
        agentId,
        resolvedAt: new Date(),
      },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, email: true } },
      },
    });

    // Broadcast ticket resolved event to ticket room and agent channel
    this.realtimeGateway.notifyTicketResolved(resolvedTicket);

    return resolvedTicket;
  }

  async generateCopilotDraft(id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const copilotResult = await this.aiService.generateCopilotDraft(ticket.title, ticket.description);

    await this.prisma.ticket.update({
      where: { id },
      data: {
        aiDraftReply: copilotResult.suggestion,
        ragCitations: copilotResult.citations.map((c) => c.title),
      },
    });

    return copilotResult;
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
