import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;

  const FAKE_TOKEN = 'signed.jwt.token';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue(FAKE_TOKEN) },
        },
      ],
    }).compile();

    service    = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    // Clean up env variable overrides between tests
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
  });

  // ── Successful login ──────────────────────────────────────────────────────

  describe('login() — success', () => {
    it('returns access_token and user for valid default credentials', () => {
      const result = service.login('admin@pfis.com', 'pfis2026');

      expect(result.access_token).toBe(FAKE_TOKEN);
      expect(result.user.email).toBe('admin@pfis.com');
      expect(result.user.role).toBe('admin');
    });

    it('calls jwt.sign with correct payload', () => {
      service.login('admin@pfis.com', 'pfis2026');

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'admin@pfis.com', role: 'admin' }),
      );
    });

    it('uses ADMIN_EMAIL / ADMIN_PASSWORD env variables when set', () => {
      process.env.ADMIN_EMAIL    = 'custom@corp.com';
      process.env.ADMIN_PASSWORD = 'secret123';

      const result = service.login('custom@corp.com', 'secret123');
      expect(result.access_token).toBe(FAKE_TOKEN);
    });
  });

  // ── Failed login ──────────────────────────────────────────────────────────

  describe('login() — failure', () => {
    it('throws UnauthorizedException for wrong password', () => {
      expect(() => service.login('admin@pfis.com', 'wrong')).toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for wrong email', () => {
      expect(() => service.login('other@pfis.com', 'pfis2026')).toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for empty credentials', () => {
      expect(() => service.login('', '')).toThrow(UnauthorizedException);
    });

    it('does NOT sign a JWT on failed login', () => {
      try { service.login('bad@pfis.com', 'bad'); } catch {}
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });
});
