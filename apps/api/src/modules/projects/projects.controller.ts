import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects for the authenticated tenant' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.projects.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single project with full details' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projects.findOne(user.tenantId, id);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get project dashboard statistics' })
  getDashboard(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projects.getDashboardStats(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.projects.create(user.tenantId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.projects.update(user.tenantId, id, body);
  }
}
