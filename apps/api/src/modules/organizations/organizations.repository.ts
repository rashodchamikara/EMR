import { Injectable } from '@nestjs/common';
import { Organization, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
interface FindPageOptions {
  where: Prisma.OrganizationWhereInput;
  skip: number;
  take: number;
}
@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return this.prisma.organization.create({ data });
  }
  async findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { id } });
  }
  async findByCode(code: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { code } });
  }
  async findPage(
    options: FindPageOptions,
  ): Promise<{ data: Organization[]; total: number }> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where: options.where,
        skip: options.skip,
        take: options.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where: options.where }),
    ]);
    return { data, total };
  }
  async update(
    id: string,
    data: Prisma.OrganizationUpdateInput,
  ): Promise<Organization> {
    return this.prisma.organization.update({ where: { id }, data });
  }
}
