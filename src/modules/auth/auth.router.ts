import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validateBody } from "../../middlewares/validation.middleware";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";

export class AuthRouter {
  private authController: AuthController;
  private router: Router;
  constructor() {
    this.router = Router();
    this.authController = new AuthController();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post(
      "/register",
      validateBody(RegisterDto),
      this.authController.register
    );
    this.router.post(
      "/login",
      validateBody(LoginDto),
      this.authController.login
    );
    this.router.post(
      "/forgot-password",
      validateBody(ForgotPasswordDto),
      this.authController.forgotPassword
    );
  };

  getRouter = () => {
    return this.router;
  };
}
