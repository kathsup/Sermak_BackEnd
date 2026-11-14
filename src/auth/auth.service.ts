import { Injectable, UnauthorizedException } from '@nestjs/common';
import { hash } from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { signToken } from './jwt.util';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async login({ email, password }: LoginDto) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const hashed = await hash(password, user.salt);
    if (hashed !== user.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = signToken({ sub: user.id, email: user.email });
    return { token };
  }
}
