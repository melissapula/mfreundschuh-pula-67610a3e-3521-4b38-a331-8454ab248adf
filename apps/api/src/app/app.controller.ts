import { Controller, Get } from '@nestjs/common';
import { Public } from '@app/auth';
import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Public()
    @Get()
    getHealth() {
        return this.appService.getHealth();
    }
}
