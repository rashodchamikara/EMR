import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { patientInclude, PatientsRepository } from './patients.repository';
import { QueryPatientsDto, SavePatientDto, UpdatePatientDto } from './dto/patient.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly repository: PatientsRepository) {}

  facilities(organizationId: string) { return this.repository.facilities(organizationId); }
  async findOne(organizationId: string, id: string) {
    const patient = await this.repository.findOne(organizationId, id);
    if (!patient) throw new NotFoundException('Patient not found.');
    return patient;
  }
  async findMany(organizationId: string, query: QueryPatientsDto) {
    const terms = query.search?.split(/\s+/).filter(Boolean) ?? [];
    const where: Prisma.PatientWhereInput = { organizationId, status: query.status,
      ...(query.facilityId ? { facilities: { some: { organizationId, facilityId: query.facilityId } } } : {}),
      AND: terms.map((term) => ({ OR: [
        { firstName: { contains: term } }, { middleName: { contains: term } }, { lastName: { contains: term } },
        { medicalRecordNumber: { contains: term } }, { phone: { contains: term } }, { nationalIdNumber: { contains: term } },
      ] })),
    };
    const [data, total] = await this.repository.list(where, (query.page - 1) * query.limit, query.limit);
    return { data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }
  private async validate(tx: Prisma.TransactionClient, organizationId: string, dto: SavePatientDto, existingFacilityIds: string[] = []) {
    const org = await tx.organization.findUnique({ where: { id: organizationId }, select: { id: true, status: true } });
    if (!org) throw new NotFoundException('Organization not found.');
    if (org.status !== 'ACTIVE') throw new BadRequestException('Patient changes require an active organization.');
    if (dto.dateOfBirth && dto.dateOfBirth > new Date().toISOString().slice(0, 10)) throw new BadRequestException('Date of birth cannot be in the future.');
    if (Boolean(dto.nationalIdType?.trim()) !== Boolean(dto.nationalIdNumber?.trim())) throw new BadRequestException('Enter both identity type and identity number, or leave both blank.');
    if (dto.primaryFacilityId && !dto.facilityIds.includes(dto.primaryFacilityId)) throw new BadRequestException('Primary facility must be selected in facility links.');
    if (dto.facilityIds.length && !dto.primaryFacilityId) throw new BadRequestException('Choose a primary facility.');
    if (dto.emergencyContacts.length && dto.emergencyContacts.filter((c) => c.isPrimary).length !== 1) throw new BadRequestException('Choose exactly one primary emergency contact.');
    const facilities = await tx.facility.findMany({ where: { organizationId, id: { in: dto.facilityIds } }, select: { id: true, status: true } });
    if (facilities.length !== dto.facilityIds.length) throw new BadRequestException('One or more facilities do not belong to this organization.');
    if (facilities.some((f) => f.status !== 'ACTIVE' && !existingFacilityIds.includes(f.id))) throw new BadRequestException('New facility links require an active facility.');
  }
  private fields(dto: SavePatientDto) {
    const clean = (v: string | null | undefined) => v?.trim() || null;
    return {
      firstName: dto.firstName, lastName: dto.lastName, middleName: clean(dto.middleName),
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth + 'T00:00:00.000Z') : null, sex: dto.sex ?? null,
      nationalIdType: clean(dto.nationalIdType), nationalIdNumber: clean(dto.nationalIdNumber),
      phone: clean(dto.phone), alternatePhone: clean(dto.alternatePhone), email: clean(dto.email)?.toLowerCase() ?? null,
      addressLine1: clean(dto.addressLine1), addressLine2: clean(dto.addressLine2), city: clean(dto.city),
      stateProvince: clean(dto.stateProvince), postalCode: clean(dto.postalCode), country: clean(dto.country),
      bloodGroup: clean(dto.bloodGroup), status: dto.status ?? 'ACTIVE' as const,
    };
  }
  private async children(tx: Prisma.TransactionClient, organizationId: string, patientId: string, dto: SavePatientDto) {
    // Preserve registration dates on retained facility links.
    await tx.patientFacility.deleteMany({ where: { organizationId, patientId, facilityId: { notIn: dto.facilityIds } } });
    await tx.patientFacility.updateMany({ where: { organizationId, patientId }, data: { isPrimary: false } });
    for (const facilityId of dto.facilityIds) {
      await tx.patientFacility.upsert({ where: { patientId_facilityId: { patientId, facilityId } },
        create: { organizationId, patientId, facilityId, isPrimary: facilityId === dto.primaryFacilityId },
        update: { isPrimary: facilityId === dto.primaryFacilityId } });
    }
    // Contacts are a replacement list in this sprint; their IDs are internal.
    await tx.patientEmergencyContact.deleteMany({ where: { organizationId, patientId } });
    if (dto.emergencyContacts.length) await tx.patientEmergencyContact.createMany({ data: dto.emergencyContacts.map((c) => ({
      organizationId, patientId, name: c.name, phone: c.phone, relationship: c.relationship?.trim() || null,
      alternatePhone: c.alternatePhone?.trim() || null, isPrimary: c.isPrimary ?? false,
    })) });
  }
  private async retry<T>(work: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await work(); }
      catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (['P2034', 'P2002'].includes(error.code)) {
            if (attempt < 2) { await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1))); continue; }
            throw new ConflictException('Concurrent change detected. Reload and try again.');
          }
          if (['P1001', 'P1002', 'P2024'].includes(error.code)) throw new ServiceUnavailableException('Database unavailable. Please try again.');
        }
        throw error;
      }
    }
    throw new ConflictException('Please reload and try again.');
  }
  create(organizationId: string, dto: SavePatientDto) {
    return this.retry(() => this.repository.transaction(async (tx) => {
      await this.validate(tx, organizationId, dto);
      // The upsert locks this organization's sequence before allocation.
      const seq = await tx.patientNumberSequence.upsert({ where: { organizationId },
        create: { organizationId, nextValue: 1 }, update: { nextValue: { increment: 0 } } });
      let next = seq.nextValue;
      let medicalRecordNumber = `MRN-${String(next).padStart(8, '0')}`;
      // Existing numbers are never reused, including after a restored sequence.
      while (await tx.patient.findUnique({ where: { organizationId_medicalRecordNumber: { organizationId, medicalRecordNumber } }, select: { id: true } })) {
        next++; medicalRecordNumber = `MRN-${String(next).padStart(8, '0')}`;
      }
      if (next >= 2147483647) throw new ConflictException('Patient number sequence exhausted.');
      await tx.patientNumberSequence.update({ where: { organizationId }, data: { nextValue: next + 1 } });
      const patient = await tx.patient.create({ data: { organizationId, medicalRecordNumber, ...this.fields(dto) } });
      await this.children(tx, organizationId, patient.id, dto);
      return tx.patient.findUniqueOrThrow({ where: { id: patient.id }, include: patientInclude });
    }));
  }
  update(organizationId: string, id: string, dto: UpdatePatientDto) {
    return this.retry(() => this.repository.transaction(async (tx) => {
      const previous = await tx.patient.findFirst({ where: { id, organizationId }, include: { facilities: true } });
      if (!previous) throw new NotFoundException('Patient not found.');
      const expected = new Date(dto.expectedUpdatedAt);
      if (expected.getTime() !== previous.updatedAt.getTime()) throw new ConflictException('This patient was changed by another user. Close and reopen the record before editing.');
      await this.validate(tx, organizationId, dto, previous.facilities.map((f) => f.facilityId));
      const result = await tx.patient.updateMany({ where: { id, organizationId, updatedAt: expected },
        data: { ...this.fields(dto), updatedAt: new Date(Math.max(Date.now(), previous.updatedAt.getTime() + 1)) } });
      if (result.count !== 1) throw new ConflictException('This patient was changed by another user. Reload the record.');
      await this.children(tx, organizationId, id, dto);
      return tx.patient.findUniqueOrThrow({ where: { id }, include: patientInclude });
    }));
  }
}
