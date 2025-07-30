import { Router } from "express";
import { BlogController } from "./blog.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateBlogDto } from "./dto/create-blog.dto";

export class BlogRouter {
  private blogController: BlogController;
  private router: Router;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;
  constructor() {
    this.router = Router();
    this.blogController = new BlogController();
    this.jwtMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.get("/", this.blogController.getBlogs);
    this.router.get("/:slug", this.blogController.getBlogBySlug);
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.uploaderMiddleware
        .upload()
        .fields([{ name: "thumbnail", maxCount: 1 }]),
      this.uploaderMiddleware.fileFilter([
        "image/jpeg",
        "image/png",
        "image/avif",
      ]),
      validateBody(CreateBlogDto),
      this.blogController.createBlog
    );
  };

  getRouter = () => {
    return this.router;
  };
}
