const { z } = require("zod");
const { prisma } = require("../config/database");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { getPagination } = require("../utils/pagination");
const { logActivity } = require("../utils/activity");

const blogSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3).optional(),
  category: z.string().min(2),
  excerpt: z.string().optional(),
  content: z.string().min(10),
  coverImage: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional().default("DRAFT"),
  authorName: z.string().optional().default("Bhawani Fitness Team")
});

function createSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function publishedAtFor(status, existingDate) {
  if (status === "PUBLISHED") return existingDate || new Date();
  return null;
}

const listPublicBlogs = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPagination(req.query);
  const where = { status: "PUBLISHED" };
  if (req.query.category) where.category = req.query.category;

  const [blogs, total] = await Promise.all([
    prisma.blogPost.findMany({ where, skip, take: limit, orderBy: { publishedAt: "desc" } }),
    prisma.blogPost.count({ where })
  ]);

  sendSuccess(res, "Published blogs fetched", { blogs, pagination: { page, limit, total } });
});

const listAdminBlogs = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPagination(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.category) where.category = req.query.category;
  if (req.query.search) {
    where.OR = [
      { title: { contains: req.query.search, mode: "insensitive" } },
      { category: { contains: req.query.search, mode: "insensitive" } }
    ];
  }

  const [blogs, total] = await Promise.all([
    prisma.blogPost.findMany({ where, skip, take: limit, orderBy: { updatedAt: "desc" } }),
    prisma.blogPost.count({ where })
  ]);

  sendSuccess(res, "Blogs fetched", { blogs, pagination: { page, limit, total } });
});

const createBlog = asyncHandler(async (req, res) => {
  const data = blogSchema.parse(req.body);
  const slug = data.slug || createSlug(data.title);

  const blog = await prisma.blogPost.create({
    data: {
      ...data,
      slug,
      publishedAt: publishedAtFor(data.status)
    }
  });

  await logActivity({ actor: req.user, action: "BLOG_CREATED", entity: "BlogPost", entityId: blog.id, metadata: { status: blog.status } });
  sendSuccess(res, "Blog created", { blog }, 201);
});

const updateBlog = asyncHandler(async (req, res) => {
  const data = blogSchema.partial().parse(req.body);
  const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
  const blog = await prisma.blogPost.update({
    where: { id: req.params.id },
    data: {
      ...data,
      slug: data.slug || (data.title ? createSlug(data.title) : undefined),
      publishedAt: data.status ? publishedAtFor(data.status, existing?.publishedAt) : undefined
    }
  });

  await logActivity({ actor: req.user, action: "BLOG_UPDATED", entity: "BlogPost", entityId: blog.id, metadata: data });
  sendSuccess(res, "Blog updated", { blog });
});

module.exports = { createBlog, listAdminBlogs, listPublicBlogs, updateBlog };
