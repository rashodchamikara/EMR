import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Facility, FacilityType, Prisma } from '../../generated/prisma/client';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { FacilityListResponseDto } from './dto/facility-response.dto';
import { QueryFacilitiesDto } from './dto/query-facilities.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { FacilitiesRepository } from './facilities.repository';
@Injectable()
export class FacilitiesService {
  constructor(private readonly repository: FacilitiesRepository) {}
  async create(
    organizationId: string,
    dto: CreateFacilityDto,
  ): Promise<Facility> {
    const existingFacility = await this.repository.findByCode(
      organizationId,
      dto.code,
    );
    if (existingFacility) {
      throw new ConflictException(
        'A facility with this code already exists in the organization.',
      );
    }
    try {
      return await this.repository.create({
        organizationId,
        code: dto.code,
        name: dto.name,
        legalName: dto.legalName,
        type: dto.type ?? FacilityType.CLINIC,
        timezone: dto.timezone ?? 'Asia/Colombo',
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
          'A facility with this code already exists in the organization.',
        );
      }
      throw error;
    }
  }
  async findAll(
    organizationId: string,
    query: QueryFacilitiesDto,
  ): Promise<FacilityListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.FacilityWhereInput = {
      status: query.status,
      type: query.type,
      OR: query.search
        ? [
            { name: { contains: query.search } },
            { code: { contains: query.search.toUpperCase() } },
            { city: { contains: query.search } },
          ]
        : undefined,
    };
    const result = await this.repository.findPage({
      organizationId,
      where,
      skip,
      take: limit,
    });
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
  async findOne(organizationId: string, facilityId: string): Promise<Facility> {
    const facility = await this.repository.findById(organizationId, facilityId);
    if (!facility) {
      throw new NotFoundException('Facility not found.');
    }
    return facility;
  }
  async update(
    organizationId: string,
    facilityId: string,
    dto: UpdateFacilityDto,
  ): Promise<Facility> {
    await this.findOne(organizationId, facilityId);
    return this.repository.update(organizationId, facilityId, dto);
  }
}
