import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';

const makeRepoMock = () => ({
  count: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
});

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: '5f9ff1ef-9f45-40ef-a9e9-53a46b0d8ed7',
    email: 'admin@pfis.com',
    fullName: 'PFIS Admin',
    role: 'admin',
    passwordHash: '',
    isActive: true,
    createdAt: new Date('2026-04-18T12:00:00.000Z'),
    updatedAt: new Date('2026-04-18T12:00:00.000Z'),
    ...overrides,
  }) as User;

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let repoMock: ReturnType<typeof makeRepoMock>;

  const FAKE_TOKEN = 'signed.jwt.token';

  beforeEach(async () => {
    repoMock = makeRepoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue(FAKE_TOKEN) },
        },
        { provide: getRepositoryToken(User), useValue: repoMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
  });

  describe('onModuleInit()', () => {
    it('seeds default users when table is empty', async () => {
      repoMock.count.mockResolvedValue(0);
      repoMock.create.mockImplementation((x) => x);
      repoMock.save.mockResolvedValue([]);

      await service.onModuleInit();

      expect(repoMock.create).toHaveBeenCalledTimes(3);
      expect(repoMock.save).toHaveBeenCalled();
    });

    it('does not seed when users already exist', async () => {
      repoMock.count.mockResolvedValue(2);

      await service.onModuleInit();

      expect(repoMock.create).not.toHaveBeenCalled();
    });
  });

  describe('login() — success', () => {
    it('returns token and user for valid credentials', async () => {
      await service.onModuleInit();
      const passwordHash = (service as any).hashPassword('pfis2026') as string;

      repoMock.findOne.mockResolvedValue(
        mockUser({
          passwordHash,
        }),
      );

      const result = await service.login('admin@pfis.com', 'pfis2026');

      expect(result.access_token).toBe(FAKE_TOKEN);
      expect(result.user.email).toBe('admin@pfis.com');
      expect(result.user.role).toBe('admin');
    });

    it('calls jwt.sign with expected payload fields', async () => {
      const passwordHash = (service as any).hashPassword('pfis2026') as string;
      repoMock.findOne.mockResolvedValue(mockUser({ passwordHash }));

      await service.login('admin@pfis.com', 'pfis2026');

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'admin@pfis.com',
          role: 'admin',
          fullName: 'PFIS Admin',
        }),
      );
    });
  });

  describe('login() — failure', () => {
    it('throws UnauthorizedException for unknown user', async () => {
      repoMock.findOne.mockResolvedValue(null);
      await expect(service.login('ghost@pfis.com', 'x')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for wrong password', async () => {
      repoMock.findOne.mockResolvedValue(
        mockUser({
          passwordHash: (service as any).hashPassword(
            'right-password',
          ) as string,
        }),
      );
      await expect(
        service.login('admin@pfis.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not sign JWT on failed login', async () => {
      repoMock.findOne.mockResolvedValue(null);
      try {
        await service.login('bad@pfis.com', 'bad');
      } catch {
        // expected
      }
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('createUser()', () => {
    it('creates user when email does not exist', async () => {
      repoMock.findOne.mockResolvedValue(null);
      const created = mockUser({
        email: 'analyst@pfis.com',
        role: 'analyst',
        fullName: 'PFIS Analyst',
      });
      repoMock.create.mockReturnValue(created);
      repoMock.save.mockResolvedValue(created);

      const result = await service.createUser({
        email: 'analyst@pfis.com',
        fullName: 'PFIS Analyst',
        role: 'analyst',
        password: 'secret123',
      });

      expect(result.email).toBe('analyst@pfis.com');
      expect(result.role).toBe('analyst');
    });
  });

  describe('listUsers()', () => {
    it('returns users from repository', async () => {
      repoMock.find.mockResolvedValue([mockUser()]);

      const users = await service.listUsers();

      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('admin@pfis.com');
    });
  });
});
