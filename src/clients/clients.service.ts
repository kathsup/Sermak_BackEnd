import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateClientDto) {
    return this.prisma.client.create({ data: dto });
  }

  findAll(search?: string, active?: boolean) {
    return this.prisma.client.findMany({
      where: {
        active,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { contactName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findOne(id);
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const invoices = await this.prisma.invoice.count({
      where: { clientId: id },
    });

    if (invoices > 0) {
      return this.prisma.client.update({
        where: { id },
        data: { active: false },
      });
    }
    return this.prisma.client.delete({ where: { id } });
  }
}
