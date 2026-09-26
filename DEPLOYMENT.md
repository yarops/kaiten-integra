# Deployment

Build the static application with environment values available at build time:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co \
VITE_SUPABASE_ANON_KEY=your-anon-key \
pnpm build
```

Serve `dist/` from any static host with an SPA fallback to `index.html`. The included `docker-compose.yml` and `nginx.conf` serve it on port 8080:

```bash
docker compose up -d
```

No task-management API proxy or server-side API token is required. The anonymous key is public by design: without a signed-in user it grants no data access (see `SUPABASE_SETUP.md`).
