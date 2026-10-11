# 🏡 Cozy Task Village

Manajemen task yang tampil seperti game cozy: sebuah pulau pastel 3D low-poly tempat setiap
"agent" (anggota tim) punya rumah sendiri. Saat agent mengerjakan task, ia berjalan pulang ke
rumahnya dan muncul gelembung berisi nama task + progress. Task selesai → animasi `+XP Task complete!`
dan agent naik level.

Sejak fase 1, seluruh state (agent, task, XP, log) hidup di **server + PostgreSQL** dan dikirim ke
desa secara realtime lewat **WebSocket**. Frontend hanya menyimpan preferensi visual di browser.

## Jalankan

```bash
npm install

# Opsi A: PostgreSQL lokal (buat database lalu isi apps/server/.env)
createdb cozy_village
cp apps/server/.env.example apps/server/.env     # DATABASE_URL=postgres://localhost:5432/cozy_village

# Opsi B: tanpa Postgres — kosongkan DATABASE_URL, server memakai PGlite (Postgres embedded) di apps/server/data/

npm run dev        # server http://localhost:3001 + web http://localhost:5173 (proxy /api dan /ws)
```

Migrasi dijalankan otomatis saat server start, dan tim demo di-seed kalau database masih kosong.

Produksi: `npm run build` lalu `npm start`. Server akan menyajikan `apps/web/dist` di `/`, jadi satu
proses cukup untuk seluruh aplikasi.

## Struktur monorepo

```
apps/web/          # Vite + React + react-three-fiber (desa 3D, HUD, panel)
apps/server/       # Fastify + Drizzle ORM + WebSocket + mesin task + simulasi demo
packages/shared/   # tipe domain, skema zod untuk API, state machine task, layout gedung
```

### apps/server

```
src/index.ts         # bootstrap Fastify, error handler, static hosting
src/routes.ts        # REST + /ws
src/realtime.ts      # hub WebSocket (publish ke semua klien)
src/core/tasks.ts    # createTask / updateTask / transitionTask / setProgress / delete
src/core/agents.ts   # CRUD agent
src/core/events.ts   # activity log
src/core/settings.ts # pengaturan server (demoSim)
src/core/demo.ts     # simulasi demo, memakai core yang sama dengan traffic nyata
src/db/schema.ts     # tabel: agents, tasks, task_runs, events, xp_events, settings
src/db/index.ts      # koneksi: node-postgres jika DATABASE_URL ada, kalau tidak PGlite
src/db/seed.ts       # tim demo + task awal
drizzle/             # migrasi SQL (npm run db:generate setelah mengubah schema)
```

## Mesin task

Status: `todo → queued → running → review → done`, dengan cabang `failed` dan `cancelled`.
Transisi yang diizinkan ada di `packages/shared` (`TRANSITIONS`) dan ditegakkan server
(`409` kalau tidak valid). Saat masuk `running` tanpa assignee, server memilih agent yang idle.
Saat masuk `done`, XP ditambahkan ke agent secara transaksional, dicatat di `xp_events`,
dan server mengirim toast `+XP` (plus `Level up` kalau naik level).

## REST API

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/health` | status server, jenis DB, jumlah klien WS |
| GET | `/api/state` | snapshot lengkap: agents, tasks, events, settings |
| GET/POST | `/api/tasks` | daftar / buat task `{ title, description?, assigneeId?, xp?, priority? }` |
| GET/PATCH/DELETE | `/api/tasks/:id` | detail / ubah / hapus |
| POST | `/api/tasks/:id/transition` | `{ to, result?, error? }` |
| POST | `/api/tasks/:id/progress` | `{ progress, note? }` hanya saat `running` |
| GET/POST | `/api/agents`, `/api/agents/:id` | CRUD agent |
| GET | `/api/events?limit=50` | activity log |
| GET/PATCH | `/api/settings` | `{ demoSim }` |
| POST | `/api/reset` | reset ke tim demo (matikan dengan `ALLOW_RESET=false`) |
| WS | `/ws` | pesan: `hello`, `task.upserted`, `task.deleted`, `agent.upserted`, `agent.deleted`, `event`, `toast`, `settings`, `reset` |

## Fitur UI

- **Peta desa 3D**: pulau melayang, jalur ubin warna-warni, 12 gedung, kastil, kolam, pohon.
- **Kamera bebas**: drag untuk rotasi, scroll/pinch untuk zoom mengikuti kursor, drag kanan atau
  Shift+drag untuk geser. **🎯 Reset view** kembali ke sudut awal, **🧊 Freeze view** mengunci kamera.
- **Agent hidup**: idle berjalan santai, saat `running` pulang ke gedungnya dengan gelembung task + progress.
- **HUD**: statistik, indikator LIVE/OFFLINE (koneksi WebSocket), pilihan waktu ☀️ ⛅ 🌇 🌙,
  toggle Names/Bubbles, **DEMO SIM** (simulasi di server), reset.
- **Panel**: task board (in progress, review, waiting, done, failed), form task baru, villagers, log.
- `?panel=tasks|agents|add|log` membuka panel saat load.

## Roadmap

- **Fase 2**: worker Claude. Agent menjalankan task sungguhan dengan tool (lapor progress, cari web,
  simpan hasil), event mengalir ke gelembung di desa. Tabel `task_runs` dan kolom `events.run_id` sudah disiapkan.
- **Fase 3**: planner bahasa natural → daftar task, subtask, alur review, artifacts.
- **Fase 4**: auth multi-user, dashboard biaya, task terjadwal, integrasi eksternal.
