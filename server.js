import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
};

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  credits: user.credits,
  role: user.role,
});

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      ok: true,
      message: "Aivora AI backend is running",
      database: "connected",
    });
  } catch (error) {
    console.error("Health check error:", error);

    res.status(500).json({
      ok: false,
      message: "Backend is running but database connection failed",
    });
  }
});

// Signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        credits: 50,
        role: "USER",
        creditTransactions: {
          create: {
            amount: 50,
            type: "BONUS",
            description: "Welcome bonus - 50 free credits",
          },
        },
      },
    });

    const token = createToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Signup error:", error);

    res.status(500).json({
      error: "Unable to create account",
    });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const token = createToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      error: "Unable to login",
    });
  }
});

// Current user
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  res.json({
    user: publicUser(req.user),
  });
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({
    message: "Logged out successfully",
  });
});

// Get creation history
app.get("/api/creations", authMiddleware, async (req, res) => {
  try {
    const creations = await prisma.creation.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ creations });
  } catch (error) {
    console.error("Fetch creations error:", error);

    res.status(500).json({
      error: "Unable to load creation history",
    });
  }
});

// Create a media record and deduct credits
app.post("/api/creations", authMiddleware, async (req, res) => {
  try {
    const { type, prompt, cost } = req.body;

    if (!type || !prompt) {
      return res.status(400).json({
        error: "Type and prompt are required",
      });
    }

    const allowedTypes = ["VIDEO", "IMAGE", "AUDIO"];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        error: "Invalid creation type",
      });
    }

    const numericCost = Number(cost);

    if (!Number.isInteger(numericCost) || numericCost <= 0) {
      return res.status(400).json({
        error: "Invalid credit cost",
      });
    }

    const resultUrl =
      "https://example.com/aivora-generation-pending.mp4";

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      if (user.credits < numericCost) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          credits: {
            decrement: numericCost,
          },
        },
      });

      const creation = await tx.creation.create({
        data: {
          type,
          prompt: String(prompt),
          resultUrl,
          cost: numericCost,
          userId: user.id,
        },
      });

      await tx.creditTransaction.create({
        data: {
          amount: -numericCost,
          type: "USAGE",
          description: `Used ${numericCost} credits for ${type}`,
          userId: user.id,
        },
      });

      return {
        creation,
        remainingCredits: updatedUser.credits,
      };
    });

    res.status(201).json(result);
  } catch (error) {
    if (error.message === "INSUFFICIENT_CREDITS") {
      return res.status(400).json({
        error: "Insufficient credits",
      });
    }

    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        error: "User not found",
      });
    }

    console.error("Creation error:", error);

    res.status(500).json({
      error: "Unable to create generation",
    });
  }
});

// Admin test endpoint
app.get("/api/admin/status", authMiddleware, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      error: "Admin access required",
    });
  }

  res.json({
    ok: true,
    message: "Admin access granted",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Aivora AI server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
