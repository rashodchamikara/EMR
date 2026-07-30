import { Injectable } from '@nestjs/common';
import { Facility, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
interface FacilityPageOptions {
  organizationId: string;
  where: Prisma.FacilityWhereInput;
  skip: number;
  take: number;
}
@Injectable()
export class FacilitiesRepository {
  constructor(private readonly prisma: PrismaService) {}
  create(data: Prisma.FacilityUncheckedCreateInput): Promise<Facility> {
    return this.prisma.facility.create({ data });
  }
  findByCode(organizationId: string, code: string): Promise<Facility | null> {
    return this.prisma.facility.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
  }
  findById(organizationId: string, id: string): Promise<Facility | null> {
    return this.prisma.facility.findFirst({ where: { id, organizationId } });
  }
  async findPage(
    options: FacilityPageOptions,
  ): Promise<{ data: Facility[]; total: number }> {
    const where: Prisma.FacilityWhereInput = {
      organizationId: options.organizationId,
      ...options.where,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.facility.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.facility.count({ where }),
    ]);
    return { data, total };
  }
  update(
    organizationId: string,
    id: string,
    data: Prisma.FacilityUpdateInput,
  ): Promise<Facility> {
    return this.prisma.facility.update({ where: { id, organizationId }, data });
  }
}
