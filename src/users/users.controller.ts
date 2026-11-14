import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: { sub: string }) {
    return this.usersService.findById(user.sub);
  }

  @Patch('change-password')
  changePassword(
    @CurrentUser() user: { sub: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.sub, dto);
  }
}
