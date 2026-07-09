---
title: Pocket Interview Coach API
emoji: 🎤
colorFrom: purple
colorTo: cyan
sdk: docker
app_port: 8000
pinned: false
---

# Pocket Interview Coach — Backend API

FastAPI backend for [Pocket Interview Coach](https://github.com/sanjai-b-2006/pocket_interview_new).
See the main repo README for full documentation. This Space exposes the API only — pair it with the
frontend deployed separately (e.g. on Vercel), pointing `NEXT_PUBLIC_API_BASE_URL` at this Space's URL.

Set these as Space secrets (Settings → Repository secrets):
- `FIREWORKS_API_KEY`
- `FIREWORKS_BASE_URL`
- `GEMMA_MODEL`
- `CORS_ORIGINS` (your deployed frontend URL)
