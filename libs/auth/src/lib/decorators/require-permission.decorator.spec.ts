import 'reflect-metadata';
import { Permission } from '@app/data/browser';
import {
    PERMISSION_KEY,
    RequirePermission,
} from './require-permission.decorator';

describe('RequirePermission', () => {
    it('attaches the given permission as route metadata under PERMISSION_KEY, for PermissionsGuard to read', () => {
        class TestController {
            @RequirePermission(Permission.TASK_CREATE)
            // eslint-disable-next-line @typescript-eslint/no-empty-function -- never invoked; only the attached metadata is under test
            handler(): void {}
        }

        const metadata = Reflect.getMetadata(
            PERMISSION_KEY,
            TestController.prototype.handler,
        );

        expect(metadata).toBe(Permission.TASK_CREATE);
    });
});
