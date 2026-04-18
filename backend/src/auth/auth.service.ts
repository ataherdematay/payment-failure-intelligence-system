import {
  ConflictException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    const usersCount = await this.userRepo.count();
    if (usersCount > 0) {
      return;
    }

    const seedUsers: Array<{
      email: string;
      fullName: string;
      role: UserRole;
      password: string;
    }> = [
      {
        email: process.env.ADMIN_EMAIL || 'admin@pfis.com',
        fullName: 'PFIS Admin',
        role: 'admin',
        password: process.env.ADMIN_PASSWORD || 'pfis2026',
      },
      {
        email: process.env.ANALYST_EMAIL || 'analyst@pfis.com',
        fullName: 'PFIS Analyst',
        role: 'analyst',
        password: process.env.ANALYST_PASSWORD || 'pfisAnalyst2026',
      },
      {
        email: process.env.OPERATOR_EMAIL || 'operator@pfis.com',
        fullName: 'PFIS Operator',
        role: 'operator',
        password: process.env.OPERATOR_PASSWORD || 'pfisOperator2026',
      },
    ];

    const entities = seedUsers.map((u) =>
      this.userRepo.create({
        email: u.email.toLowerCase(),
        fullName: u.fullName,
        role: u.role,
        passwordHash: this.hashPassword(u.password),
        isActive: true,
      }),
    );

    await this.userRepo.save(entities);
  }

  private hashPassword(password: string) {
    const salt = process.env.PFIS_AUTH_SALT || 'pfis-auth-salt-2026';
    return createHash('sha256').update(`${password}:${salt}`).digest('hex');
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = this.hashPassword(password);

    const user = await this.userRepo.findOne({
      where: {
        email: normalizedEmail,
        isActive: true,
      },
    });

    if (!user || user.passwordHash !== passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    return {
      access_token: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async listUsers() {
    const users = await this.userRepo.find({
      order: { createdAt: 'ASC' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users;
  }

  async createUser(dto: CreateUserDto) {
    const exists = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (exists) {
      throw new ConflictException('User already exists');
    }

    const user = this.userRepo.create({
      email: dto.email.toLowerCase(),
      fullName: dto.fullName,
      role: dto.role,
      passwordHash: this.hashPassword(dto.password),
      isActive: true,
    });

    const saved = await this.userRepo.save(user);
    return {
      id: saved.id,
      email: saved.email,
      fullName: saved.fullName,
      role: saved.role,
      isActive: saved.isActive,
      createdAt: saved.createdAt,
    };
  }
}
