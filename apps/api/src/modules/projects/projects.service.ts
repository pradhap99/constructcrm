import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const db = this.prisma.forTenant(tenantId);
    return db.project.findMany({
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { documents: true, materials: true, workPackages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, projectId: string) {
    const db = this.prisma.forTenant(tenantId);
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        workPackages: true,
        _count: { select: { documents: true, materials: true, runningBills: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(tenantId: string, data: CreateProjectDto) {
    const db = this.prisma.forTenant(tenantId);
    return db.project.create({
      data: { ...data, tenantId },
    });
  }

  async update(tenantId: string, projectId: string, data: Partial<CreateProjectDto>) {
    const db = this.prisma.forTenant(tenantId);
    return db.project.update({ where: { id: projectId }, data });
  }

  async getDashboardStats(tenantId: string, projectId: string) {
    const db = this.prisma.forTenant(tenantId);
    const [project, docStats, materialStats, billStats] = await Promise.all([
      db.project.findUnique({ where: { id: projectId } }),
      db.document.groupBy({ by: ['status'], where: { projectId } }),
      db.material.groupBy({ by: ['status'], where: { projectId } }),
      db.runningAccountBill.aggregate({
        where: { projectId },
        _sum: { grossAmount: true, paidAmount: true },
      }),
    ]);

    return { project, docStats, materialStats, billStats };
  }
}

interface CreateProjectDto {
  clientId: string;
  name: string;
  code: string;
  description?: string;
  contractValue: number;
  currency?: string;
  startDate: Date;
  endDate: Date;
  siteAddress?: string;
  siteLatitude?: number;
  siteLongitude?: number;
  siteRadiusMeters?: number;
}
