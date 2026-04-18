import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActionsService } from './actions.service';
import { ExecuteActionDto } from './dto/execute-action.dto';
import { UpdateActionStatusDto } from './dto/update-action-status.dto';

interface AuthenticatedRequest {
  user?: {
    email?: string;
    role?: string;
  };
}

@ApiTags('actions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('actions')
export class ActionsController {
  constructor(private readonly service: ActionsService) {}

  @Post('execute')
  @ApiOperation({ summary: 'Execute an action from an insight card' })
  execute(@Body() dto: ExecuteActionDto, @Req() req: AuthenticatedRequest) {
    return this.service.executeAction(dto, {
      email: req.user?.email,
      role: req.user?.role,
    });
  }

  @Get('history')
  @ApiOperation({ summary: 'Get action execution history' })
  history(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.getHistory(page, limit);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update status of an action log record' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActionStatusDto,
  ) {
    return this.service.updateStatus(id, dto);
  }
}
