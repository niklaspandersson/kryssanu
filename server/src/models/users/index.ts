import { InMemoryUserService } from "./service";
import User from './model';

const service = new InMemoryUserService();
export { User, service };