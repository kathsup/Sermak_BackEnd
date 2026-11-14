import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toHondurasDate } from './dates';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

const withClient = { client: { select: { name: true } } };

const transitions: Record<InvoiceStatus, InvoiceStatus[]> = {
  POR_ENVIAR: ['PENDIENTE', 'ANULADA'],
  PENDIENTE: ['PAGADA', 'VENCIDA', 'ANULADA'],
  VENCIDA: ['PAGADA', 'ANULADA'],
  PAGADA: [],
  ANULADA: [],
};

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInvoiceDto, userId: string) {
    const { issueDate, dueDate, ...rest } = dto;

    try {
      return await this.prisma.invoice.create({
        data: {
          ...rest,
          issueDate: toHondurasDate(issueDate),
          dueDate: toHondurasDate(dueDate),
          history: [
            { status: InvoiceStatus.POR_ENVIAR, date: new Date(), userId },
          ],
        },
        include: withClient,
      });
    } catch (error) {
      this.handleDuplicate(error);
    }
  }

  findAll(filters: {
    status?: InvoiceStatus;
    clientId?: string;
    search?: string;
  }) {
    const { status, clientId, search } = filters;

    return this.prisma.invoice.findMany({
      where: {
        ...(status && { status }),
        ...(clientId && { clientId }),
        ...(search && { number: { contains: search, mode: 'insensitive' } }),
      },
      include: withClient,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: withClient,
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(id);
    if (
      invoice.status !== InvoiceStatus.POR_ENVIAR &&
      invoice.status !== InvoiceStatus.PENDIENTE
    ) {
      throw new BadRequestException(
        'Solo se pueden editar facturas por enviar o pendientes',
      );
    }

    const { issueDate, dueDate, ...rest } = dto;

    try {
      return await this.prisma.invoice.update({
        where: { id },
        data: {
          ...rest,
          ...(issueDate && { issueDate: toHondurasDate(issueDate) }),
          ...(dueDate && { dueDate: toHondurasDate(dueDate) }),
        },
        include: withClient,
      });
    } catch (error) {
      this.handleDuplicate(error);
    }
  }

  async changeStatus(id: string, status: InvoiceStatus, userId: string) {
    const invoice = await this.findOne(id);

    if (!transitions[invoice.status].includes(status)) {
      throw new BadRequestException(
        `No se puede pasar de ${invoice.status} a ${status}`,
      );
    }

    const now = new Date();

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status,
        history: { push: { status, date: now, userId } },
        ...(status === 'PENDIENTE' && { sentAt: now }),
        ...(status === 'PAGADA' && { paidAt: now }),
        ...(status === 'ANULADA' && { canceledAt: now }),
      },
      include: withClient,
    });
  }

  async remove(id: string) {
    const invoice = await this.findOne(id);

    if (invoice.status !== InvoiceStatus.POR_ENVIAR) {
      throw new BadRequestException(
        'Solo se pueden eliminar facturas por enviar',
      );
    }

    return this.prisma.invoice.delete({ where: { id } });
  }

  // Convierte el error de número repetido de Prisma en un 409
  private handleDuplicate(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Ya existe una factura con ese número');
    }
    throw error;
  }
}
