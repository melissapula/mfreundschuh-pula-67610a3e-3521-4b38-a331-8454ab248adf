import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import { AuthUser, CreateTaskDto, Permission, UpdateTaskDto } from '@app/data';
import { CurrentUser, RequirePermission } from '@app/auth';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
    constructor(private readonly tasks: TasksService) {}

    @Post()
    @RequirePermission(Permission.TASK_CREATE)
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
        return this.tasks.create(user, dto);
    }

    @Get()
    @RequirePermission(Permission.TASK_READ)
    findAll(@CurrentUser() user: AuthUser) {
        return this.tasks.findAllForUser(user);
    }

    @Put(':id')
    @RequirePermission(Permission.TASK_UPDATE)
    update(
        @CurrentUser() user: AuthUser,
        @Param('id') id: string,
        @Body() dto: UpdateTaskDto,
    ) {
        return this.tasks.update(user, id, dto);
    }

    @Delete(':id')
    @RequirePermission(Permission.TASK_DELETE)
    remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.tasks.remove(user, id);
    }
}
