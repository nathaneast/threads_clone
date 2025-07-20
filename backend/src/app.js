const express = require('express');
const cors = require('cors');
require('dotenv').config();
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

// 세션 설정
app.use(session({
  secret: 'your_secret', // 실제 서비스에서는 강력한 시크릿 사용
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport 구글 전략 설정
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // DB 저장/조회 대신 profile 그대로 사용
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

// 구글 로그인 시작
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 구글 로그인 콜백
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/'); // 로그인 성공 시 리다이렉트
  }
);

// 로그인 상태 확인
app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(req.user);
});

// 로그아웃
app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

// 기존 라우트 유지
app.get('/', (req, res) => {
  res.send('Threads Clone Backend!');
});

module.exports = app;
