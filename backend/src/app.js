const express = require('express');
const cors = require('cors');
require('dotenv').config();
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

// 세션 설정
app.use(
  session({
    secret: "your_secret", // 실제 서비스에서는 강력한 시크릿 사용
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Passport 구글 전략 설정
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      // DB 저장/조회 대신 profile 그대로 사용
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

// 구글 로그인 시작
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// 구글 로그인 콜백
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  function (req, res) {
    res.redirect("/"); // 로그인 성공 시 리다이렉트
  }
);

// 로그인 상태 확인
app.get("/profile", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json(req.user);
});

// 로그아웃
app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

// 인증 필요 미들웨어
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: "로그인이 필요합니다." });
}

// 권한 체크 미들웨어 (Thread)
async function checkThreadOwner(req, res, next) {
  const thread = await prisma.thread.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!thread) return res.status(404).json({ error: "Thread not found" });
  if (thread.authorEmail !== req.user.emails[0].value) {
    return res.status(403).json({ error: "수정/삭제 권한이 없습니다." });
  }
  next();
}
// 권한 체크 미들웨어 (Comment)
async function checkCommentOwner(req, res, next) {
  const comment = await prisma.comment.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!comment) return res.status(404).json({ error: "Comment not found" });
  if (comment.authorEmail !== req.user.emails[0].value) {
    return res.status(403).json({ error: "수정/삭제 권한이 없습니다." });
  }
  next();
}

// ===== Thread CRUD =====
// 전체 쓰레드 조회
app.get("/threads", async (req, res) => {
  const threads = await prisma.thread.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(threads);
});
// 단일 쓰레드 조회
app.get("/threads/:id", async (req, res) => {
  const thread = await prisma.thread.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!thread) return res.status(404).json({ error: "Thread not found" });
  res.json(thread);
});
// 쓰레드 생성 (로그인 필요)
app.post("/threads", ensureAuthenticated, async (req, res) => {
  const { content } = req.body;
  try {
    const thread = await prisma.thread.create({
      data: { content, authorEmail: req.user.emails[0].value },
    });
    res.status(201).json(thread);
  } catch (e) {
    res.status(400).json({ error: "Invalid data" });
  }
});
// 쓰레드 수정 (본인만)
app.put(
  "/threads/:id",
  ensureAuthenticated,
  checkThreadOwner,
  async (req, res) => {
    const { content } = req.body;
    try {
      const thread = await prisma.thread.update({
        where: { id: Number(req.params.id) },
        data: { content },
      });
      res.json(thread);
    } catch {
      res.status(404).json({ error: "Thread not found" });
    }
  }
);
// 쓰레드 삭제 (본인만)
app.delete(
  "/threads/:id",
  ensureAuthenticated,
  checkThreadOwner,
  async (req, res) => {
    try {
      await prisma.thread.delete({ where: { id: Number(req.params.id) } });
      res.status(204).end();
    } catch {
      res.status(404).json({ error: "Thread not found" });
    }
  }
);

// ===== Comment CRUD =====
// 댓글 생성 (로그인 필요)
app.post(
  "/threads/:threadId/comments",
  ensureAuthenticated,
  async (req, res) => {
    const { content } = req.body;
    try {
      const comment = await prisma.comment.create({
        data: {
          content,
          threadId: Number(req.params.threadId),
          authorEmail: req.user.emails[0].value,
        },
      });
      res.status(201).json(comment);
    } catch {
      res.status(400).json({ error: "Invalid data or thread not found" });
    }
  }
);
// 댓글 수정 (본인만)
app.put(
  "/comments/:id",
  ensureAuthenticated,
  checkCommentOwner,
  async (req, res) => {
    const { content } = req.body;
    try {
      const comment = await prisma.comment.update({
        where: { id: Number(req.params.id) },
        data: { content },
      });
      res.json(comment);
    } catch {
      res.status(404).json({ error: "Comment not found" });
    }
  }
);
// 댓글 삭제 (본인만)
app.delete(
  "/comments/:id",
  ensureAuthenticated,
  checkCommentOwner,
  async (req, res) => {
    try {
      await prisma.comment.delete({ where: { id: Number(req.params.id) } });
      res.status(204).end();
    } catch {
      res.status(404).json({ error: "Comment not found" });
    }
  }
);

// 기존 라우트 유지
app.get('/', (req, res) => {
  res.send('Threads Clone Backend!');
});

module.exports = app;
