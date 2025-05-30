// import { PassportStrategy } from '@nestjs/passport';
// import { Strategy, VerifyCallback } from 'passport-google-oauth20';
// import { Injectable } from '@nestjs/common';

// @Injectable()
// export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
//   constructor() {
//     super({
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: 'http://localhost:3001/users/google/redirect',
//       scope: ['email', 'profile'],
//     });
//   }

//   async validate(
//     accessToken: string,
//     refreshToken: string,
//     profile: any,
//     done: VerifyCallback,
//   ): Promise<any> {
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//     const { name, emails, photos } = profile;
//     const user = {
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//       email: emails[0].value,
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
//       name: name.givenName,
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//       picture: photos[0].value,
//       accessToken,
//     };
//     done(null, user);
//   }
// }
