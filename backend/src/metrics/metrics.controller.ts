import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Metrics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @ApiOperation({ summary: 'Get helpdesk system analytics and AI override metrics (Agent/Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns ticket counts, median resolution time, and AI override rate' })
  @Roles(Role.AGENT, Role.ADMIN)
  @Get('overview')
  async getOverviewMetrics() {
    return this.metricsService.getOverviewMetrics();
  }
}
