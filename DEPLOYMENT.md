# Развертывание Kaiten Integration

## Подготовка

1. Скопируйте `env.example` в `.env.local`:
```bash
cp env.example .env.local
```

2. Заполните переменные окружения в `.env.local`:
```bash
# Kaiten API Configuration
VITE_KAITEN_API_URL=/api/latest
VITE_KAITEN_API_TOKEN=your_actual_kaiten_token

# Supabase Configuration  
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_supabase_key
```

## Вариант 1: Docker Compose (рекомендуется)

1. Соберите проект:
```bash
npm run build
```

2. Настройте переменные окружения:
```bash
export KAITEN_API_TOKEN="your_actual_kaiten_token"
export SUPABASE_ANON_KEY="your_actual_supabase_key"
```

3. Запустите с Docker Compose:
```bash
docker-compose up -d
```

Приложение будет доступно на `http://localhost:8080`

## Вариант 2: Nginx с переменными окружения

1. Соберите проект:
```bash
npm run build
```

2. Скопируйте файлы в папку nginx:
```bash
cp -r dist/* /var/www/kaiten-integra/
cp nginx.conf /etc/nginx/sites-available/kaiten-integra
```

3. Настройте переменные окружения в nginx:
```bash
export KAITEN_API_URL="/api/latest"
export KAITEN_API_TOKEN="your_actual_kaiten_token"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your_actual_supabase_key"
```

4. Перезапустите nginx:
```bash
sudo systemctl reload nginx
```

## Безопасность

- ✅ API ключи НЕ хранятся в коде
- ✅ Конфигурация инжектируется nginx'ом во время запроса
- ✅ Переменные окружения можно задать через Docker secrets
- ✅ Используйте `.env.local` для разработки (не коммитьте в git)
- ✅ Используйте переменные окружения для продакшена
