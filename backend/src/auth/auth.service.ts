import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}

  login(email: string, password: string) {
    const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@pfis.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'pfis2026';

    if (email !== adminEmail || password !== adminPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: 'admin', email, role: 'admin' };
    return {
      access_token: this.jwt.sign(payload),
      user: { email, role: 'admin' },
    };
  }
}
