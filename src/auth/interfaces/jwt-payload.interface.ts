import { Role } from '../../common/roles/role.enum';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}

