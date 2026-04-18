import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface PredictRequest {
  amount: number;
  country: string;
  device: string;
  paymentMethod: string;
  gateway: string;
  retryCount: number;
  riskScore: number;
  hourOfDay?: number;
  dayOfWeek?: number;
}

@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);
  private readonly baseUrl: string;

  constructor(private readonly http: HttpService) {
    this.baseUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }

  async predict(data: PredictRequest) {
    try {
      const res = await firstValueFrom(
        this.http.post(`${this.baseUrl}/predict`, data),
      );
      return res.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.warn(`ML service unavailable: ${axiosErr.message}`);
      throw new ServiceUnavailableException(
        'ML service is not available. Please start the FastAPI ML service.',
      );
    }
  }

  async getModelMetrics() {
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.baseUrl}/metrics`),
      );
      return res.data;
    } catch {
      throw new ServiceUnavailableException('ML service is not available.');
    }
  }

  async healthCheck() {
    try {
      const res = await firstValueFrom(this.http.get(`${this.baseUrl}/health`));
      return { status: 'online', ...res.data };
    } catch {
      return { status: 'offline', message: 'ML service not reachable' };
    }
  }
}
