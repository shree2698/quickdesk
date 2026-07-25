import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { SendReplyDto } from './dto/send-reply.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Tickets')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @ApiOperation({ summary: 'Submit a new support ticket (Employee only)' })
  @ApiResponse({ status: 201, description: 'Ticket successfully created' })
  @Roles(Role.EMPLOYEE, Role.AGENT, Role.ADMIN)
  @Post()
  async create(@GetUser('id') employeeId: string, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(employeeId, dto);
  }

  @ApiOperation({ summary: 'Get list of tickets (Employees see own only; Agents see all with filters)' })
  @ApiResponse({ status: 200, description: 'Returns array of tickets' })
  @Get()
  async findAll(
    @GetUser() user: { id: string; role: Role },
    @Query() query: TicketQueryDto,
  ) {
    return this.ticketsService.findAll(user, query);
  }

  @ApiOperation({ summary: 'Get details for a single ticket by ID' })
  @ApiResponse({ status: 200, description: 'Returns ticket details' })
  @ApiResponse({ status: 403, description: 'Forbidden if employee views another user ticket' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @GetUser() user: { id: string; role: Role },
  ) {
    return this.ticketsService.findOne(id, user);
  }

  @ApiOperation({ summary: 'Override ticket category (Agent/Admin only)' })
  @ApiResponse({ status: 200, description: 'Category updated and audit log created' })
  @Roles(Role.AGENT, Role.ADMIN)
  @Patch(':id/category')
  async updateCategory(
    @Param('id') id: string,
    @GetUser('id') agentId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.ticketsService.updateCategory(id, agentId, dto);
  }

  @ApiOperation({ summary: 'Override ticket priority (Agent/Admin only)' })
  @ApiResponse({ status: 200, description: 'Priority updated and audit log created' })
  @Roles(Role.AGENT, Role.ADMIN)
  @Patch(':id/priority')
  async updatePriority(
    @Param('id') id: string,
    @GetUser('id') agentId: string,
    @Body() dto: UpdatePriorityDto,
  ) {
    return this.ticketsService.updatePriority(id, agentId, dto);
  }

  @ApiOperation({ summary: 'Send reply and resolve ticket (Agent/Admin only)' })
  @ApiResponse({ status: 200, description: 'Final reply saved and status changed to RESOLVED' })
  @Roles(Role.AGENT, Role.ADMIN)
  @Post(':id/reply')
  async sendReply(
    @Param('id') id: string,
    @GetUser('id') agentId: string,
    @Body() dto: SendReplyDto,
  ) {
    return this.ticketsService.sendReply(id, agentId, dto);
  }

  @ApiOperation({ summary: 'Get override audit logs for a ticket (Agent/Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns audit log history' })
  @Roles(Role.AGENT, Role.ADMIN)
  @Get(':id/audit-log')
  async getAuditLogs(@Param('id') id: string) {
    return this.ticketsService.getAuditLogs(id);
  }
}
