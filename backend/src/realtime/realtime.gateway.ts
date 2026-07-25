import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.auth?.token || client.handshake.headers?.authorization;
      if (!authHeader) {
        this.logger.warn(`Unauthorized socket connection attempt: ${client.id}`);
        client.disconnect();
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';
      const decoded = jwt.verify(token, secret) as { sub: string; email: string; role: Role };

      client.data.user = decoded;
      this.logger.log(`Client connected: ${client.id} (User: ${decoded.email}, Role: ${decoded.role})`);

      // If user is Agent or Admin, join channel-agents room for queue broadcasts
      if (decoded.role === Role.AGENT || decoded.role === Role.ADMIN) {
        client.join('channel-agents');
        this.logger.log(`Client ${client.id} joined 'channel-agents' room`);
      }
    } catch (err) {
      this.logger.error(`Socket auth failed for ${client.id}: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_ticket')
  async handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const user = client.data.user;
    if (!user || !data.ticketId) return;

    // Verify user can access ticket room
    if (user.role === Role.EMPLOYEE) {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: data.ticketId },
        select: { employeeId: true },
      });
      if (!ticket || ticket.employeeId !== user.sub) {
        client.emit('error', { message: 'Unauthorized ticket room access' });
        return;
      }
    }

    const roomName = `ticket-${data.ticketId}`;
    client.join(roomName);
    this.logger.log(`Client ${client.id} joined room ${roomName}`);
    client.emit('joined_room', { room: roomName });
  }

  @SubscribeMessage('leave_ticket')
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    if (!data.ticketId) return;
    const roomName = `ticket-${data.ticketId}`;
    client.leave(roomName);
    this.logger.log(`Client ${client.id} left room ${roomName}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string; text: string },
  ) {
    const user = client.data.user;
    if (!user || !data.ticketId || !data.text?.trim()) return;

    const message = await this.prisma.message.create({
      data: {
        ticketId: data.ticketId,
        senderId: user.sub,
        text: data.text.trim(),
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    const roomName = `ticket-${data.ticketId}`;
    this.server.to(roomName).emit('message_received', message);
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const user = client.data.user;
    if (!user || !data.ticketId) return;
    client.to(`ticket-${data.ticketId}`).emit('typing_status', {
      ticketId: data.ticketId,
      userId: user.sub,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const user = client.data.user;
    if (!user || !data.ticketId) return;
    client.to(`ticket-${data.ticketId}`).emit('typing_status', {
      ticketId: data.ticketId,
      userId: user.sub,
      isTyping: false,
    });
  }

  /**
   * Helper method to broadcast ticket_created to all agents
   */
  notifyTicketCreated(ticket: any) {
    this.server.to('channel-agents').emit('ticket:new', ticket);
  }

  /**
   * Helper method to broadcast ticket_resolved to ticket room and agent channel
   */
  notifyTicketResolved(ticket: any) {
    this.server.to(`ticket-${ticket.id}`).emit('ticket:resolved', ticket);
    this.server.to('channel-agents').emit('ticket_updated', {
      ticketId: ticket.id,
      status: ticket.status,
      updatedAt: ticket.updatedAt,
    });
  }
}
