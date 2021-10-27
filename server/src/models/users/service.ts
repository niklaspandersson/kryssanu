import User from "./model";

export interface IUserService {
  getUserByGoogleId(googleId: string): Promise<User|null>;
  createUser(googleId:string, name: string): Promise<User>;
}

export class InMemoryUserService implements IUserService {
  private users:Record<string, User> = {};

  getUserByGoogleId(googleId: string) {
    return Promise.resolve(this.users[googleId] ?? null);
  }
  createUser(googleId:string, name: string) {
    const user = new User();
    user.id = googleId;
    user.name = name;
    user.addedAt = user.updatedAt = new Date();
    this.users[googleId] = user;

    return Promise.resolve(user);
  }
}