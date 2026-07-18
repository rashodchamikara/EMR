import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Organization,
  OrganizationType,
  Prisma,
} from '../../generated/prisma/client';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationListResponseDto } from './dto/organization-response.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsRepository } from './organizations.repository';
@Injectable()
export class OrganizationsService {
  constructor(private readonly repository: OrganizationsRepository) {}
  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const existingOrganization = await this.repository.findByCode(dto.code);
    if (existingOrganization) {
      throw new ConflictException(
        'An organization with this code already exists.',
      );
    }
    try {
      return await this.repository.create({
        code: dto.code,
        name: dto.name,
        legalName: dto.legalName,
        type: dto.type ?? OrganizationType.CLINIC,
        timezone: dto.timezone ?? 'Asia/Colombo',
        locale: dto.locale ?? 'en-LK',
        phone: dto.phone,
        email: dto.email,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        stateProvince: dto.stateProvince,
        postalCode: dto.postalCode,
        countryCode: dto.countryCode ?? 'LK',
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An organization with this code already exists.',
        );
      }
      throw error;
    }
  }
  async findAll(
    query: QueryOrganizationsDto,
  ): Promise<OrganizationListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.OrganizationWhereInput = {
      status: query.status,
      type: query.type,
      OR: query.search
        ? [
            { name: { contains: query.search } },
            { code: { contains: query.search.toUpperCase() } },
            { legalName: { contains: query.search } },
          ]
        : undefined,
    };
    const result = await this.repository.findPage({ where, skip, take: limit });
    return {
      data: result.data,
      meta: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }
  async findOne(id: string): Promise<Organization> {
    const organization = await this.repository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }
    return organization;
  }
  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    await this.findOne(id);
    return this.repository.update(id, { ...dto });
  }
}
