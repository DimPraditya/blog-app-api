import { Prisma } from "../../generated/prisma";
import { ApiError } from "../../utils/apiError";
import { generateSlug } from "../../utils/generate-slug";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBlogDto } from "./dto/create-blog.dto";
import { GetBlogsDTO } from "./dto/get-blogs.dto";

export class BlogService {
  private prisma: PrismaService;
  private cloudinaryService: CloudinaryService;
  constructor() {
    this.prisma = new PrismaService();
    this.cloudinaryService = new CloudinaryService();
  }

  getBlogs = async (query: GetBlogsDTO) => {
    const { page, take, sortBy, sortOrder, search } = query;

    const whereClause: Prisma.BlogWhereInput = {
      deletedAt: null,
    };

    if (search) {
      whereClause.title = { contains: search, mode: "insensitive" };
    }

    const blogs = await this.prisma.blog.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take: take,
    });

    const total = await this.prisma.blog.count({ where: whereClause });

    return {
      data: blogs,
      meta: { page, take, total },
    };
  };

  createBlog = async (
    body: CreateBlogDto,
    thumbnail: Express.Multer.File,
    authUserId: number
  ) => {
    const blog = await this.prisma.blog.findFirst({
      where: { title: body.title },
    });

    if (blog) {
      throw new ApiError("title is already in used", 400);
    }

    const slug = generateSlug(body.title);

    const { secure_url } = await this.cloudinaryService.upload(thumbnail);

    return await this.prisma.blog.create({
      data: {
        ...body,
        thumbnail: secure_url,
        userId: authUserId,
        slug: slug,
      },
    });
  };
}
