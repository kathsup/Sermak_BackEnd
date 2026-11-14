import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { genSalt, hash } from 'bcrypt';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      omit: { password: true, salt: true },
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });

    const hashedCurrent = await hash(dto.currentPassword, user.salt);
    if (hashedCurrent !== user.password) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const salt = await genSalt(10);
    const password = await hash(dto.newPassword, salt);

    await this.prisma.user.update({ where: { id }, data: { password, salt } });
    return { message: 'Contraseña actualizada' };
  }
}
