import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';

export const patientInclude = {
  facilities: { include: { facility: { select: { id: true, code: true, name: true, status: true } } }, orderBy: { registeredAt: 'asc' as const } },
  emergencyContacts: { orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }] },
} satisfies Prisma.PatientInclude;

@Injectable()
export class PatientsRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 15000 });
  }
  findOne(organizationId: string, id: string) {
    return this.prisma.patient.findFirst({ where: { id, organizationId }, include: patientInclude });
  }
  list(where: Prisma.PatientWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.patient.findMany({ where, skip, take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { id: true, medicalRecordNumber: true, firstName: true, middleName: true, lastName: true, dateOfBirth: true, sex: true, phone: true, status: true } }),
      this.prisma.patient.count({ where }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  facilities(organizationId: string) {
    return this.prisma.facility.findMany({ where: { organizationId }, select: { id: true, code: true, name: true, status: true }, orderBy: { name: 'asc' } });
  }
}
