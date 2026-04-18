import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';

interface AuthenticatedRequest {
  user?: {
    userId?: string;
    role?: string;
    email?: string;
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login — returns JWT' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Get('users')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List users (admin only)' })
  listUsers(@Req() req: AuthenticatedRequest) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Only admin can view user list');
    }
    return this.auth.listUsers();
  }

  @Post('users')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create user (admin only)' })
  createUser(@Body() dto: CreateUserDto, @Req() req: AuthenticatedRequest) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Only admin can create users');
    }
    return this.auth.createUser(dto);
  }
}
