import Mail from "nodemailer/lib/mailer";
import { ApiError } from "../../utils/apiError";
import { JwtService } from "../jwt/jwt.service";
import { MailService } from "../mail/mail.service";
import { PasswordService } from "../password/password.service";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

export class AuthService {
  private prisma: PrismaService;
  private passwordService: PasswordService;
  private jwtService: JwtService;
  private mailService: MailService;
  constructor() {
    this.prisma = new PrismaService();
    this.passwordService = new PasswordService();
    this.jwtService = new JwtService();
    this.mailService = new MailService();
  }

  register = async (body: RegisterDto) => {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    if (user) {
      throw new ApiError("email already exist", 400);
    }

    const hashedPassword = await this.passwordService.hashPassword(
      body.password
    );

    await this.mailService.sendMail(
      body.email,
      "Thankyou for Registering!",
      "welcome",
      { name: body.name, year: new Date().getFullYear() }
    );

    return await this.prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
      },
      omit: { password: true },
    });
  };

  login = async (body: LoginDto) => {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    if (!user) {
      throw new ApiError("Invalid Credentials", 400);
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      body.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new ApiError("Invalid Credentials", 400);
    }

    const payload = { id: user.id, role: user.role };
    const accessToken = this.jwtService.generateToken(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: "2h" }
    );

    const { password, ...userWithoutPassword } = user;

    return { ...userWithoutPassword, accessToken };
  };

  forgotPassword = async (body: ForgotPasswordDto) => {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    if (!user) {
      throw new ApiError("Invalid Email Address", 400);
    }

    const payload = { id: user.id };
    const token = this.jwtService.generateToken(
      payload,
      process.env.JWT_SECRET_RESET!,
      { expiresIn: "15m" }
    );

    const resetLink = `http://localhost:3000/reset-password/${token}`;

    await this.mailService.sendMail(
      body.email,
      "Reset Your Password",
      "forgot-password",
      {
        name: user.name,
        resetLink: resetLink,
        expiryMinutes: "15",
        year: new Date().getFullYear(),
      }
    );

    return { message: "Check your email" };
  };

  resetPassword = async (body: ResetPasswordDto, authUserId: number) => {
    const user = await this.prisma.user.findFirst({
      where: { id: authUserId },
    });

    if (!user) {
      throw new ApiError("User Not Found", 404);
    }

    const hashedPassword = await this.passwordService.hashPassword(
      body.password
    );

    await this.prisma.user.update({
      where: { id: authUserId },
      data: { password: hashedPassword },
    });

    return { message: "reset password success" };
  };
}
