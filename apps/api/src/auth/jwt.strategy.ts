import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '@app/data';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get<string>(
                'JWT_SECRET',
                'dev-secret-change-me',
            ),
        });
    }

    /** Whatever we signed in AuthService.issueToken becomes req.user. */
    validate(payload: AuthUser): AuthUser {
        return payload;
    }
}
