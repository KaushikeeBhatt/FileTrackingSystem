import { AuthService } from "./auth"

export const hashPassword = AuthService.hashPassword.bind(AuthService)
export const verifyPassword = AuthService.verifyPassword.bind(AuthService)
export const generateToken = AuthService.generateToken.bind(AuthService)
export const verifyToken = AuthService.verifyToken.bind(AuthService)
