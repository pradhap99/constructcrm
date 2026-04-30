import {
  Controller, Post, Get, Param, Query,
  UseGuards, UseInterceptors, UploadedFile,
  Body, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantContext, AuthenticatedUser } from '../../common/decorators/tenant.decorator';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a document and start the AI processing pipeline' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        new FileTypeValidator({ fileType: /(pdf|xlsx|xls|docx|doc|png|jpg|jpeg)/ }),
      ],
    })) file: Express.Multer.File,
    @Body('projectId') projectId: string,
    @Body('type') type: string,
    @Body('templateSchemaId') templateSchemaId?: string,
  ) {
    return this.documentsService.uploadDocument(
      tenant.id, user.id, projectId, file, type, templateSchemaId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all documents for this tenant' })
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('projectId') projectId?: string,
  ) {
    return this.documentsService.findAll(tenant.id, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document status and processing results' })
  async findOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.documentsService.findOne(tenant.id, id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get a presigned download URL for the generated Excel file' })
  async getDownloadUrl(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    const url = await this.documentsService.getDownloadUrl(tenant.id, id);
    return { url };
  }
}
